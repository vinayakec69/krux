"""
export_tflite.py — Export trained Keras model to TFLite format for edge deployment.

Usage:
    python export/export_tflite.py \
        --model models/best_model.h5 \
        --output models/plastic_classifier.tflite
"""

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Export model to TFLite")
    parser.add_argument("--model", required=True, help="Path to Keras .h5 model")
    parser.add_argument(
        "--output",
        default="models/plastic_classifier.tflite",
        help="Output .tflite file",
    )
    parser.add_argument(
        "--quantize",
        choices=["none", "dynamic", "float16"],
        default="dynamic",
        help="Quantization strategy",
    )
    args = parser.parse_args()

    import tensorflow as tf

    print(f"Loading {args.model}...")
    model = tf.keras.models.load_model(args.model)

    converter = tf.lite.TFLiteConverter.from_keras_model(model)

    if args.quantize == "dynamic":
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
    elif args.quantize == "float16":
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_types = [tf.float16]

    print(f"Converting (quantize={args.quantize})...")
    tflite_model = converter.convert()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(tflite_model)

    size_mb = output_path.stat().st_size / 1_048_576
    print(f"✓ TFLite model saved to {output_path} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
