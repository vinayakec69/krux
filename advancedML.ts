// Advanced Plastic Classification ML Model
// Uses multiple feature extraction techniques for accurate classification

interface FeatureVector {
  // Color features
  avgRed: number;
  avgGreen: number;
  avgBlue: number;
  colorVariance: number;
  saturation: number;
  brightness: number;
  
  // Texture features
  edgeDensity: number;
  smoothness: number;
  roughness: number;
  
  // Transparency features
  transparency: number;
  glossiness: number;
  
  // Pattern features
  uniformity: number;
  entropy: number;
  
  // Shape features
  hasRecyclingSymbol: number;
  circularPatterns: number;
  linearPatterns: number;
  
  // Condition features (for adverse data)
  noiseLevel: number;
  blurLevel: number;
  crumpleScore: number;
}

interface ClassificationResult {
  type: 'PET' | 'HDPE' | 'PVC' | 'LDPE' | 'PP' | 'PS' | 'OTHER';
  confidence: number;
  allScores: Record<string, number>;
  features: Partial<FeatureVector>;
}

// Plastic type characteristics based on real-world data
const PLASTIC_PROFILES = {
  PET: {
    // Clear plastic bottles, containers
    transparency: [0.6, 1.0],
    brightness: [0.5, 0.9],
    saturation: [0.0, 0.3],
    smoothness: [0.6, 1.0],
    colorRange: { r: [150, 255], g: [150, 255], b: [150, 255] },
    edgeDensity: [0.1, 0.4],
    weight: 1.2, // Common, high reward
  },
  HDPE: {
    // Opaque milk jugs, detergent bottles
    transparency: [0.0, 0.3],
    brightness: [0.6, 1.0],
    saturation: [0.0, 0.4],
    smoothness: [0.4, 0.8],
    colorRange: { r: [180, 255], g: [180, 255], b: [180, 255] },
    edgeDensity: [0.2, 0.5],
    weight: 1.1,
  },
  PVC: {
    // Pipes, some packaging - often has blue/gray tint
    transparency: [0.2, 0.6],
    brightness: [0.3, 0.7],
    saturation: [0.1, 0.4],
    smoothness: [0.5, 0.9],
    colorRange: { r: [100, 200], g: [100, 200], b: [120, 220] },
    edgeDensity: [0.3, 0.6],
    weight: 0.9,
  },
  LDPE: {
    // Plastic bags, squeeze bottles - flexible, translucent
    transparency: [0.3, 0.7],
    brightness: [0.4, 0.8],
    saturation: [0.0, 0.3],
    smoothness: [0.3, 0.7],
    colorRange: { r: [140, 230], g: [140, 230], b: [140, 230] },
    edgeDensity: [0.4, 0.8], // More wrinkles/folds
    weight: 0.8,
  },
  PP: {
    // Yogurt containers, bottle caps - often colored, matte
    transparency: [0.0, 0.2],
    brightness: [0.4, 0.8],
    saturation: [0.2, 0.7],
    smoothness: [0.5, 0.8],
    colorRange: { r: [50, 255], g: [50, 255], b: [50, 255] },
    edgeDensity: [0.2, 0.5],
    weight: 1.0,
  },
  PS: {
    // Styrofoam, disposable cups - very white/light, foam texture
    transparency: [0.0, 0.2],
    brightness: [0.8, 1.0],
    saturation: [0.0, 0.15],
    smoothness: [0.2, 0.5], // Foam has texture
    colorRange: { r: [220, 255], g: [220, 255], b: [220, 255] },
    edgeDensity: [0.5, 0.9], // Foam texture creates edges
    weight: 0.7,
  },
  OTHER: {
    transparency: [0.0, 1.0],
    brightness: [0.0, 1.0],
    saturation: [0.0, 1.0],
    smoothness: [0.0, 1.0],
    colorRange: { r: [0, 255], g: [0, 255], b: [0, 255] },
    edgeDensity: [0.0, 1.0],
    weight: 0.5,
  },
};

export class PlasticClassifier {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }
  
  async classify(imageData: string): Promise<ClassificationResult> {
    const img = await this.loadImage(imageData);
    
    // Resize for processing (balance between speed and accuracy)
    const processSize = 128;
    this.canvas.width = processSize;
    this.canvas.height = processSize;
    this.ctx.drawImage(img, 0, 0, processSize, processSize);
    
    const pixels = this.ctx.getImageData(0, 0, processSize, processSize);
    
    // Extract comprehensive features
    const features = this.extractFeatures(pixels);
    
    // Apply adverse condition normalization
    const normalizedFeatures = this.normalizeForAdverseConditions(features);
    
    // Classify using weighted scoring
    const scores = this.calculateScores(normalizedFeatures);
    
    // Find best match
    const sortedTypes = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const bestType = sortedTypes[0][0] as ClassificationResult['type'];
    const bestScore = sortedTypes[0][1];
    
    // Calculate confidence based on score separation
    const secondScore = sortedTypes[1]?.[1] || 0;
    const scoreDiff = bestScore - secondScore;
    const confidence = Math.min(95, Math.max(50, 50 + scoreDiff * 100));
    
    return {
      type: bestType,
      confidence: Math.round(confidence),
      allScores: scores,
      features: normalizedFeatures,
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
  
  private extractFeatures(imageData: ImageData): FeatureVector {
    const { data, width, height } = imageData;
    const pixelCount = width * height;
    
    // Color analysis
    let totalR = 0, totalG = 0, totalB = 0;
    const rValues: number[] = [];
    const gValues: number[] = [];
    const bValues: number[] = [];
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      totalR += r;
      totalG += g;
      totalB += b;
      
      rValues.push(r);
      gValues.push(g);
      bValues.push(b);
    }
    
    const avgRed = totalR / pixelCount / 255;
    const avgGreen = totalG / pixelCount / 255;
    const avgBlue = totalB / pixelCount / 255;
    
    // Color variance
    const colorVariance = this.calculateVariance([
      ...rValues.map(v => v / 255),
      ...gValues.map(v => v / 255),
      ...bValues.map(v => v / 255),
    ]);
    
    // Brightness (luminance)
    const brightness = (avgRed * 0.299 + avgGreen * 0.587 + avgBlue * 0.114);
    
    // Saturation
    const maxColor = Math.max(avgRed, avgGreen, avgBlue);
    const minColor = Math.min(avgRed, avgGreen, avgBlue);
    const saturation = maxColor === 0 ? 0 : (maxColor - minColor) / maxColor;
    
    // Edge detection (Sobel-like)
    const edgeDensity = this.calculateEdgeDensity(data, width, height);
    
    // Smoothness (inverse of local variance)
    const smoothness = 1 - Math.min(1, edgeDensity * 1.5);
    
    // Roughness (based on local contrast variations)
    const roughness = this.calculateRoughness(data, width, height);
    
    // Transparency estimation (based on brightness and saturation)
    const transparency = this.estimateTransparency(rValues, gValues, bValues);
    
    // Glossiness (high contrast bright spots)
    const glossiness = this.calculateGlossiness(data, brightness);
    
    // Uniformity (how consistent the colors are)
    const uniformity = 1 - colorVariance;
    
    // Entropy (information content)
    const entropy = this.calculateEntropy(data);
    
    // Pattern detection
    const { circular: circularPatterns, linear: linearPatterns } = this.detectPatterns(data, width, height);
    
    // Recycling symbol detection (simplified)
    const hasRecyclingSymbol = this.detectRecyclingSymbol(data, width, height);
    
    // Noise level
    const noiseLevel = this.calculateNoiseLevel(data, width, height);
    
    // Blur level
    const blurLevel = 1 - edgeDensity;
    
    // Crumple score (based on edge irregularity)
    const crumpleScore = this.calculateCrumpleScore(data, width, height);
    
    return {
      avgRed,
      avgGreen,
      avgBlue,
      colorVariance,
      saturation,
      brightness,
      edgeDensity,
      smoothness,
      roughness,
      transparency,
      glossiness,
      uniformity,
      entropy,
      hasRecyclingSymbol,
      circularPatterns,
      linearPatterns,
      noiseLevel,
      blurLevel,
      crumpleScore,
    };
  }
  
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }
  
  private calculateEdgeDensity(data: Uint8ClampedArray, width: number, height: number): number {
    let edgeCount = 0;
    const threshold = 30;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const idxRight = (y * width + x + 1) * 4;
        const idxDown = ((y + 1) * width + x) * 4;
        
        const grayCenter = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const grayRight = (data[idxRight] + data[idxRight + 1] + data[idxRight + 2]) / 3;
        const grayDown = (data[idxDown] + data[idxDown + 1] + data[idxDown + 2]) / 3;
        
        const dx = Math.abs(grayCenter - grayRight);
        const dy = Math.abs(grayCenter - grayDown);
        
        if (dx > threshold || dy > threshold) {
          edgeCount++;
        }
      }
    }
    
    return edgeCount / ((width - 2) * (height - 2));
  }
  
  private calculateRoughness(data: Uint8ClampedArray, width: number, height: number): number {
    let totalVariation = 0;
    const blockSize = 8;
    let blockCount = 0;
    
    for (let by = 0; by < height - blockSize; by += blockSize) {
      for (let bx = 0; bx < width - blockSize; bx += blockSize) {
        const blockValues: number[] = [];
        
        for (let y = by; y < by + blockSize; y++) {
          for (let x = bx; x < bx + blockSize; x++) {
            const idx = (y * width + x) * 4;
            blockValues.push((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
          }
        }
        
        totalVariation += this.calculateVariance(blockValues);
        blockCount++;
      }
    }
    
    return totalVariation / blockCount / 128;
  }
  
  private estimateTransparency(r: number[], g: number[], b: number[]): number {
    // Transparent plastics tend to have high brightness and low saturation
    // with colors close to each other
    let transparentPixels = 0;
    
    for (let i = 0; i < r.length; i++) {
      const brightness = (r[i] + g[i] + b[i]) / 3;
      const maxC = Math.max(r[i], g[i], b[i]);
      const minC = Math.min(r[i], g[i], b[i]);
      const colorRange = maxC - minC;
      
      if (brightness > 150 && colorRange < 40) {
        transparentPixels++;
      }
    }
    
    return transparentPixels / r.length;
  }
  
  private calculateGlossiness(data: Uint8ClampedArray, _avgBrightness: number): number {
    let highlightCount = 0;
    const threshold = 230;
    
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (brightness > threshold) {
        highlightCount++;
      }
    }
    
    return highlightCount / (data.length / 4);
  }
  
  private calculateEntropy(data: Uint8ClampedArray): number {
    const histogram = new Array(256).fill(0);
    const pixelCount = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
      histogram[gray]++;
    }
    
    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (histogram[i] > 0) {
        const p = histogram[i] / pixelCount;
        entropy -= p * Math.log2(p);
      }
    }
    
    return entropy / 8; // Normalize to 0-1
  }
  
  private detectPatterns(data: Uint8ClampedArray, width: number, height: number): { circular: number; linear: number } {
    // Simplified pattern detection
    let horizontalEdges = 0;
    let verticalEdges = 0;
    
    const threshold = 25;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const leftIdx = (y * width + x - 1) * 4;
        const rightIdx = (y * width + x + 1) * 4;
        const upIdx = ((y - 1) * width + x) * 4;
        const downIdx = ((y + 1) * width + x) * 4;
        
        const grayLeft = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3;
        const grayRight = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
        const grayUp = (data[upIdx] + data[upIdx + 1] + data[upIdx + 2]) / 3;
        const grayDown = (data[downIdx] + data[downIdx + 1] + data[downIdx + 2]) / 3;
        
        if (Math.abs(grayLeft - grayRight) > threshold) horizontalEdges++;
        if (Math.abs(grayUp - grayDown) > threshold) verticalEdges++;
      }
    }
    
    const total = (width - 2) * (height - 2);
    const linear = (horizontalEdges + verticalEdges) / total / 2;
    const circular = Math.abs(horizontalEdges - verticalEdges) / total < 0.1 ? 0.5 : 0.2;
    
    return { circular, linear };
  }
  
  private detectRecyclingSymbol(data: Uint8ClampedArray, width: number, height: number): number {
    // Simplified - look for triangular patterns in center
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const searchRadius = Math.floor(Math.min(width, height) / 4);
    
    let triangularPatterns = 0;
    
    for (let angle = 0; angle < 360; angle += 120) {
      const rad = angle * Math.PI / 180;
      const x = Math.floor(centerX + searchRadius * Math.cos(rad));
      const y = Math.floor(centerY + searchRadius * Math.sin(rad));
      
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        if (brightness < 100) {
          triangularPatterns++;
        }
      }
    }
    
    return triangularPatterns >= 2 ? 0.7 : 0.1;
  }
  
  private calculateNoiseLevel(data: Uint8ClampedArray, width: number, height: number): number {
    let noiseCount = 0;
    const threshold = 50;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // Check all 8 neighbors
        let neighborSum = 0;
        let neighborCount = 0;
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            neighborSum += (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3;
            neighborCount++;
          }
        }
        
        const neighborAvg = neighborSum / neighborCount;
        if (Math.abs(gray - neighborAvg) > threshold) {
          noiseCount++;
        }
      }
    }
    
    return noiseCount / ((width - 2) * (height - 2));
  }
  
  private calculateCrumpleScore(data: Uint8ClampedArray, width: number, height: number): number {
    // Crumpled plastic has irregular edges and high local variance
    const edgeDensity = this.calculateEdgeDensity(data, width, height);
    const roughness = this.calculateRoughness(data, width, height);
    
    return (edgeDensity * 0.6 + roughness * 0.4);
  }
  
  private normalizeForAdverseConditions(features: FeatureVector): FeatureVector {
    // Adjust features to account for poor image conditions
    const normalized = { ...features };
    
    // If image is very noisy, reduce confidence in fine details
    if (features.noiseLevel > 0.2) {
      normalized.edgeDensity *= 0.7;
      normalized.roughness *= 0.7;
    }
    
    // If image is blurry, boost color-based features
    if (features.blurLevel > 0.7) {
      normalized.colorVariance *= 1.2;
      normalized.saturation *= 1.2;
    }
    
    // Crumpled plastic adjustments
    if (features.crumpleScore > 0.3) {
      // Crumpled plastic tends to look less transparent
      normalized.transparency *= 0.8;
      // But maintains color characteristics
      normalized.saturation *= 1.1;
    }
    
    return normalized;
  }
  
  private calculateScores(features: FeatureVector): Record<string, number> {
    const scores: Record<string, number> = {};
    
    for (const [type, profile] of Object.entries(PLASTIC_PROFILES)) {
      let score = 0;
      let factors = 0;
      
      // Transparency score
      if (features.transparency >= profile.transparency[0] && 
          features.transparency <= profile.transparency[1]) {
        score += 1;
      } else {
        const dist = Math.min(
          Math.abs(features.transparency - profile.transparency[0]),
          Math.abs(features.transparency - profile.transparency[1])
        );
        score += Math.max(0, 1 - dist * 2);
      }
      factors++;
      
      // Brightness score
      if (features.brightness >= profile.brightness[0] && 
          features.brightness <= profile.brightness[1]) {
        score += 1;
      } else {
        const dist = Math.min(
          Math.abs(features.brightness - profile.brightness[0]),
          Math.abs(features.brightness - profile.brightness[1])
        );
        score += Math.max(0, 1 - dist * 2);
      }
      factors++;
      
      // Saturation score
      if (features.saturation >= profile.saturation[0] && 
          features.saturation <= profile.saturation[1]) {
        score += 1;
      } else {
        const dist = Math.min(
          Math.abs(features.saturation - profile.saturation[0]),
          Math.abs(features.saturation - profile.saturation[1])
        );
        score += Math.max(0, 1 - dist * 2);
      }
      factors++;
      
      // Smoothness score
      if (features.smoothness >= profile.smoothness[0] && 
          features.smoothness <= profile.smoothness[1]) {
        score += 1;
      } else {
        const dist = Math.min(
          Math.abs(features.smoothness - profile.smoothness[0]),
          Math.abs(features.smoothness - profile.smoothness[1])
        );
        score += Math.max(0, 1 - dist * 2);
      }
      factors++;
      
      // Edge density score
      if (features.edgeDensity >= profile.edgeDensity[0] && 
          features.edgeDensity <= profile.edgeDensity[1]) {
        score += 1;
      } else {
        const dist = Math.min(
          Math.abs(features.edgeDensity - profile.edgeDensity[0]),
          Math.abs(features.edgeDensity - profile.edgeDensity[1])
        );
        score += Math.max(0, 1 - dist * 2);
      }
      factors++;
      
      // Color range score
      const colorScore = this.calculateColorRangeScore(features, profile.colorRange);
      score += colorScore;
      factors++;
      
      // Apply weight and normalize
      scores[type] = (score / factors) * profile.weight;
    }
    
    // Normalize scores to sum to 1
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    for (const type of Object.keys(scores)) {
      scores[type] = scores[type] / totalScore;
    }
    
    return scores;
  }
  
  private calculateColorRangeScore(
    features: FeatureVector, 
    colorRange: { r: number[]; g: number[]; b: number[] }
  ): number {
    const r = features.avgRed * 255;
    const g = features.avgGreen * 255;
    const b = features.avgBlue * 255;
    
    let score = 0;
    
    if (r >= colorRange.r[0] && r <= colorRange.r[1]) score += 0.33;
    if (g >= colorRange.g[0] && g <= colorRange.g[1]) score += 0.33;
    if (b >= colorRange.b[0] && b <= colorRange.b[1]) score += 0.34;
    
    return score;
  }
}

export const plasticClassifier = new PlasticClassifier();
