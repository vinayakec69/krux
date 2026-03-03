import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Zap, AlertTriangle, CheckCircle, RotateCcw, Loader2, Shield } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { plasticClassifier } from '@/lib/advancedML';
import { fraudDetector } from '@/lib/advancedFraudDetection';

type PlasticType = 'PET' | 'HDPE' | 'PVC' | 'LDPE' | 'PP' | 'PS' | 'OTHER';

const PLASTIC_INFO: Record<PlasticType, { name: string; examples: string; color: string; coins: number }> = {
  PET: { name: 'PET (Polyethylene Terephthalate)', examples: 'Water bottles, soft drink bottles', color: '#22c55e', coins: 15 },
  HDPE: { name: 'HDPE (High-Density Polyethylene)', examples: 'Milk jugs, detergent bottles', color: '#3b82f6', coins: 12 },
  PVC: { name: 'PVC (Polyvinyl Chloride)', examples: 'Pipes, cable insulation', color: '#f59e0b', coins: 8 },
  LDPE: { name: 'LDPE (Low-Density Polyethylene)', examples: 'Plastic bags, squeeze bottles', color: '#8b5cf6', coins: 10 },
  PP: { name: 'PP (Polypropylene)', examples: 'Yogurt containers, bottle caps', color: '#ec4899', coins: 11 },
  PS: { name: 'PS (Polystyrene)', examples: 'Foam cups, packing peanuts', color: '#06b6d4', coins: 7 },
  OTHER: { name: 'Other/Mixed Plastics', examples: 'Multi-layer packaging', color: '#6b7280', coins: 5 },
};

interface ScanResult {
  type: PlasticType;
  confidence: number;
  coins: number;
}

interface FraudResult {
  isFraud: boolean;
  confidence: number;
  reason: string;
}

export function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [scanState, setScanState] = useState<'idle' | 'requesting' | 'streaming' | 'captured' | 'processing' | 'result' | 'fraud'>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [fraudResult, setFraudResult] = useState<FraudResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [allScores, setAllScores] = useState<Record<string, number>>({});
  
  const { addKrux, updateStreak } = useStore();
  
  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  const startCamera = useCallback(async () => {
    setScanState('requesting');
    setError(null);
    
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not found'));
            return;
          }
          
          const video = videoRef.current;
          
          video.onloadedmetadata = () => {
            video.play()
              .then(() => resolve())
              .catch(reject);
          };
          
          video.onerror = () => reject(new Error('Video error'));
          
          // Timeout after 10 seconds
          setTimeout(() => reject(new Error('Camera timeout')), 10000);
        });
        
        setScanState('streaming');
      }
    } catch (err) {
      console.error('Camera error:', err);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is in use by another app.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError('Failed to access camera');
      }
      
      setScanState('idle');
    }
  }, []);
  
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    setCapturedImage(imageData);
    setScanState('captured');
    
    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Start processing
    processImage(imageData);
  }, []);
  
  const processImage = async (imageData: string) => {
    setScanState('processing');
    setProgress(0);
    
    // Non-linear progress simulation (Secret #4)
    const progressSteps = [
      { target: 20, delay: 100 },
      { target: 45, delay: 150 },
      { target: 70, delay: 200 },
      { target: 82, delay: 300 },
      { target: 88, delay: 400 },
      { target: 92, delay: 500 },
      { target: 95, delay: 600 },
    ];
    
    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        setProgress(progressSteps[stepIndex].target);
        stepIndex++;
      }
    }, 200);
    
    try {
      // Run fraud detection and ML classification in parallel
      const [fraudCheck, classification] = await Promise.all([
        fraudDetector.checkForFraud(imageData),
        plasticClassifier.classify(imageData)
      ]);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      // Small delay for progress to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (fraudCheck.isFraud) {
        setFraudResult({
          isFraud: true,
          confidence: fraudCheck.confidence,
          reason: fraudCheck.reason
        });
        setScanState('fraud');
        return;
      }
      
      // Get plastic info and calculate coins
      const plasticType = classification.type;
      const baseCoins = PLASTIC_INFO[plasticType].coins;
      const confidenceMultiplier = 0.5 + (classification.confidence / 100) * 0.5;
      const earnedCoins = Math.round(baseCoins * confidenceMultiplier);
      
      setScanResult({
        type: plasticType,
        confidence: classification.confidence,
        coins: earnedCoins
      });
      
      setAllScores(classification.allScores);
      
      // Optimistic UI - add coins immediately (Secret #5)
      addKrux(earnedCoins);
      updateStreak();
      
      setScanState('result');
      
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Processing error:', err);
      setError('Failed to analyze image. Please try again.');
      setScanState('captured');
    }
  };
  
  const resetScanner = () => {
    setCapturedImage(null);
    setScanResult(null);
    setFraudResult(null);
    setError(null);
    setProgress(0);
    setAllScores({});
    setScanState('idle');
  };
  
  const retryCamera = () => {
    resetScanner();
    startCamera();
  };
  
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Scan Plastic</h1>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Shield className="w-4 h-4" />
            <span>{fraudDetector.getHistoryCount()} scans tracked</span>
          </div>
        </div>
      </div>
      
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Main Content */}
      <div className="p-4">
        {/* Camera View */}
        <div className="relative aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden mb-4 border border-gray-200">
          {/* Video element - always rendered but hidden when not streaming */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${scanState === 'streaming' ? 'block' : 'hidden'}`}
          />
          
          {/* Captured image preview */}
          {capturedImage && scanState !== 'streaming' && scanState !== 'idle' && scanState !== 'requesting' && (
            <img
              src={capturedImage}
              alt="Captured"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          
          {/* Idle State */}
          {scanState === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div
                onClick={startCamera}
                className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center cursor-pointer hover:bg-green-600 transition-all hover:scale-105 shadow-md shadow-green-200"
              >
                <Camera className="w-10 h-10 text-white" />
              </div>
              <p className="mt-6 text-gray-600 text-lg">Tap to Open Camera</p>
              <p className="mt-2 text-gray-400 text-sm">Point at plastic waste to earn KRUX</p>
            </div>
          )}
          
          {/* Requesting Permission */}
          {scanState === 'requesting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
              <p className="mt-4 text-gray-500">Requesting camera access...</p>
            </div>
          )}
          
          {/* Streaming - Scan Overlay */}
          {scanState === 'streaming' && (
            <>
              {/* Scanning frame */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-green-500/70 rounded-lg">
                  {/* Corner accents */}
                  <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-lg" />
                  <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-lg" />
                  <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-lg" />
                </div>
                
                {/* Animated scan line */}
                <div className="absolute left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-green-500 to-transparent animate-pulse"
                     style={{ top: '50%', animation: 'scan 2s ease-in-out infinite' }} />
              </div>
              
              {/* Capture Button */}
              <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                <button
                  onClick={captureImage}
                  className="flex items-center gap-2 px-8 py-4 bg-green-500 text-white font-bold rounded-full shadow-md shadow-green-200 hover:bg-green-600 transition-all duration-300"
                >
                  <Camera className="w-5 h-5" />
                  CAPTURE & ANALYZE
                </button>
              </div>
              
              {/* Hint */}
              <div className="absolute top-6 left-0 right-0 text-center">
                <p className="text-white text-sm bg-green-500/80 inline-block px-4 py-2 rounded-full">
                  Position plastic inside the frame
                </p>
              </div>
            </>
          )}
          
          {/* Processing */}
          {scanState === 'processing' && (
            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-xs">
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
                  <span className="text-green-700 font-medium">Analyzing plastic...</span>
                </div>
                
                {/* Progress bar with non-linear animation */}
                <div className="h-3 bg-green-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                <p className="text-gray-500 text-sm mt-3 text-center">
                  {progress < 30 && 'Extracting image features...'}
                  {progress >= 30 && progress < 60 && 'Running ML classification...'}
                  {progress >= 60 && progress < 85 && 'Checking for fraud...'}
                  {progress >= 85 && 'Finalizing results...'}
                </p>
              </div>
            </div>
          )}
          
          {/* Fraud Detected */}
          {scanState === 'fraud' && fraudResult && (
            <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-red-500 mb-2">Duplicate Detected!</h2>
              <p className="text-gray-500 mb-4">{fraudResult.reason}</p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-w-sm">
                <p className="text-red-500 text-sm">
                  Our fraud detection system ({fraudResult.confidence}% match) has identified this item as previously scanned.
                  Please scan a different plastic item.
                </p>
              </div>
              
              <button
                onClick={retryCamera}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-all duration-300"
              >
                <RotateCcw className="w-5 h-5" />
                Try Another Item
              </button>
            </div>
          )}
          
          {/* Error */}
          {error && scanState === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={startCamera}
                className="px-6 py-3 bg-green-500 text-white font-bold rounded-full"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
        
        {/* Result Card */}
        {scanState === 'result' && scanResult && (
          <div className="space-y-4 animate-fade-in">
            {/* Success Card */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-700">Plastic Identified!</h3>
                  <p className="text-gray-500 text-sm">{scanResult.confidence}% confidence</p>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: PLASTIC_INFO[scanResult.type].color }}
                  />
                  <div>
                    <p className="font-bold text-gray-900">{PLASTIC_INFO[scanResult.type].name}</p>
                    <p className="text-gray-500 text-sm">{PLASTIC_INFO[scanResult.type].examples}</p>
                  </div>
                </div>
              </div>
              
              {/* Coins Earned */}
              <div className="flex items-center justify-between p-4 bg-white border border-green-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <Zap className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-green-600 font-bold text-2xl">+{scanResult.coins}</p>
                    <p className="text-gray-500 text-sm">KRUX earned!</p>
                  </div>
                </div>
                <div className="text-right text-gray-400 text-sm">
                  <p>Base: {PLASTIC_INFO[scanResult.type].coins}</p>
                  <p>Confidence bonus: {Math.round((scanResult.confidence / 100) * 50)}%</p>
                </div>
              </div>
            </div>
            
            {/* ML Classification Breakdown */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Classification Scores</h4>
              <div className="space-y-3">
                {Object.entries(allScores)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, score]) => (
                    <div key={type} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: PLASTIC_INFO[type as PlasticType]?.color || '#9CA3AF' }}
                      />
                      <span className="text-gray-500 w-16 text-sm">{type}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${score * 100}%`,
                            backgroundColor: PLASTIC_INFO[type as PlasticType]?.color || '#9CA3AF'
                          }}
                        />
                      </div>
                      <span className="text-gray-400 text-sm w-12 text-right">
                        {(score * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
            
            {/* Scan Another Button */}
            <button
              onClick={retryCamera}
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Scan Another Item
            </button>
          </div>
        )}
        
        {/* Info Section */}
        {scanState === 'idle' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">How It Works</h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                  <Camera className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-gray-500 text-xs">Point camera at plastic</p>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-gray-500 text-xs">ML identifies type</p>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                  <span className="text-green-600 font-bold">K</span>
                </div>
                <p className="text-gray-500 text-xs">Earn KRUX coins</p>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h4 className="font-bold text-gray-900 mb-3">KRUX Rewards by Plastic Type</h4>
              <div className="space-y-2">
                {Object.entries(PLASTIC_INFO).map(([type, info]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: info.color }} />
                      <span className="text-gray-500 text-sm">{type}</span>
                    </div>
                    <span className="text-green-600 font-medium">{info.coins} KRUX</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-600 mb-1">Fraud Protection Active</h4>
                  <p className="text-gray-500 text-sm">
                    Our advanced system uses image fingerprinting, GPS, and device tracking to prevent duplicate scans.
                    Each plastic item can only be scanned once.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* CSS for scan animation */}
      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-100px); opacity: 0.3; }
          50% { transform: translateY(100px); opacity: 1; }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
