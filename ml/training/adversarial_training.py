"""
adversarial_training.py — FGSM + PGD adversarial training for KRUX classifier.

Mixes adversarial examples (30 % by default) into each training batch to
improve robustness against deliberately crafted inputs.

Usage:
    python training/adversarial_training.py --config training/config.yaml
"""

import argparse
from pathlib import Path

import numpy as np
import yaml


def load_config(path: str) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


def fgsm_attack(
    model,
    images,
    labels,
    eps: float,
    loss_fn,
):
    """Fast Gradient Sign Method (FGSM) adversarial example generation."""
    import tensorflow as tf

    with tf.GradientTape() as tape:
        tape.watch(images)
        predictions = model(images, training=False)
        loss = loss_fn(labels, predictions)

    gradients = tape.gradient(loss, images)
    signed_grad = tf.sign(gradients)
    return tf.clip_by_value(images + eps * signed_grad, -1.0, 1.0)


def pgd_attack(
    model,
    images,
    labels,
    eps: float,
    step_size: float,
    num_steps: int,
    loss_fn,
):
    """Projected Gradient Descent (PGD) adversarial example generation."""
    import tensorflow as tf

    adv = tf.identity(images)
    for _ in range(num_steps):
        with tf.GradientTape() as tape:
            tape.watch(adv)
            predictions = model(adv, training=False)
            loss = loss_fn(labels, predictions)
        gradients = tape.gradient(loss, adv)
        adv = adv + step_size * tf.sign(gradients)
        # Project back into ε-ball around original images
        adv = tf.clip_by_value(adv, images - eps, images + eps)
        adv = tf.clip_by_value(adv, -1.0, 1.0)
    return adv


def train_adversarial(cfg: dict) -> None:
    import tensorflow as tf
    from tensorflow import keras

    tc = cfg["training"]
    ac_cfg = cfg["adversarial"]
    mc = cfg["model"]
    oc = cfg["output"]

    tf.random.set_seed(tc["seed"])
    np.random.seed(tc["seed"])

    if tc.get("mixed_precision"):
        keras.mixed_precision.set_global_policy("mixed_float16")

    size = mc["input_size"]
    batch_size = tc["batch_size"]

    # Load dataset
    train_ds = keras.utils.image_dataset_from_directory(
        cfg["data"]["train_dir"],
        image_size=(size, size),
        batch_size=batch_size,
        label_mode="categorical",
        seed=tc["seed"],
    )
    val_ds = keras.utils.image_dataset_from_directory(
        cfg["data"]["val_dir"],
        image_size=(size, size),
        batch_size=batch_size,
        label_mode="categorical",
        shuffle=False,
    )

    # Normalise to [-1, 1]
    def normalise(x: tf.Tensor, y: tf.Tensor) -> tuple[tf.Tensor, tf.Tensor]:
        return x / 127.5 - 1.0, y

    train_ds = train_ds.map(normalise, num_parallel_calls=tf.data.AUTOTUNE).prefetch(
        tf.data.AUTOTUNE
    )
    val_ds = val_ds.map(normalise, num_parallel_calls=tf.data.AUTOTUNE).prefetch(
        tf.data.AUTOTUNE
    )

    # Load base model
    best_model_path = oc["best_model"]
    if not Path(best_model_path).exists():
        raise FileNotFoundError(
            f"Base model not found at {best_model_path}. Run train.py first."
        )
    model = keras.models.load_model(best_model_path)
    model.compile(
        optimizer=keras.optimizers.Adam(tc["learning_rate"] / 10),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    loss_fn = keras.losses.CategoricalCrossentropy()
    adv_frac: float = ac_cfg["adv_fraction"]

    Path(oc["checkpoint_dir"]).mkdir(parents=True, exist_ok=True)
    adv_model_path = str(Path(oc["checkpoint_dir"]) / "best_adv_model.h5")

    callbacks = [
        keras.callbacks.ModelCheckpoint(
            adv_model_path,
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=tc["early_stopping_patience"],
            restore_best_weights=True,
        ),
    ]

    @tf.function
    def train_step(images: tf.Tensor, labels: tf.Tensor) -> dict:
        batch_size_actual = tf.shape(images)[0]
        adv_count = tf.cast(
            tf.cast(batch_size_actual, tf.float32) * adv_frac, tf.int32
        )

        clean_imgs = images[adv_count:]
        adv_images_raw = images[:adv_count]
        adv_labels = labels[:adv_count]

        # Mix 50 % FGSM and 50 % PGD
        half = adv_count // 2
        fgsm_imgs = fgsm_attack(
            model, adv_images_raw[:half], adv_labels[:half], ac_cfg["fgsm_eps"], loss_fn
        )
        pgd_imgs = pgd_attack(
            model,
            adv_images_raw[half:],
            adv_labels[half:],
            ac_cfg["pgd_eps"],
            ac_cfg["pgd_step_size"],
            ac_cfg["pgd_steps"],
            loss_fn,
        )
        combined = tf.concat([clean_imgs, fgsm_imgs, pgd_imgs], axis=0)
        combined_labels = tf.concat([labels[adv_count:], adv_labels[:half], adv_labels[half:]], axis=0)

        with tf.GradientTape() as tape:
            preds = model(combined, training=True)
            loss = loss_fn(combined_labels, preds)

        grads = tape.gradient(loss, model.trainable_variables)
        model.optimizer.apply_gradients(zip(grads, model.trainable_variables))
        return {"loss": loss}

    epochs = tc["epochs"] - mc["freeze_base_epochs"]
    print(f"Adversarial training for {epochs} epochs (adv_frac={adv_frac})...")

    best_val_acc = 0.0
    patience_counter = 0

    for epoch in range(epochs):
        print(f"\nEpoch {epoch + 1}/{epochs}")
        for images, labels in train_ds:
            train_step(images, labels)

        val_loss, val_acc = model.evaluate(val_ds, verbose=0)
        print(f"  val_accuracy={val_acc:.4f}  val_loss={val_loss:.4f}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            model.save(adv_model_path)
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= tc["early_stopping_patience"]:
                print("Early stopping triggered.")
                break

    print(f"\n✓ Adversarial training complete. Best model: {adv_model_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Adversarial training for KRUX classifier")
    parser.add_argument("--config", default="training/config.yaml")
    args = parser.parse_args()
    cfg = load_config(args.config)
    train_adversarial(cfg)


if __name__ == "__main__":
    main()
