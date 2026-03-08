/**
 * TensorFlow.js model loader for the plastic classification model.
 *
 * The model is trained with the pipeline in ml/ and exported to
 * public/models/plastic-classifier/model.json (+ weight shards).
 *
 * If the model files are not present, inference gracefully falls back
 * to the heuristic classifier.
 */

import * as tf from '@tensorflow/tfjs';

export type PlasticType = 'PET' | 'HDPE' | 'PVC' | 'LDPE' | 'PP' | 'PS' | 'OTHER';

export const PLASTIC_CLASSES: PlasticType[] = [
  'PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS', 'OTHER',
];

const MODEL_PATH = '/models/plastic-classifier/model.json';
const INPUT_SIZE = 224; // MobileNetV2 input size

export interface MLModelResult {
  type: PlasticType;
  confidence: number;
  allScores: Record<PlasticType, number>;
}

// ── Singleton model cache ─────────────────────────────────────────────────────

let modelCache: tf.GraphModel | tf.LayersModel | null = null;
let modelLoadError: string | null = null;
let loadingPromise: Promise<tf.GraphModel | tf.LayersModel | null> | null = null;

export type ModelLoadState = 'idle' | 'loading' | 'ready' | 'error';

let loadState: ModelLoadState = 'idle';

export function getModelLoadState(): ModelLoadState {
  return loadState;
}

export function getModelLoadError(): string | null {
  return modelLoadError;
}

/**
 * Load (or return cached) TF.js model.
 * Resolves to null if the model files are not found.
 */
export async function loadModel(
  onProgress?: (pct: number) => void,
): Promise<tf.GraphModel | tf.LayersModel | null> {
  if (modelCache) return modelCache;
  if (loadingPromise) return loadingPromise;

  loadState = 'loading';

  loadingPromise = (async () => {
    try {
      onProgress?.(0);

      const model = await tf.loadLayersModel(MODEL_PATH, {
        onProgress: (fraction) => {
          onProgress?.(Math.round(fraction * 100));
        },
      });

      modelCache = model;
      loadState = 'ready';
      onProgress?.(100);
      return model;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error loading model';

      // Model files not found is expected in dev — fall back silently.
      if (message.includes('404') || message.includes('Failed to fetch')) {
        modelLoadError =
          'Model not loaded — run the training pipeline first (see ml/README.md)';
      } else {
        modelLoadError = message;
      }

      loadState = 'error';
      return null;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

/**
 * Preprocess an HTMLImageElement / HTMLCanvasElement / ImageData into the
 * 4-D tensor expected by MobileNetV2: [1, 224, 224, 3], values in [-1, 1].
 */
export function preprocessImage(
  source: HTMLImageElement | HTMLCanvasElement | ImageData,
): tf.Tensor4D {
  return tf.tidy(() => {
    // fromPixels accepts HTMLImageElement, HTMLCanvasElement, ImageData
    const img = tf.browser.fromPixels(source);

    // Resize to INPUT_SIZE × INPUT_SIZE
    const resized = tf.image.resizeBilinear(img, [INPUT_SIZE, INPUT_SIZE]);

    // Normalise from [0, 255] → [-1, 1]  (MobileNetV2 preprocessing)
    const normalised = resized.toFloat().div(127.5).sub(1);

    // Add batch dimension: [224, 224, 3] → [1, 224, 224, 3]
    return normalised.expandDims(0) as tf.Tensor4D;
  });
}

/**
 * Run inference on a pre-processed 4-D tensor.
 * Returns class probabilities as a plain JS array.
 */
async function runInference(
  model: tf.GraphModel | tf.LayersModel,
  input: tf.Tensor4D,
): Promise<number[]> {
  const outputTensor = model.predict(input) as tf.Tensor;
  const probabilities = await outputTensor.data();
  outputTensor.dispose();
  return Array.from(probabilities);
}

/**
 * End-to-end classify function.
 *
 * @param source - An image element, canvas, or raw ImageData.
 * @param onProgress - Optional callback for model load progress.
 * @returns MLModelResult with type, confidence, and all class scores.
 *          If the model is unavailable, returns null.
 */
export async function classifyWithModel(
  source: HTMLImageElement | HTMLCanvasElement | ImageData,
  onProgress?: (pct: number) => void,
): Promise<MLModelResult | null> {
  const model = await loadModel(onProgress);
  if (!model) return null;

  const input = preprocessImage(source);
  const probs = await runInference(model, input);
  input.dispose();

  // Map raw probabilities to named classes
  const allScores: Record<PlasticType, number> = {} as Record<PlasticType, number>;
  let maxIdx = 0;
  let maxProb = 0;

  probs.forEach((p, i) => {
    allScores[PLASTIC_CLASSES[i]] = Math.round(p * 1000) / 1000;
    if (p > maxProb) {
      maxProb = p;
      maxIdx = i;
    }
  });

  return {
    type: PLASTIC_CLASSES[maxIdx],
    confidence: Math.round(maxProb * 1000) / 1000,
    allScores,
  };
}
