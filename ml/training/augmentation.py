"""
augmentation.py — Advanced augmentation pipeline for KRUX plastic classifier.

Provides Albumentations-based transforms simulating real-world degradation:
  - Camera noise, blur, JPEG artifacts
  - Crumpled / dirty / low-light plastic conditions
  - Elastic deformation for crumple simulation
"""

import albumentations as A
import cv2
import numpy as np
from albumentations.core.transforms_interface import ImageOnlyTransform


class MuddyOverlay(ImageOnlyTransform):
    """Overlay a semi-transparent brown/gray wash to simulate dirty plastic."""

    def __init__(self, alpha_limit: tuple[float, float] = (0.05, 0.25), p: float = 0.5):
        super().__init__(p=p)
        self.alpha_limit = alpha_limit

    def apply(self, img: np.ndarray, **_params: object) -> np.ndarray:
        alpha = np.random.uniform(*self.alpha_limit)
        color = np.random.choice(
            [np.array([101, 67, 33]), np.array([128, 128, 128])]
        )  # brown or gray
        overlay = np.full_like(img, color, dtype=np.float32)
        return np.clip(
            img.astype(np.float32) * (1 - alpha) + overlay * alpha, 0, 255
        ).astype(np.uint8)

    def get_transform_init_args_names(self) -> tuple[str, ...]:
        return ("alpha_limit",)


class LowLightSimulator(ImageOnlyTransform):
    """Darken the image to simulate low-light scanning conditions."""

    def __init__(self, gamma_limit: tuple[float, float] = (1.5, 3.5), p: float = 0.5):
        super().__init__(p=p)
        self.gamma_limit = gamma_limit

    def apply(self, img: np.ndarray, **_params: object) -> np.ndarray:
        gamma = np.random.uniform(*self.gamma_limit)
        inv_gamma = 1.0 / gamma
        table = (np.arange(256) / 255.0) ** inv_gamma * 255
        lut = table.astype(np.uint8)
        return cv2.LUT(img, lut)

    def get_transform_init_args_names(self) -> tuple[str, ...]:
        return ("gamma_limit",)


def build_train_transform(cfg: dict) -> A.Compose:
    """Build the full training augmentation pipeline from config."""
    ac = cfg["augmentation"]
    return A.Compose(
        [
            A.RandomRotate90(p=0.5),
            A.HorizontalFlip(p=0.5),
            A.VerticalFlip(p=0.5),
            A.ShiftScaleRotate(
                shift_limit=0.1,
                scale_limit=0.2,
                rotate_limit=ac["rotation_limit"],
                p=0.7,
            ),
            A.RandomBrightnessContrast(
                brightness_limit=ac["brightness_limit"],
                contrast_limit=ac["contrast_limit"],
                p=0.8,
            ),
            A.HueSaturationValue(
                hue_shift_limit=int(ac["hue_limit"] * 180),
                sat_shift_limit=int(ac["saturation_limit"] * 255),
                val_shift_limit=30,
                p=0.7,
            ),
            A.GaussNoise(
                var_limit=tuple(int(v * 255 ** 2) for v in ac["gaussian_noise_var_limit"]),
                p=0.5,
            ),
            A.GaussianBlur(
                blur_limit=tuple(int(v) for v in ac["gaussian_blur_limit"]),
                p=0.4,
            ),
            A.RandomCrop(
                height=int(224 * ac["random_crop_scale"][0]),
                width=int(224 * ac["random_crop_scale"][0]),
                p=0.5,
            ),
            A.PadIfNeeded(min_height=224, min_width=224, p=1.0),
            A.Resize(224, 224, p=1.0),
            A.CoarseDropout(
                max_holes=ac["cutout_num_holes"],
                max_height=ac["cutout_max_h_size"],
                max_width=ac["cutout_max_w_size"],
                p=0.4,
            ),
            A.ImageCompression(
                quality_lower=ac["jpeg_quality_limit"][0],
                quality_upper=ac["jpeg_quality_limit"][1],
                p=0.4,
            ),
            A.ElasticTransform(
                alpha=ac["elastic_alpha"],
                sigma=ac["elastic_sigma"],
                p=0.3,
            ),
            MuddyOverlay(p=0.3),
            LowLightSimulator(p=0.3),
        ]
    )


def build_val_transform() -> A.Compose:
    """Minimal validation transform (resize only)."""
    return A.Compose([A.Resize(224, 224, p=1.0)])
