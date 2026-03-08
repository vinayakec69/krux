"""
export_tfjs.py — Export trained Keras model to TensorFlow.js format.

Usage:
    python export/export_tfjs.py \
        --model models/best_model.h5 \
        --output ../public/models/plastic-classifier
"""

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Export model to TF.js")
    parser.add_argument("--model", required=True, help="Path to Keras .h5 model")
    parser.add_argument(
        "--output",
        default="../public/models/plastic-classifier",
        help="Output directory",
    )
    parser.add_argument(
        "--quantize",
        action="store_true",
        help="Apply uint8 quantization to reduce model size",
    )
    args = parser.parse_args()

    import tensorflowjs as tfjs  # type: ignore[import]

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    quantization = "uint8" if args.quantize else None

    print(f"Exporting {args.model} → {output_dir} (quantize={quantization})...")
    tfjs.converters.save_keras_model(
        __import__("tensorflow").keras.models.load_model(args.model),
        str(output_dir),
        quantization_dtype_map={"*": quantization} if quantization else None,
    )
    print(f"✓ TF.js model written to {output_dir}")
    print("  Files: model.json + weight shards (.bin)")
    print(f"\n  Use in the app: /models/plastic-classifier/model.json")


if __name__ == "__main__":
    main()
