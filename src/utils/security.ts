/**
 * Security utilities: input sanitization, CSP helpers, and
 * Web-Crypto–based hashing (replaces crypto-js).
 */

// ── Input sanitization ────────────────────────────────────────────────────────

/**
 * Strip HTML tags and dangerous characters from a user-supplied string.
 * Never pass user input through dangerouslySetInnerHTML.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Truncate and strip control characters from a string to a safe length.
 */
export function sanitizeInput(input: string, maxLength = 256): string {
  return input
    .slice(0, maxLength)
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// ── Hashing (Web Crypto API — no crypto-js dependency) ────────────────────────

/**
 * SHA-256 hash of a string, returned as a hex string.
 */
export async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * SHA-256 hash of an ArrayBuffer (e.g. from a File/Blob), returned as hex.
 */
export async function sha256HexBuffer(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Device fingerprinting (privacy-preserving) ────────────────────────────────

/**
 * Builds a lightweight, privacy-preserving device fingerprint from
 * publicly available browser properties.  This is used server-side for
 * fraud correlation — not for tracking users.
 */
export async function buildDeviceFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency ?? 0,
  ].join('|');
  return sha256Hex(components);
}

// ── Perceptual hash (DCT-based, simplified) ───────────────────────────────────

/**
 * Compute a perceptual hash of an ImageData object.
 * Returns a 64-character hex string representing the 256-bit hash.
 * Used for duplicate-image fraud detection.
 */
export function perceptualHash(imageData: ImageData): string {
  const SIZE = 32;
  // Down-sample to SIZE×SIZE grayscale
  const { data, width, height } = imageData;
  const small: number[] = [];

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const srcX = Math.floor((x / SIZE) * width);
      const srcY = Math.floor((y / SIZE) * height);
      const idx = (srcY * width + srcX) * 4;
      const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      small.push(gray);
    }
  }

  const avg = small.reduce((a, b) => a + b, 0) / small.length;
  // Build bit string: 1 if pixel >= avg, else 0
  const bits = small.map((v) => (v >= avg ? '1' : '0')).join('');

  // Convert 256-bit string to 64-char hex
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

/**
 * Compute Hamming distance between two equal-length hex strings.
 * Used to detect near-duplicate images (distance < 5 = very similar).
 */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    // Count set bits
    dist += [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4][xor];
  }
  return dist;
}

// ── Color histogram ───────────────────────────────────────────────────────────

/**
 * Compute a compact 48-bucket color histogram from an ImageData (16 per channel).
 * Returns a comma-separated string suitable for storing in the database.
 */
export function colorHistogram(imageData: ImageData, buckets = 16): string {
  const { data } = imageData;
  const rHist = new Array<number>(buckets).fill(0);
  const gHist = new Array<number>(buckets).fill(0);
  const bHist = new Array<number>(buckets).fill(0);
  const step = Math.floor(256 / buckets);
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    rHist[Math.floor(data[i] / step)]++;
    gHist[Math.floor(data[i + 1] / step)]++;
    bHist[Math.floor(data[i + 2] / step)]++;
  }

  const normalise = (h: number[]) => h.map((v) => (v / pixelCount).toFixed(4)).join(',');
  return [normalise(rHist), normalise(gHist), normalise(bHist)].join(';');
}
