"""
evaluate.py — Accuracy, confusion matrix, and per-class metrics for the
KRUX plastic classifier.

Usage:
    python evaluation/evaluate.py --model models/best_model.h5 --config training/config.yaml
"""

import argparse
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import yaml
from sklearn.metrics import classification_report, confusion_matrix


def load_config(path: str) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


def evaluate(cfg: dict, model_path: str, split: str = "test") -> None:
    import tensorflow as tf
    from tensorflow import keras

    mc = cfg["model"]
    size = mc["input_size"]
    classes: list[str] = mc["classes"]

    data_dir = cfg["data"].get(f"{split}_dir", cfg["data"]["val_dir"])

    test_ds = keras.utils.image_dataset_from_directory(
        data_dir,
        image_size=(size, size),
        batch_size=32,
        label_mode="categorical",
        shuffle=False,
    )

    model = keras.models.load_model(model_path)

    print(f"Evaluating on {split} set ({data_dir})...")
    loss, acc = model.evaluate(test_ds, verbose=1)
    print(f"\nTest loss: {loss:.4f}  |  Test accuracy: {acc:.4f}")

    # Gather predictions for classification report
    y_true: list[int] = []
    y_pred: list[int] = []

    for images, labels in test_ds:
        preds = model.predict(images, verbose=0)
        y_true.extend(np.argmax(labels.numpy(), axis=1).tolist())
        y_pred.extend(np.argmax(preds, axis=1).tolist())

    print("\nPer-class metrics:")
    print(classification_report(y_true, y_pred, target_names=classes))

    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(8, 7))
    im = ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(classes)))
    ax.set_yticks(range(len(classes)))
    ax.set_xticklabels(classes, rotation=45, ha="right")
    ax.set_yticklabels(classes)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("True")
    ax.set_title("Confusion Matrix")
    plt.colorbar(im)
    for i in range(len(classes)):
        for j in range(len(classes)):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center", fontsize=9)
    plt.tight_layout()
    out_path = Path(model_path).parent / "confusion_matrix.png"
    fig.savefig(out_path, dpi=150)
    print(f"\nConfusion matrix saved to {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate KRUX plastic classifier")
    parser.add_argument("--model", required=True, help="Path to .h5 model")
    parser.add_argument("--config", default="training/config.yaml")
    parser.add_argument("--split", default="test", choices=["train", "val", "test"])
    args = parser.parse_args()

    cfg = load_config(args.config)
    evaluate(cfg, args.model, split=args.split)


if __name__ == "__main__":
    main()
