# ML Plastic Classification Pipeline

This directory contains the complete training pipeline for the KRUX plastic classification model.

## Architecture

**Model:** MobileNetV2 (pretrained on ImageNet) with a custom classification head:
```
GlobalAveragePooling2D → Dropout(0.3) → Dense(128, relu) → Dropout(0.2) → Dense(7, softmax)
```

**Classes:** PET, HDPE, PVC, LDPE, PP, PS, OTHER

## Setup

```bash
cd ml
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Dataset Download

```bash
python data/download_datasets.py
python data/prepare_dataset.py
```

Datasets used:
- [TrashNet](https://github.com/garythung/trashnet) — ~2500 images
- [TACO](http://tacodataset.org/) — ~1500 images
- [Roboflow Plastic Waste](https://universe.roboflow.com) — ~2400 images
- [HuggingFace waste-garbage-management](https://huggingface.co/datasets/rootstrap-org/waste-classifier) — ~20000 images

## Training

```bash
python training/train.py --config training/config.yaml
```

Checkpoints are saved to `models/checkpoints/`.

## Adversarial Training

```bash
python training/adversarial_training.py --config training/config.yaml
```

Mixes FGSM + PGD adversarial examples (30% of each batch).

## Evaluation

```bash
python evaluation/evaluate.py --model models/best_model.h5
python evaluation/adversarial_eval.py --model models/best_model.h5
```

## Export

```bash
# Export to TensorFlow.js (for browser inference)
python export/export_tfjs.py --model models/best_model.h5 --output ../public/models/plastic-classifier

# Export to TFLite (for edge deployment)
python export/export_tflite.py --model models/best_model.h5 --output models/plastic_classifier.tflite
```

After export, the TF.js model files will be at:
```
public/models/plastic-classifier/
├── model.json
├── group1-shard1of1.bin
└── ...
```

These files are **excluded from git** (see `.gitignore`).

## Expected Performance

| Metric              | Target |
|---------------------|--------|
| Clean Accuracy      | ≥ 85%  |
| Adversarial Accuracy| ≥ 70%  |
| Inference time (JS) | < 200ms|

## Configuration

See `training/config.yaml` for all hyperparameters.
