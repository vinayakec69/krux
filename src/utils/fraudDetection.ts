import CryptoJS from 'crypto-js';

export interface ScanMetadata {
  imageHash: string;
  timestamp: number;
  gpsCoordinates: { lat: number; lng: number } | null;
  deviceId: string;
  canvasFingerprint: string;
  colorHistogram: string;
  imageSize: number;
  combinedHash: string;
}

// Generate a unique device fingerprint
export const generateDeviceId = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('KRUX-Device', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('KRUX-Device', 4, 17);
  }
  
  const fingerprint = canvas.toDataURL();
  const userAgent = navigator.userAgent;
  const screenRes = `${screen.width}x${screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  
  const combined = fingerprint + userAgent + screenRes + timezone + language;
  return CryptoJS.SHA256(combined).toString().substring(0, 32);
};

// Extract color histogram from image for similarity detection
export const extractColorHistogram = (imageData: ImageData): string => {
  const data = imageData.data;
  const histogram: number[] = new Array(64).fill(0);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = Math.floor(data[i] / 64);
    const g = Math.floor(data[i + 1] / 64);
    const b = Math.floor(data[i + 2] / 64);
    const index = r * 16 + g * 4 + b;
    histogram[index]++;
  }
  
  // Normalize
  const total = data.length / 4;
  const normalized = histogram.map(v => Math.round((v / total) * 1000));
  
  return normalized.join(',');
};

// Calculate image perceptual hash for similarity detection
export const calculatePerceptualHash = (imageData: ImageData, width: number, height: number): string => {
  // Resize to 8x8 grayscale
  const grayscale: number[] = [];
  const blockWidth = Math.floor(width / 8);
  const blockHeight = Math.floor(height / 8);
  
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      let sum = 0;
      let count = 0;
      
      for (let by = 0; by < blockHeight; by++) {
        for (let bx = 0; bx < blockWidth; bx++) {
          const px = x * blockWidth + bx;
          const py = y * blockHeight + by;
          const idx = (py * width + px) * 4;
          
          if (idx < imageData.data.length) {
            const gray = (imageData.data[idx] * 0.299 + 
                         imageData.data[idx + 1] * 0.587 + 
                         imageData.data[idx + 2] * 0.114);
            sum += gray;
            count++;
          }
        }
      }
      
      grayscale.push(count > 0 ? sum / count : 0);
    }
  }
  
  // Calculate average
  const avg = grayscale.reduce((a, b) => a + b, 0) / grayscale.length;
  
  // Generate hash
  const bits = grayscale.map(v => v > avg ? '1' : '0').join('');
  
  // Convert to hex
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.substr(i, 4), 2).toString(16);
  }
  
  return hex;
};

// Calculate hamming distance between two hashes
export const hammingDistance = (hash1: string, hash2: string): number => {
  if (hash1.length !== hash2.length) return 999;
  
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const n1 = parseInt(hash1[i], 16);
    const n2 = parseInt(hash2[i], 16);
    const xor = n1 ^ n2;
    distance += xor.toString(2).split('1').length - 1;
  }
  
  return distance;
};

// Get GPS coordinates
export const getGPSCoordinates = (): Promise<{ lat: number; lng: number } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: Math.round(position.coords.latitude * 10000) / 10000,
          lng: Math.round(position.coords.longitude * 10000) / 10000,
        });
      },
      () => {
        resolve(null);
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  });
};

// Generate comprehensive scan metadata
export const generateScanMetadata = async (
  canvas: HTMLCanvasElement,
  imageDataUrl: string
): Promise<ScanMetadata> => {
  const ctx = canvas.getContext('2d');
  const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
  
  const timestamp = Date.now();
  const deviceId = generateDeviceId();
  const gpsCoordinates = await getGPSCoordinates();
  
  // Generate image hash
  const imageHash = CryptoJS.SHA256(imageDataUrl).toString();
  
  // Generate canvas fingerprint from the actual content
  const canvasFingerprint = calculatePerceptualHash(
    imageData!,
    canvas.width,
    canvas.height
  );
  
  // Generate color histogram
  const colorHistogram = extractColorHistogram(imageData!);
  
  // Get image size
  const imageSize = imageDataUrl.length;
  
  // Create combined hash for fraud detection
  const combinedData = [
    canvasFingerprint,
    colorHistogram.substring(0, 50),
    deviceId,
  ].join('|');
  
  const combinedHash = CryptoJS.SHA256(combinedData).toString();
  
  return {
    imageHash,
    timestamp,
    gpsCoordinates,
    deviceId,
    canvasFingerprint,
    colorHistogram,
    imageSize,
    combinedHash,
  };
};

// Check for duplicate/fraud using multiple methods
export const checkForFraud = (
  newMetadata: ScanMetadata,
  existingScans: ScanMetadata[]
): { isFraud: boolean; reason: string } => {
  for (const existing of existingScans) {
    // Method 1: Exact image hash match
    if (existing.imageHash === newMetadata.imageHash) {
      return {
        isFraud: true,
        reason: 'Exact duplicate image detected',
      };
    }
    
    // Method 2: Perceptual hash similarity (catches resized/slightly modified images)
    const perceptualDistance = hammingDistance(
      existing.canvasFingerprint,
      newMetadata.canvasFingerprint
    );
    
    if (perceptualDistance < 5) {
      return {
        isFraud: true,
        reason: 'Similar image already scanned (perceptual match)',
      };
    }
    
    // Method 3: Combined hash match (same visual content from same device)
    if (existing.combinedHash === newMetadata.combinedHash) {
      return {
        isFraud: true,
        reason: 'Duplicate content detected from this device',
      };
    }
    
    // Method 4: Same location + similar time (within 30 seconds) + similar image
    if (
      existing.gpsCoordinates &&
      newMetadata.gpsCoordinates &&
      Math.abs(existing.gpsCoordinates.lat - newMetadata.gpsCoordinates.lat) < 0.0001 &&
      Math.abs(existing.gpsCoordinates.lng - newMetadata.gpsCoordinates.lng) < 0.0001 &&
      Math.abs(existing.timestamp - newMetadata.timestamp) < 30000 &&
      perceptualDistance < 10
    ) {
      return {
        isFraud: true,
        reason: 'Rapid duplicate scan from same location',
      };
    }
    
    // Method 5: Color histogram similarity for same device
    if (
      existing.deviceId === newMetadata.deviceId &&
      existing.colorHistogram === newMetadata.colorHistogram
    ) {
      return {
        isFraud: true,
        reason: 'Identical color profile detected on same device',
      };
    }
  }
  
  return { isFraud: false, reason: '' };
};
