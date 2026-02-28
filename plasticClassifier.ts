// Plastic Classification using image analysis
// This simulates ML classification based on color, texture, and visual features

export interface ClassificationResult {
  plasticType: string;
  plasticName: string;
  confidence: number;
  multiplier: number;
  recyclable: boolean;
  description: string;
}

export const PLASTIC_DATABASE = {
  PET: {
    name: 'Polyethylene Terephthalate',
    code: '1',
    multiplier: 10,
    recyclable: true,
    description: 'Water bottles, soft drink bottles, food containers',
    colorProfile: { r: [180, 255], g: [180, 255], b: [180, 255] }, // Clear/transparent
  },
  HDPE: {
    name: 'High-Density Polyethylene',
    code: '2',
    multiplier: 15,
    recyclable: true,
    description: 'Milk jugs, detergent bottles, shampoo bottles',
    colorProfile: { r: [200, 255], g: [200, 255], b: [200, 255] }, // White/opaque
  },
  PVC: {
    name: 'Polyvinyl Chloride',
    code: '3',
    multiplier: 5,
    recyclable: false,
    description: 'Pipes, credit cards, medical tubing',
    colorProfile: { r: [100, 180], g: [100, 180], b: [100, 180] }, // Gray
  },
  LDPE: {
    name: 'Low-Density Polyethylene',
    code: '4',
    multiplier: 8,
    recyclable: true,
    description: 'Plastic bags, squeeze bottles, bread bags',
    colorProfile: { r: [220, 255], g: [220, 255], b: [220, 255] }, // Clear/light
  },
  PP: {
    name: 'Polypropylene',
    code: '5',
    multiplier: 12,
    recyclable: true,
    description: 'Yogurt cups, bottle caps, food containers',
    colorProfile: { r: [200, 255], g: [200, 255], b: [200, 255] }, // Various
  },
  PS: {
    name: 'Polystyrene',
    code: '6',
    multiplier: 6,
    recyclable: false,
    description: 'Styrofoam cups, take-out containers, packing peanuts',
    colorProfile: { r: [230, 255], g: [230, 255], b: [230, 255] }, // White
  },
  OTHER: {
    name: 'Other Plastics',
    code: '7',
    multiplier: 4,
    recyclable: false,
    description: 'Mixed plastics, multi-layer packaging',
    colorProfile: { r: [0, 255], g: [0, 255], b: [0, 255] }, // Any
  },
};

// Analyze image data to classify plastic type
export const classifyPlastic = (imageData: ImageData): ClassificationResult => {
  const { data, width, height } = imageData;
  
  // Analyze color distribution
  let totalR = 0, totalG = 0, totalB = 0;
  let brightPixels = 0;
  let transparentPixels = 0;
  let whitePixels = 0;
  let coloredPixels = 0;
  
  const pixelCount = width * height;
  
  // Sample pixels for efficiency (every 4th pixel)
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    totalR += r;
    totalG += g;
    totalB += b;
    
    const brightness = (r + g + b) / 3;
    
    // Detect transparent/clear plastic (high brightness, neutral colors)
    if (brightness > 200 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
      transparentPixels++;
    }
    
    // Detect white plastic
    if (r > 230 && g > 230 && b > 230) {
      whitePixels++;
    }
    
    // Detect bright areas
    if (brightness > 150) {
      brightPixels++;
    }
    
    // Detect colored plastic
    const colorDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    if (colorDiff > 30) {
      coloredPixels++;
    }
  }
  
  const sampledPixels = pixelCount / 4;
  const avgR = totalR / sampledPixels;
  const avgG = totalG / sampledPixels;
  const avgB = totalB / sampledPixels;
  
  const transparentRatio = transparentPixels / sampledPixels;
  const whiteRatio = whitePixels / sampledPixels;
  const brightRatio = brightPixels / sampledPixels;
  const coloredRatio = coloredPixels / sampledPixels;
  
  // Classification logic based on visual features
  let plasticType: keyof typeof PLASTIC_DATABASE;
  let confidence: number;
  
  // Transparent/clear = likely PET
  if (transparentRatio > 0.3 && whiteRatio < 0.2) {
    plasticType = 'PET';
    confidence = 75 + (transparentRatio * 20);
  }
  // Very white/opaque = likely HDPE
  else if (whiteRatio > 0.4 && brightRatio > 0.6) {
    plasticType = 'HDPE';
    confidence = 78 + (whiteRatio * 15);
  }
  // Light colored, not pure white = likely PP
  else if (brightRatio > 0.5 && whiteRatio < 0.4 && coloredRatio < 0.3) {
    plasticType = 'PP';
    confidence = 72 + (brightRatio * 15);
  }
  // Very light, film-like = likely LDPE
  else if (brightRatio > 0.7 && avgR > 200 && avgG > 200 && avgB > 200) {
    plasticType = 'LDPE';
    confidence = 70 + (brightRatio * 12);
  }
  // Gray tones = likely PVC
  else if (avgR > 100 && avgR < 180 && Math.abs(avgR - avgG) < 15 && Math.abs(avgG - avgB) < 15) {
    plasticType = 'PVC';
    confidence = 68 + Math.random() * 10;
  }
  // Very white, lightweight appearance = likely PS
  else if (whiteRatio > 0.5 && brightRatio > 0.7) {
    plasticType = 'PS';
    confidence = 65 + (whiteRatio * 15);
  }
  // Colored or mixed = OTHER
  else if (coloredRatio > 0.4) {
    plasticType = 'OTHER';
    confidence = 60 + (coloredRatio * 15);
  }
  // Default classification based on brightness
  else {
    const types: (keyof typeof PLASTIC_DATABASE)[] = ['PET', 'HDPE', 'PP', 'LDPE'];
    const randomIndex = Math.floor(Math.random() * types.length);
    plasticType = types[randomIndex];
    confidence = 65 + Math.random() * 15;
  }
  
  // Add some randomization for realism (within 5%)
  confidence = Math.min(98, Math.max(65, confidence + (Math.random() * 10 - 5)));
  
  const plastic = PLASTIC_DATABASE[plasticType];
  
  return {
    plasticType,
    plasticName: plastic.name,
    confidence: Math.round(confidence * 10) / 10,
    multiplier: plastic.multiplier,
    recyclable: plastic.recyclable,
    description: plastic.description,
  };
};

// Detect if image likely contains plastic
export const detectPlasticPresence = (imageData: ImageData): { hasPlastic: boolean; confidence: number } => {
  const { data } = imageData;
  
  let reflectivePixels = 0;
  let smoothRegions = 0;
  
  // Check for reflective surfaces (characteristic of plastic)
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const brightness = (r + g + b) / 3;
    
    // High brightness spots indicate reflective surfaces
    if (brightness > 220) {
      reflectivePixels++;
    }
    
    // Check for smooth color transitions (plastic characteristic)
    if (i > 16) {
      const prevR = data[i - 16];
      const prevG = data[i - 15];
      const prevB = data[i - 14];
      
      const diff = Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
      if (diff < 30) {
        smoothRegions++;
      }
    }
  }
  
  const pixelCount = data.length / 16;
  const reflectiveRatio = reflectivePixels / pixelCount;
  const smoothRatio = smoothRegions / pixelCount;
  
  // Plastic typically has smooth surfaces and some reflective areas
  const hasPlastic = reflectiveRatio > 0.05 && smoothRatio > 0.3;
  const confidence = Math.min(95, (reflectiveRatio * 100 + smoothRatio * 80));
  
  return { hasPlastic, confidence: Math.round(confidence) };
};
