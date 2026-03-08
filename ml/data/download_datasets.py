"""
download_datasets.py — Download all training datasets for KRUX plastic classifier.

Usage:
    python data/download_datasets.py [--output data/raw]
"""

import argparse
import os
import zipfile
from pathlib import Path

import requests
from tqdm import tqdm


def download_file(url: str, dest: Path) -> None:
    """Download a file with a progress bar."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    response = requests.get(url, stream=True, timeout=60)
    response.raise_for_status()
    total = int(response.headers.get("content-length", 0))
    with open(dest, "wb") as f, tqdm(total=total, unit="B", unit_scale=True) as pbar:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
            pbar.update(len(chunk))


def download_trashnet(output_dir: Path) -> None:
    """Download TrashNet dataset (Gary Thung)."""
    print("\n[1/4] Downloading TrashNet...")
    url = "https://github.com/garythung/trashnet/raw/master/data/dataset-resized.zip"
    dest = output_dir / "trashnet.zip"
    if not dest.exists():
        download_file(url, dest)
    with zipfile.ZipFile(dest, "r") as z:
        z.extractall(output_dir / "trashnet")
    print("  ✓ TrashNet extracted.")


def download_taco(output_dir: Path) -> None:
    """Download TACO dataset metadata (images are downloaded separately via COCO API)."""
    print("\n[2/4] Downloading TACO annotations...")
    url = "https://raw.githubusercontent.com/pedropro/TACO/master/data/annotations.json"
    dest = output_dir / "taco" / "annotations.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        download_file(url, dest)
    print("  ✓ TACO annotations saved (run TACO's downloader for images).")


def download_huggingface(output_dir: Path) -> None:
    """Download waste-garbage-management dataset from HuggingFace."""
    print("\n[3/4] Downloading HuggingFace waste dataset...")
    try:
        from datasets import load_dataset  # type: ignore[import]
        ds = load_dataset("rootstrap-org/waste-classifier", cache_dir=str(output_dir / "hf_cache"))
        # Save as ImageFolder-compatible structure
        save_dir = output_dir / "huggingface"
        for split in ds:
            for i, example in enumerate(tqdm(ds[split], desc=f"  {split}")):
                label = str(example.get("label", "unknown"))
                img_dir = save_dir / split / label
                img_dir.mkdir(parents=True, exist_ok=True)
                example["image"].save(img_dir / f"{i:06d}.jpg")
        print("  ✓ HuggingFace dataset saved.")
    except Exception as e:
        print(f"  ⚠ HuggingFace download failed: {e}")
        print("    Install with: pip install datasets")


def download_roboflow(output_dir: Path) -> None:
    """Download Roboflow plastic waste dataset."""
    print("\n[4/4] Roboflow dataset...")
    print("  ⚠ Roboflow requires an API key. Set ROBOFLOW_API_KEY env var.")
    api_key = os.environ.get("ROBOFLOW_API_KEY")
    if not api_key:
        print("  Skipping Roboflow download (no API key).")
        return
    try:
        from roboflow import Roboflow  # type: ignore[import]
        rf = Roboflow(api_key=api_key)
        project = rf.workspace().project("plastic-waste-detection")
        dataset = project.version(1).download("folder", location=str(output_dir / "roboflow"))
        print(f"  ✓ Roboflow dataset downloaded to {dataset.location}")
    except Exception as e:
        print(f"  ⚠ Roboflow download failed: {e}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Download KRUX training datasets")
    parser.add_argument("--output", default="data/raw", help="Output directory")
    args = parser.parse_args()

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    download_trashnet(output_dir)
    download_taco(output_dir)
    download_huggingface(output_dir)
    download_roboflow(output_dir)

    print("\n✓ All downloads complete. Run prepare_dataset.py next.")


if __name__ == "__main__":
    main()
