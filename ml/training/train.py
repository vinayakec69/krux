"""
train.py — Main training script for KRUX plastic classifier.

Trains MobileNetV2 with a custom head on the prepared dataset.

Usage:
    python training/train.py --config training/config.yaml
"""

import argparse
import os
from pathlib import Path

import numpy as np
import yaml


def load_config(path: str) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


def build_model(cfg: dict):
    import tensorflow as tf
    from tensorflow import keras

    mc = cfg["model"]
    input_shape = (mc["input_size"], mc["input_size"], 3)

    base = keras.applications.MobileNetV2(
        input_shape=input_shape,
        include_top=False,
        weights="imagenet",
    )
    base.trainable = False  # Freeze initially

    inputs = keras.Input(shape=input_shape)
    x = keras.applications.mobilenet_v2.preprocess_input(inputs)
    x = base(x, training=False)
    x = keras.layers.GlobalAveragePooling2D()(x)
    x = keras.layers.Dropout(mc["dropout_1"])(x)
    x = keras.layers.Dense(mc["dense_units"], activation="relu")(x)
    x = keras.layers.Dropout(mc["dropout_2"])(x)
    outputs = keras.layers.Dense(mc["num_classes"], activation="softmax")(x)

    return keras.Model(inputs, outputs), base


def build_data_loaders(cfg: dict):
    import tensorflow as tf
    from tensorflow import keras

    tc = cfg["training"]
    ac = cfg["augmentation"]
    mc = cfg["model"]
    size = mc["input_size"]
    batch = tc["batch_size"]

    aug = keras.Sequential([
        keras.layers.RandomFlip("horizontal_and_vertical"),
        keras.layers.RandomRotation(ac["rotation_limit"] / 360.0),
        keras.layers.RandomBrightness(ac["brightness_limit"]),
        keras.layers.RandomContrast(ac["contrast_limit"]),
        keras.layers.RandomZoom((-0.2, 0.0)),
    ], name="augmentation")

    train_ds = keras.utils.image_dataset_from_directory(
        cfg["data"]["train_dir"],
        image_size=(size, size),
        batch_size=batch,
        label_mode="categorical",
        seed=tc["seed"],
    ).map(lambda x, y: (aug(x, training=True), y), num_parallel_calls=tf.data.AUTOTUNE)
    train_ds = train_ds.prefetch(tf.data.AUTOTUNE)

    val_ds = keras.utils.image_dataset_from_directory(
        cfg["data"]["val_dir"],
        image_size=(size, size),
        batch_size=batch,
        label_mode="categorical",
        shuffle=False,
    ).prefetch(tf.data.AUTOTUNE)

    return train_ds, val_ds


def train(cfg: dict) -> None:
    import tensorflow as tf
    from tensorflow import keras

    tc = cfg["training"]
    mc = cfg["model"]
    oc = cfg["output"]

    tf.random.set_seed(tc["seed"])
    np.random.seed(tc["seed"])

    # Mixed precision
    if tc.get("mixed_precision"):
        keras.mixed_precision.set_global_policy("mixed_float16")

    model, base_model = build_model(cfg)
    train_ds, val_ds = build_data_loaders(cfg)

    Path(oc["checkpoint_dir"]).mkdir(parents=True, exist_ok=True)
    Path(oc["logs_dir"]).mkdir(parents=True, exist_ok=True)

    callbacks = [
        keras.callbacks.ModelCheckpoint(
            oc["best_model"],
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=tc["early_stopping_patience"],
            restore_best_weights=True,
        ),
        keras.callbacks.TensorBoard(log_dir=oc["logs_dir"]),
        keras.callbacks.CosineDecayRestarts(
            initial_learning_rate=tc["learning_rate"],
            first_decay_steps=len(train_ds) * 10,
        ) if tc["lr_schedule"] == "cosine_annealing" else keras.callbacks.ReduceLROnPlateau(),
    ]

    # Phase 1: train head only
    model.compile(
        optimizer=keras.optimizers.Adam(tc["learning_rate"]),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    print(f"Phase 1: training head for {mc['freeze_base_epochs']} epochs...")
    model.fit(train_ds, validation_data=val_ds, epochs=mc["freeze_base_epochs"], callbacks=callbacks)

    # Phase 2: fine-tune from layer mc["fine_tune_at_layer"]
    base_model.trainable = True
    for layer in base_model.layers[: mc["fine_tune_at_layer"]]:
        layer.trainable = False

    model.compile(
        optimizer=keras.optimizers.Adam(tc["learning_rate"] / 10),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    print(f"Phase 2: fine-tuning from layer {mc['fine_tune_at_layer']}...")
    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=tc["epochs"],
        initial_epoch=mc["freeze_base_epochs"],
        callbacks=callbacks,
    )

    print(f"\n✓ Training complete. Best model saved to {oc['best_model']}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train KRUX plastic classifier")
    parser.add_argument("--config", default="training/config.yaml")
    args = parser.parse_args()
    cfg = load_config(args.config)
    train(cfg)


if __name__ == "__main__":
    main()
