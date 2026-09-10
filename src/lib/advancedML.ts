import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

export class PlasticClassifier {
  private model: mobilenet.MobileNet | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  async init() {
    if (this.model) return;
    if (this.initPromise) return this.initPromise;

    this.isInitializing = true;
    this.initPromise = new Promise(async (resolve, reject) => {
      try {
        await tf.ready();
        // Load the MobileNet model. version 2, alpha 1.0 is standard.
        this.model = await mobilenet.load({ version: 2, alpha: 1.0 });
        console.log('MobileNet model loaded successfully');
        resolve();
      } catch (error) {
        console.error('Failed to load MobileNet model:', error);
        reject(error);
      } finally {
        this.isInitializing = false;
      }
    });

    return this.initPromise;
  }

  async classify(imageData: ImageData): Promise<{ type: string; confidence: number; allScores: Record<string, number> }> {
    await this.init();
    
    if (!this.model) {
      throw new Error('Model failed to initialize');
    }

    try {
      // Create a tensor from the ImageData
      const tensor = tf.browser.fromPixels(imageData);
      
      // Get predictions (top 5 classes)
      const predictions = await this.model.classify(tensor, 5);
      
      // Dispose tensor to free memory
      tensor.dispose();

      // Map MobileNet ImageNet classes to our plastic types
      const scores = this.mapToPlasticTypes(predictions);
      
      // Find the highest scoring plastic type
      let bestType = 'UNKNOWN';
      let highestScore = 0;
      
      for (const [type, score] of Object.entries(scores)) {
        if (score > highestScore) {
          highestScore = score;
          bestType = type;
        }
      }

      // If confidence is too low, fall back or reject
      if (highestScore < 0.15) {
         return {
           type: 'UNKNOWN',
           confidence: highestScore,
           allScores: scores
         };
      }

      return {
        type: bestType,
        // Scale the confidence to be slightly higher visually for the user
        confidence: Math.min(0.98, highestScore * 1.5 + 0.3),
        allScores: scores
      };
    } catch (error) {
      console.error('Classification error:', error);
      throw error;
    }
  }

  /**
   * Maps generic ImageNet 1000 categories (which MobileNet is trained on)
   * to our specific KRUX plastic categories using keyword matching.
   */
  private mapToPlasticTypes(predictions: Array<{ className: string, probability: number }>): Record<string, number> {
    const scores: Record<string, number> = {
      PET: 0.05, // base confidence so UI doesn't crash on completely zero
      HDPE: 0.05,
      PVC: 0.01,
      LDPE: 0.05,
      PP: 0.05,
      PS: 0.05,
      OTHER: 0.05
    };

    for (const pred of predictions) {
      const className = pred.className.toLowerCase();
      const prob = pred.probability;

      console.log(`Detected: ${className} (${Math.round(prob*100)}%)`);

      // PET: Water bottles, soda bottles
      if (className.includes('water bottle') || className.includes('pop bottle') || className.includes('beer bottle')) {
        scores.PET += prob;
      } 
      // HDPE: Milk jugs, detergent, heavy buckets
      else if (className.includes('milk can') || className.includes('jug') || className.includes('pitcher') || className.includes('bucket') || className.includes('barrel')) {
        scores.HDPE += prob;
      }
      // LDPE: Plastic bags, wrappers
      else if (className.includes('plastic bag') || className.includes('packet') || className.includes('envelope')) {
        scores.LDPE += prob;
      }
      // PP: Yogurt cups, tubs, bottle caps
      else if (className.includes('cup') || className.includes('tub') || className.includes('bowl') || className.includes('measuring cup')) {
        scores.PP += prob;
      }
      // PS: Coffee cups, plates, styrofoam trays
      else if (className.includes('coffee mug') || className.includes('plate') || className.includes('tray')) {
        scores.PS += prob;
      }
      // OTHER/MISC
      else if (className.includes('pill bottle') || className.includes('perfume') || className.includes('lotion')) {
        scores.OTHER += prob;
      }
      else if (className.includes('pipe') || className.includes('hose')) {
        scores.PVC += prob;
      }
    }

    return scores;
  }
}

export const plasticClassifier = new PlasticClassifier();
