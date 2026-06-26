"""
prepare_dataset.py — Merge, clean, and relabel all raw datasets into
7 KRUX plastic classes: PET, HDPE, PVC, LDPE, PP, PS, OTHER.

Produces an ImageFolder-compatible structure at data/processed/:
    data/processed/
    ├── train/  {PET, HDPE, PVC, LDPE, PP, PS, OTHER}/
    ├── val/
    └── test/

Usage:
    python data/prepare_dataset.py [--input data/raw] [--output data/processed]
"""

import argparse
import random
import shutil
from pathlib import Path

from PIL import Image, UnidentifiedImageError
from tqdm import tqdm

# ── Label mappings from source datasets → KRUX classes ───────────────────────

TRASHNET_MAP = {
    "plastic": "PET",   # TrashNet's plastic ≈ PET bottles
    "glass": "OTHER",
    "paper": "OTHER",
    "cardboard": "OTHER",
    "metal": "OTHER",
    "trash": "OTHER",
}

HUGGINGFACE_MAP = {
    # Adjust to match the actual label strings in the HF dataset
    "bottle": "PET",
    "can": "OTHER",
    "cardboard": "OTHER",
    "glass": "OTHER",
    "paper": "OTHER",
    "plastic": "PET",
    "trash": "OTHER",
}

CLASSES = ["PET", "HDPE", "PVC", "LDPE", "PP", "PS", "OTHER"]
SPLITS = {"train": 0.70, "val": 0.15, "test": 0.15}
IMAGE_SIZE = (224, 224)
MIN_IMAGES_PER_CLASS = 100


def is_valid_image(path: Path) -> bool:
    try:
        with Image.open(path) as img:
            img.verify()
        return True
    except (UnidentifiedImageError, OSError):
        return False


def collect_images(raw_dir: Path) -> dict[str, list[Path]]:
    """Collect all images from raw datasets, organised by KRUX class."""
    class_images: dict[str, list[Path]] = {c: [] for c in CLASSES}

    # TrashNet
    trashnet_dir = raw_dir / "trashnet" / "dataset-resized"
    if trashnet_dir.exists():
        for label_dir in trashnet_dir.iterdir():
            krux_class = TRASHNET_MAP.get(label_dir.name.lower(), "OTHER")
            for img_path in label_dir.glob("*.jpg"):
                if is_valid_image(img_path):
                    class_images[krux_class].append(img_path)
        print(f"  TrashNet: loaded {sum(len(v) for v in class_images.values())} images")

    # HuggingFace
    hf_dir = raw_dir / "huggingface"
    if hf_dir.exists():
        before = sum(len(v) for v in class_images.values())
        for split_dir in hf_dir.iterdir():
            for label_dir in split_dir.iterdir():
                krux_class = HUGGINGFACE_MAP.get(label_dir.name.lower(), "OTHER")
                for img_path in label_dir.glob("*.jpg"):
                    if is_valid_image(img_path):
                        class_images[krux_class].append(img_path)
        after = sum(len(v) for v in class_images.values())
        print(f"  HuggingFace: added {after - before} images")

    # Roboflow (ImageFolder structure expected)
    rf_dir = raw_dir / "roboflow"
    if rf_dir.exists():
        before = sum(len(v) for v in class_images.values())
        for label_dir in rf_dir.rglob("*/"):
            krux_class = label_dir.name.upper()
            if krux_class in CLASSES:
                for img_path in label_dir.glob("*.jpg"):
                    if is_valid_image(img_path):
                        class_images[krux_class].append(img_path)
        after = sum(len(v) for v in class_images.values())
        print(f"  Roboflow: added {after - before} images")

    return class_images


def split_and_copy(
    class_images: dict[str, list[Path]],
    output_dir: Path,
) -> None:
    """Stratified train/val/test split and copy."""
    output_dir.mkdir(parents=True, exist_ok=True)

    for krux_class, images in class_images.items():
        if len(images) < MIN_IMAGES_PER_CLASS:
            print(f"  ⚠ {krux_class}: only {len(images)} images — consider adding more data")

        random.shuffle(images)
        n = len(images)
        n_train = int(n * SPLITS["train"])
        n_val = int(n * SPLITS["val"])

        splits = {
            "train": images[:n_train],
            "val": images[n_train : n_train + n_val],
            "test": images[n_train + n_val :],
        }

        for split_name, split_images in splits.items():
            dest_dir = output_dir / split_name / krux_class
            dest_dir.mkdir(parents=True, exist_ok=True)
            for i, src in enumerate(tqdm(split_images, desc=f"  {split_name}/{krux_class}", leave=False)):
                dest = dest_dir / f"{i:06d}.jpg"
                try:
                    with Image.open(src) as img:
                        img = img.convert("RGB").resize(IMAGE_SIZE, Image.LANCZOS)
                        img.save(dest, "JPEG", quality=90)
                except Exception:
                    shutil.copy(src, dest)

        print(f"  {krux_class}: {n_train} train / {n_val} val / {n - n_train - n_val} test")


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare KRUX training dataset")
    parser.add_argument("--input", default="data/raw", help="Raw data directory")
    parser.add_argument("--output", default="data/processed", help="Output directory")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    random.seed(args.seed)

    raw_dir = Path(args.input)
    output_dir = Path(args.output)

    print("Collecting images from all datasets...")
    class_images = collect_images(raw_dir)

    total = sum(len(v) for v in class_images.values())
    print(f"\nTotal images collected: {total}")
    for cls, imgs in class_images.items():
        print(f"  {cls}: {len(imgs)}")

    print("\nCreating stratified splits...")
    split_and_copy(class_images, output_dir)

    print(f"\n✓ Dataset prepared at {output_dir}")
    print("  Run: python training/train.py --config training/config.yaml")


if __name__ == "__main__":
    main()
