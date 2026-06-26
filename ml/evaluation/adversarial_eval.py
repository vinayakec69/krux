"""
adversarial_eval.py — Robustness evaluation against adversarial examples.

Reports clean accuracy and adversarial accuracy at multiple ε values.

Usage:
    python evaluation/adversarial_eval.py \
        --model models/best_model.h5 \
        --config training/config.yaml
"""

import argparse

import numpy as np
import yaml


def load_config(path: str) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


def adversarial_eval(cfg: dict, model_path: str) -> None:
    import tensorflow as tf
    from tensorflow import keras

    mc = cfg["model"]
    ec = cfg["evaluation"]
    size = mc["input_size"]
    eps_list: list[float] = ec.get("adv_eval_eps", [0.01, 0.02, 0.03])

    test_ds = keras.utils.image_dataset_from_directory(
        cfg["data"].get("test_dir", cfg["data"]["val_dir"]),
        image_size=(size, size),
        batch_size=32,
        label_mode="categorical",
        shuffle=False,
    )

    # Normalise to [-1, 1]
    test_ds = test_ds.map(
        lambda x, y: (x / 127.5 - 1.0, y), num_parallel_calls=tf.data.AUTOTUNE
    ).prefetch(tf.data.AUTOTUNE)

    model = keras.models.load_model(model_path)
    loss_fn = keras.losses.CategoricalCrossentropy()

    def pgd_attack(images: tf.Tensor, labels: tf.Tensor, eps: float) -> tf.Tensor:
        step_size = eps / 4
        adv = tf.identity(images)
        for _ in range(7):
            with tf.GradientTape() as tape:
                tape.watch(adv)
                preds = model(adv, training=False)
                loss = loss_fn(labels, preds)
            grads = tape.gradient(loss, adv)
            adv = adv + step_size * tf.sign(grads)
            adv = tf.clip_by_value(adv, images - eps, images + eps)
            adv = tf.clip_by_value(adv, -1.0, 1.0)
        return adv

    # Clean accuracy
    clean_correct = 0
    total = 0
    for images, labels in test_ds:
        preds = model(images, training=False)
        correct = tf.reduce_sum(
            tf.cast(
                tf.equal(tf.argmax(preds, axis=1), tf.argmax(labels, axis=1)), tf.int32
            )
        ).numpy()
        clean_correct += int(correct)
        total += images.shape[0]

    clean_acc = clean_correct / max(total, 1)
    print(f"\nClean accuracy:            {clean_acc:.4f}  ({clean_correct}/{total})")

    # Adversarial accuracy at each ε
    for eps in eps_list:
        adv_correct = 0
        adv_total = 0
        for images, labels in test_ds:
            adv_images = pgd_attack(images, labels, eps)
            preds = model(adv_images, training=False)
            correct = tf.reduce_sum(
                tf.cast(
                    tf.equal(tf.argmax(preds, axis=1), tf.argmax(labels, axis=1)),
                    tf.int32,
                )
            ).numpy()
            adv_correct += int(correct)
            adv_total += images.shape[0]

        adv_acc = adv_correct / max(adv_total, 1)
        drop = (clean_acc - adv_acc) * 100
        print(
            f"PGD(ε={eps:.2f}) accuracy:  {adv_acc:.4f}  "
            f"(drop: {drop:.1f}%)  [{adv_correct}/{adv_total}]"
        )

    print(
        "\n✓ Evaluation complete. Target: clean ≥ 85 %, adversarial (ε=0.02) ≥ 70 %"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Adversarial robustness evaluation")
    parser.add_argument("--model", required=True, help="Path to .h5 model")
    parser.add_argument("--config", default="training/config.yaml")
    args = parser.parse_args()
    cfg = load_config(args.config)
    adversarial_eval(cfg, args.model)


if __name__ == "__main__":
    main()
