/**
 * Plastic Classification Service
 *
 * Orchestrates: image capture → TF.js inference (or heuristic fallback)
 * → result formatting → optional server-side double-validation.
 */

import {
  classifyWithModel,
  type PlasticType,
  type MLModelResult,
  getModelLoadState,
} from '@/lib/mlModel';
import { classifyPlastic } from '@/utils/plasticClassifier';
import { perceptualHash, colorHistogram } from '@/utils/security';

export const CONFIDENCE_THRESHOLD = 0.4; // 40 %

export interface ClassificationServiceResult {
  type: PlasticType;
  confidence: number;
  allScores: Record<PlasticType, number>;
  /** True when the heuristic fallback was used (TF.js model not loaded). */
  usedFallback: boolean;
  /** Perceptual hash of the image (for duplicate detection). */
  perceptualHashHex: string;
  /** Compact color histogram string (for server-side fraud check). */
  colorHistogramStr: string;
}

/**
 * Classify plastic from a canvas element.
 *
 * 1. Tries the TF.js model (MobileNetV2).
 * 2. Falls back to the heuristic classifier if the model is unavailable.
 * 3. Returns "OTHER" with a low confidence when below threshold.
 */
export async function classifyFromCanvas(
  canvas: HTMLCanvasElement,
  onModelProgress?: (pct: number) => void,
): Promise<ClassificationServiceResult> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2D context from canvas');

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Compute fraud-detection metadata eagerly (cheap, synchronous)
  const perceptualHashHex = perceptualHash(imageData);
  const colorHistogramStr = colorHistogram(imageData);

  // ── TF.js inference ───────────────────────────────────────────────────────
  let modelResult: MLModelResult | null = null;

  if (getModelLoadState() !== 'error') {
    try {
      modelResult = await classifyWithModel(canvas, onModelProgress);
    } catch {
      // Swallow — fall through to heuristic
    }
  }

  if (modelResult) {
    const { type, confidence, allScores } = modelResult;

    // Below threshold → return UNKNOWN signal as OTHER
    const effectiveType: PlasticType =
      confidence < CONFIDENCE_THRESHOLD ? 'OTHER' : type;
    const effectiveConf = confidence;

    return {
      type: effectiveType,
      confidence: effectiveConf,
      allScores,
      usedFallback: false,
      perceptualHashHex,
      colorHistogramStr,
    };
  }

  // ── Heuristic fallback ────────────────────────────────────────────────────
  const heuristic = classifyPlastic(imageData);
  const conf = heuristic.confidence / 100; // normalise to [0, 1]

  // Build synthetic allScores for UI consistency
  const allScores: Record<PlasticType, number> = {
    PET: 0, HDPE: 0, PVC: 0, LDPE: 0, PP: 0, PS: 0, OTHER: 0,
  };
  allScores[heuristic.plasticType as PlasticType] = conf;

  return {
    type: heuristic.plasticType as PlasticType,
    confidence: conf,
    allScores,
    usedFallback: true,
    perceptualHashHex,
    colorHistogramStr,
  };
}
