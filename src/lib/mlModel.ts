/**
 * ONNX Runtime Web model loader for the KRUX custom YOLOv8n-cls model.
 *
 * The model was trained in D:\the-CV-model and exported to ONNX format.
 * It runs entirely in the browser using ONNX Runtime Web (WebAssembly backend).
 * No TensorFlow or server-side inference needed.
 *
 * Model input:  Float32 tensor [1, 3, 320, 320]  (BCHW, values in [0, 1])
 * Model output: Float32 tensor [1, 9]             (9 class probabilities)
 *
 * YOLO class order (alphabetical folder names):
 *   0: HDPE_A  1: HDPE_B  2: LDPE_A  3: LDPE_B
 *   4: MISC_A  5: PET_A   6: PET_B   7: PP_A   8: PP_B
 *
 * A and B variants are merged → standard app types: HDPE, LDPE, PET, PP, OTHER
 */

import * as ort from 'onnxruntime-web';

export type PlasticType = 'PET' | 'HDPE' | 'PVC' | 'LDPE' | 'PP' | 'PS' | 'OTHER';

export const PLASTIC_CLASSES: PlasticType[] = [
  'PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS', 'OTHER',
];

const MODEL_PATH = '/models/plastic-classifier/model.onnx';
const INPUT_SIZE = 320; // Must match training imgsz

/**
 * YOLOv8 output class order (alphabetical, as YOLO reads dataset folders).
 */
const YOLO_CLASSES = [
  'HDPE_A', // 0
  'HDPE_B', // 1
  'LDPE_A', // 2
  'LDPE_B', // 3
  'MISC_A', // 4
  'PET_A',  // 5
  'PET_B',  // 6
  'PP_A',   // 7
  'PP_B',   // 8
] as const;

type YoloClass = typeof YOLO_CLASSES[number];

/**
 * Maps each YOLO class to the app-level plastic type.
 * A + B variants of the same material are summed together.
 */
const YOLO_TO_APP: Record<YoloClass, PlasticType> = {
  HDPE_A: 'HDPE',
  HDPE_B: 'HDPE',
  LDPE_A: 'LDPE',
  LDPE_B: 'LDPE',
  MISC_A: 'OTHER',
  PET_A:  'PET',
  PET_B:  'PET',
  PP_A:   'PP',
  PP_B:   'PP',
};

export interface MLModelResult {
  type: PlasticType;
  confidence: number;
  allScores: Record<PlasticType, number>;
}

// ── Singleton session cache ───────────────────────────────────────────────────

let sessionCache: ort.InferenceSession | null = null;
let modelLoadError: string | null = null;
let loadingPromise: Promise<ort.InferenceSession | null> | null = null;

export type ModelLoadState = 'idle' | 'loading' | 'ready' | 'error';
let loadState: ModelLoadState = 'idle';

export function getModelLoadState(): ModelLoadState { return loadState; }
export function getModelLoadError(): string | null  { return modelLoadError; }

/**
 * Load (or return cached) ONNX Runtime inference session.
 * Uses WebAssembly backend for cross-browser compatibility.
 * Resolves to null if the model file is not found (graceful fallback to heuristic).
 */
export async function loadModel(
  onProgress?: (pct: number) => void,
): Promise<ort.InferenceSession | null> {
  if (sessionCache) return sessionCache;
  if (loadingPromise) return loadingPromise as Promise<ort.InferenceSession | null>;

  loadState = 'loading';
  onProgress?.(5);

  loadingPromise = (async () => {
    try {
      // Configure ONNX Runtime to use WASM backend
      ort.env.wasm.numThreads = 1; // Safe default for all browsers
      ort.env.wasm.simd = true;    // Enable SIMD for faster inference

      onProgress?.(20);

      const session = await ort.InferenceSession.create(MODEL_PATH, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });

      sessionCache = session;
      loadState = 'ready';
      onProgress?.(100);
      return session;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error loading model';

      if (message.includes('404') || message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('not found')) {
        modelLoadError = 'Custom YOLO model not found — falling back to heuristic classifier.';
      } else {
        modelLoadError = message;
      }

      loadState = 'error';
      return null;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise as Promise<ort.InferenceSession | null>;
}

/**
 * Preprocess an image source into a Float32 ONNX tensor.
 * Shape: [1, 3, 320, 320] (BCHW format), values normalised to [0, 1].
 *
 * YOLOv8 uses [0, 1] range and BCHW (channels-first) format.
 */
function preprocessImage(
  source: HTMLImageElement | HTMLCanvasElement | ImageData,
): ort.Tensor {
  // Draw image to an offscreen canvas at INPUT_SIZE x INPUT_SIZE
  const canvas = document.createElement('canvas');
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  if (source instanceof ImageData) {
    ctx.putImageData(source, 0, 0);
  } else {
    ctx.drawImage(source, 0, 0, INPUT_SIZE, INPUT_SIZE);
  }

  const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const { data } = imageData;
  const pixelCount = INPUT_SIZE * INPUT_SIZE;

  // ONNX/YOLOv8 expects BCHW: [1, 3, H, W]
  // data is RGBA interleaved: [R0,G0,B0,A0, R1,G1,B1,A1, ...]
  const float32 = new Float32Array(1 * 3 * INPUT_SIZE * INPUT_SIZE);
  const rOffset = 0;
  const gOffset = pixelCount;
  const bOffset = pixelCount * 2;

  for (let i = 0; i < pixelCount; i++) {
    float32[rOffset + i] = data[i * 4 + 0] / 255.0; // R
    float32[gOffset + i] = data[i * 4 + 1] / 255.0; // G
    float32[bOffset + i] = data[i * 4 + 2] / 255.0; // B
  }

  return new ort.Tensor('float32', float32, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

/**
 * Apply softmax to convert raw logits to probabilities.
 */
function softmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - maxLogit));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sumExps);
}

/**
 * Aggregate the 9 raw YOLO class probabilities into the 5 app-level PlasticTypes.
 * A and B variants of the same material are summed.
 */
function aggregateScores(rawProbs: number[]): Record<PlasticType, number> {
  const scores: Record<PlasticType, number> = {
    PET: 0, HDPE: 0, PVC: 0, LDPE: 0, PP: 0, PS: 0, OTHER: 0,
  };

  YOLO_CLASSES.forEach((cls, idx) => {
    const appType = YOLO_TO_APP[cls];
    scores[appType] += rawProbs[idx] ?? 0;
  });

  // Round to 3 decimal places for cleaner display
  for (const key of Object.keys(scores) as PlasticType[]) {
    scores[key] = Math.round(scores[key] * 1000) / 1000;
  }

  return scores;
}

/**
 * End-to-end classify function using your custom YOLOv8n-cls ONNX model.
 *
 * @param source    - An image element, canvas, or raw ImageData.
 * @param onProgress - Optional callback for model load progress (0–100).
 * @returns MLModelResult with merged type, confidence, and all class scores.
 *          Returns null if the ONNX model is unavailable → heuristic fallback.
 */
export async function classifyWithModel(
  source: HTMLImageElement | HTMLCanvasElement | ImageData,
  onProgress?: (pct: number) => void,
): Promise<MLModelResult | null> {
  const session = await loadModel(onProgress);
  if (!session) return null;

  const inputTensor = preprocessImage(source);

  // Run inference — get the first input name dynamically
  const inputName = session.inputNames[0];
  const feeds: Record<string, ort.Tensor> = { [inputName]: inputTensor };
  const results = await session.run(feeds);

  // Get output tensor data
  const outputName = session.outputNames[0];
  const outputData = Array.from(results[outputName].data as Float32Array);

  // YOLOv8 classification head outputs raw logits — apply softmax
  const probabilities = softmax(outputData);

  // Merge 9 YOLO → 5 app classes
  const allScores = aggregateScores(probabilities);

  // Pick the winner
  let bestType: PlasticType = 'OTHER';
  let bestScore = 0;

  for (const [type, score] of Object.entries(allScores) as [PlasticType, number][]) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  return {
    type: bestType,
    confidence: Math.round(bestScore * 1000) / 1000,
    allScores,
  };
}
