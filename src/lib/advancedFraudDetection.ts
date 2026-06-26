// Advanced Fraud Detection System
// Multiple layers of protection against scanning same waste multiple times

interface ScanRecord {
  id: string;
  timestamp: number;
  imageHash: string;
  perceptualHash: string;
  colorHistogram: string;
  gpsLocation: { lat: number; lng: number } | null;
  deviceFingerprint: string;
  imageFeatures: ImageFeatures;
}

interface ImageFeatures {
  avgBrightness: number;
  avgSaturation: number;
  dominantColor: string;
  edgeSignature: string;
  blockHashes: string[];
  colorRegions: ColorRegion[];
}

interface ColorRegion {
  x: number;
  y: number;
  color: string;
  size: number;
}

interface FraudCheckResult {
  isFraud: boolean;
  confidence: number;
  reason: string;
  matchedScanId?: string;
  details: {
    perceptualMatch: number;
    colorMatch: number;
    featureMatch: number;
    locationMatch: boolean;
    timeProximity: boolean;
  };
}

const STORAGE_KEY = 'krux_scan_history_v2';
const MAX_HISTORY = 500;
const FRAUD_THRESHOLD = 0.70; // 70% similarity = fraud
const LOCATION_RADIUS_METERS = 50;
const TIME_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export class AdvancedFraudDetector {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scanHistory: ScanRecord[] = [];
  
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.loadHistory();
  }
  
  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.scanHistory = JSON.parse(stored);
      }
    } catch (e) {
      this.scanHistory = [];
    }
  }
  
  private saveHistory(): void {
    // Keep only last MAX_HISTORY records
    if (this.scanHistory.length > MAX_HISTORY) {
      this.scanHistory = this.scanHistory.slice(-MAX_HISTORY);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.scanHistory));
  }
  
  async checkForFraud(imageData: string): Promise<FraudCheckResult> {
    const img = await this.loadImage(imageData);
    
    // Generate multiple fingerprints
    const perceptualHash = this.generatePerceptualHash(img);
    const colorHistogram = this.generateColorHistogram(img);
    const imageFeatures = this.extractImageFeatures(img);
    const deviceFingerprint = this.getDeviceFingerprint();
    const gpsLocation = await this.getGPSLocation();
    const imageHash = await this.generateImageHash(imageData);
    
    // Check against all previous scans
    let highestMatch = 0;
    let matchedRecord: ScanRecord | null = null;
    let matchDetails = {
      perceptualMatch: 0,
      colorMatch: 0,
      featureMatch: 0,
      locationMatch: false,
      timeProximity: false,
    };
    
    const now = Date.now();
    
    for (const record of this.scanHistory) {
      // Calculate perceptual hash similarity (Hamming distance)
      const perceptualSimilarity = this.comparePerceptualHash(perceptualHash, record.perceptualHash);
      
      // Calculate color histogram similarity
      const colorSimilarity = this.compareColorHistogram(colorHistogram, record.colorHistogram);
      
      // Calculate feature similarity
      const featureSimilarity = this.compareFeatures(imageFeatures, record.imageFeatures);
      
      // Location check
      const locationMatch = this.checkLocationMatch(gpsLocation, record.gpsLocation);
      
      // Time proximity check
      const timeProximity = (now - record.timestamp) < TIME_WINDOW_MS;
      
      // Combined score with weights
      let combinedScore = (
        perceptualSimilarity * 0.35 +
        colorSimilarity * 0.25 +
        featureSimilarity * 0.25 +
        (locationMatch ? 0.10 : 0) +
        (timeProximity ? 0.05 : 0)
      );
      
      // Exact hash match is definite fraud
      if (imageHash === record.imageHash) {
        combinedScore = 1.0;
      }
      
      if (combinedScore > highestMatch) {
        highestMatch = combinedScore;
        matchedRecord = record;
        matchDetails = {
          perceptualMatch: perceptualSimilarity,
          colorMatch: colorSimilarity,
          featureMatch: featureSimilarity,
          locationMatch,
          timeProximity,
        };
      }
    }
    
    // Determine if fraud
    const isFraud = highestMatch >= FRAUD_THRESHOLD;
    
    // If not fraud, save this scan
    if (!isFraud) {
      const newRecord: ScanRecord = {
        id: this.generateId(),
        timestamp: now,
        imageHash,
        perceptualHash,
        colorHistogram,
        gpsLocation,
        deviceFingerprint,
        imageFeatures,
      };
      this.scanHistory.push(newRecord);
      this.saveHistory();
    }
    
    let reason = '';
    if (isFraud) {
      if (highestMatch >= 0.95) {
        reason = 'This exact item has been scanned before!';
      } else if (matchDetails.perceptualMatch > 0.8) {
        reason = 'This item looks identical to a previous scan!';
      } else if (matchDetails.locationMatch && matchDetails.timeProximity) {
        reason = 'Similar item scanned from same location recently!';
      } else {
        reason = 'This item closely matches a previous scan!';
      }
    }
    
    return {
      isFraud,
      confidence: Math.round(highestMatch * 100),
      reason,
      matchedScanId: matchedRecord?.id,
      details: matchDetails,
    };
  }
  
  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
  
  private generatePerceptualHash(img: HTMLImageElement): string {
    // dHash algorithm - difference hash
    // More robust than average hash for detecting similar images
    const size = 9; // Need 9x8 for 8x8 differences
    this.canvas.width = size;
    this.canvas.height = size - 1;
    this.ctx.drawImage(img, 0, 0, size, size - 1);
    
    const data = this.ctx.getImageData(0, 0, size, size - 1).data;
    let hash = '';
    
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const leftIdx = (y * size + x) * 4;
        const rightIdx = (y * size + x + 1) * 4;
        
        const leftGray = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3;
        const rightGray = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
        
        hash += leftGray > rightGray ? '1' : '0';
      }
    }
    
    return hash;
  }
  
  private comparePerceptualHash(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) return 0;
    
    let matches = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] === hash2[i]) matches++;
    }
    
    return matches / hash1.length;
  }
  
  private generateColorHistogram(img: HTMLImageElement): string {
    const size = 64;
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx.drawImage(img, 0, 0, size, size);
    
    const data = this.ctx.getImageData(0, 0, size, size).data;
    
    // Create histogram with 8 bins per channel
    const bins = 8;
    const histogram = new Array(bins * bins * bins).fill(0);
    
    for (let i = 0; i < data.length; i += 4) {
      const rBin = Math.floor(data[i] / 32);
      const gBin = Math.floor(data[i + 1] / 32);
      const bBin = Math.floor(data[i + 2] / 32);
      
      const idx = rBin * bins * bins + gBin * bins + bBin;
      histogram[idx]++;
    }
    
    // Normalize and convert to string
    const total = size * size;
    const normalizedHist = histogram.map(v => Math.round(v / total * 100));
    
    return normalizedHist.join(',');
  }
  
  private compareColorHistogram(hist1: string, hist2: string): number {
    const h1 = hist1.split(',').map(Number);
    const h2 = hist2.split(',').map(Number);
    
    if (h1.length !== h2.length) return 0;
    
    // Chi-square similarity
    let chiSquare = 0;
    for (let i = 0; i < h1.length; i++) {
      if (h1[i] + h2[i] > 0) {
        chiSquare += Math.pow(h1[i] - h2[i], 2) / (h1[i] + h2[i]);
      }
    }
    
    // Convert to similarity (0-1)
    return Math.max(0, 1 - chiSquare / 100);
  }
  
  private extractImageFeatures(img: HTMLImageElement): ImageFeatures {
    const size = 64;
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx.drawImage(img, 0, 0, size, size);
    
    const data = this.ctx.getImageData(0, 0, size, size).data;
    
    // Average brightness
    let totalBrightness = 0;
    let totalSaturation = 0;
    const colorCounts: Record<string, number> = {};
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const brightness = (r + g + b) / 3 / 255;
      totalBrightness += brightness;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      totalSaturation += saturation;
      
      // Quantize color
      const colorKey = `${Math.floor(r / 64)},${Math.floor(g / 64)},${Math.floor(b / 64)}`;
      colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
    }
    
    const pixelCount = size * size;
    const avgBrightness = totalBrightness / pixelCount;
    const avgSaturation = totalSaturation / pixelCount;
    
    // Find dominant color
    let dominantColor = '0,0,0';
    let maxCount = 0;
    for (const [color, count] of Object.entries(colorCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantColor = color;
      }
    }
    
    // Edge signature - encode edge directions
    const edgeSignature = this.generateEdgeSignature(data, size);
    
    // Block hashes - divide image into 4x4 blocks
    const blockHashes = this.generateBlockHashes(data, size);
    
    // Color regions
    const colorRegions = this.extractColorRegions(data, size);
    
    return {
      avgBrightness,
      avgSaturation,
      dominantColor,
      edgeSignature,
      blockHashes,
      colorRegions,
    };
  }
  
  private generateEdgeSignature(data: Uint8ClampedArray, size: number): string {
    const directions: number[] = [];
    const threshold = 30;
    
    for (let y = 1; y < size - 1; y += 4) {
      for (let x = 1; x < size - 1; x += 4) {
        const idx = (y * size + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        const rightIdx = (y * size + x + 1) * 4;
        const downIdx = ((y + 1) * size + x) * 4;
        
        const grayRight = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
        const grayDown = (data[downIdx] + data[downIdx + 1] + data[downIdx + 2]) / 3;
        
        const dx = grayRight - gray;
        const dy = grayDown - gray;
        
        if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
          const angle = Math.atan2(dy, dx);
          const quantizedAngle = Math.round((angle + Math.PI) / (Math.PI / 4)) % 8;
          directions.push(quantizedAngle);
        } else {
          directions.push(8); // No edge
        }
      }
    }
    
    return directions.join('');
  }
  
  private generateBlockHashes(data: Uint8ClampedArray, size: number): string[] {
    const blockSize = size / 4;
    const hashes: string[] = [];
    
    for (let by = 0; by < 4; by++) {
      for (let bx = 0; bx < 4; bx++) {
        let sum = 0;
        let count = 0;
        
        for (let y = by * blockSize; y < (by + 1) * blockSize; y++) {
          for (let x = bx * blockSize; x < (bx + 1) * blockSize; x++) {
            const idx = (y * size + x) * 4;
            sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            count++;
          }
        }
        
        const avgGray = Math.round(sum / count);
        hashes.push(avgGray.toString(16).padStart(2, '0'));
      }
    }
    
    return hashes;
  }
  
  private extractColorRegions(data: Uint8ClampedArray, size: number): ColorRegion[] {
    const regions: ColorRegion[] = [];
    const regionSize = size / 4;
    
    for (let by = 0; by < 4; by++) {
      for (let bx = 0; bx < 4; bx++) {
        const colorCounts: Record<string, number> = {};
        
        for (let y = by * regionSize; y < (by + 1) * regionSize; y++) {
          for (let x = bx * regionSize; x < (bx + 1) * regionSize; x++) {
            const idx = (y * size + x) * 4;
            const colorKey = `${Math.floor(data[idx] / 64)},${Math.floor(data[idx + 1] / 64)},${Math.floor(data[idx + 2] / 64)}`;
            colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
          }
        }
        
        let dominantColor = '0,0,0';
        let maxCount = 0;
        for (const [color, count] of Object.entries(colorCounts)) {
          if (count > maxCount) {
            maxCount = count;
            dominantColor = color;
          }
        }
        
        regions.push({
          x: bx,
          y: by,
          color: dominantColor,
          size: maxCount,
        });
      }
    }
    
    return regions;
  }
  
  private compareFeatures(f1: ImageFeatures, f2: ImageFeatures): number {
    let score = 0;
    
    // Brightness similarity (20%)
    const brightnessDiff = Math.abs(f1.avgBrightness - f2.avgBrightness);
    score += (1 - brightnessDiff) * 0.2;
    
    // Saturation similarity (15%)
    const saturationDiff = Math.abs(f1.avgSaturation - f2.avgSaturation);
    score += (1 - saturationDiff) * 0.15;
    
    // Dominant color match (15%)
    if (f1.dominantColor === f2.dominantColor) {
      score += 0.15;
    }
    
    // Edge signature similarity (20%)
    const edgeSimilarity = this.compareStrings(f1.edgeSignature, f2.edgeSignature);
    score += edgeSimilarity * 0.2;
    
    // Block hash similarity (20%)
    let blockMatches = 0;
    for (let i = 0; i < Math.min(f1.blockHashes.length, f2.blockHashes.length); i++) {
      const diff = Math.abs(parseInt(f1.blockHashes[i], 16) - parseInt(f2.blockHashes[i], 16));
      if (diff < 20) blockMatches++;
    }
    score += (blockMatches / 16) * 0.2;
    
    // Color region similarity (10%)
    let regionMatches = 0;
    for (let i = 0; i < Math.min(f1.colorRegions.length, f2.colorRegions.length); i++) {
      if (f1.colorRegions[i].color === f2.colorRegions[i].color) {
        regionMatches++;
      }
    }
    score += (regionMatches / 16) * 0.1;
    
    return score;
  }
  
  private compareStrings(s1: string, s2: string): number {
    if (s1.length !== s2.length) return 0;
    if (s1.length === 0) return 1;
    
    let matches = 0;
    for (let i = 0; i < s1.length; i++) {
      if (s1[i] === s2[i]) matches++;
    }
    return matches / s1.length;
  }
  
  private checkLocationMatch(loc1: { lat: number; lng: number } | null, loc2: { lat: number; lng: number } | null): boolean {
    if (!loc1 || !loc2) return false;
    
    // Haversine formula for distance
    const R = 6371000; // Earth radius in meters
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance <= LOCATION_RADIUS_METERS;
  }
  
  private async getGPSLocation(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => resolve(null),
        { timeout: 5000, maximumAge: 60000 }
      );
    });
  }
  
  private getDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'unknown';
    
    canvas.width = 200;
    canvas.height = 50;
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('KRUX fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('KRUX fingerprint', 4, 17);
    
    const dataUrl = canvas.toDataURL();
    
    // Combine with other signals
    const fingerprint = [
      dataUrl.slice(-50),
      navigator.userAgent,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      navigator.language,
    ].join('|');
    
    return this.simpleHash(fingerprint);
  }
  
  private async generateImageHash(imageData: string): Promise<string> {
    // Use a portion of the base64 data for quick exact match
    const dataOnly = imageData.replace(/^data:image\/\w+;base64,/, '');
    return this.simpleHash(dataOnly.slice(0, 1000) + dataOnly.slice(-1000));
  }
  
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
  
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
  }
  
  // Method to clear history (for testing)
  clearHistory(): void {
    this.scanHistory = [];
    localStorage.removeItem(STORAGE_KEY);
  }
  
  getHistoryCount(): number {
    return this.scanHistory.length;
  }
}

export const fraudDetector = new AdvancedFraudDetector();
