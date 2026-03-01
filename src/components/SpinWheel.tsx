import React, { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import { useStore } from '@/store/useStore';

const SEGMENTS = [
  { label: '5 KRUX', color: '#22c55e', textColor: '#fff' },
  { label: '10 KRUX', color: '#3b82f6', textColor: '#fff' },
  { label: '15 KRUX', color: '#a855f7', textColor: '#fff' },
  { label: '25 KRUX', color: '#f59e0b', textColor: '#000' },
  { label: '50 KRUX', color: '#ef4444', textColor: '#fff' },
  { label: '2x Scan', color: '#06b6d4', textColor: '#fff' },
  { label: 'Freeze ❄️', color: '#6366f1', textColor: '#fff' },
  { label: '100 KRUX', color: '#39FF14', textColor: '#000' },
];

const NUM_SEGMENTS = SEGMENTS.length;
const SEG_ANGLE = 360 / NUM_SEGMENTS;

interface SpinWheelProps {
  onClose?: () => void;
}

function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const now = new Date();
      const tomorrow = new Date(targetDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      if (diff <= 0) { setTimeLeft('Available!'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

export const SpinWheel: React.FC<SpinWheelProps> = ({ onClose }) => {
  const { user, spinWheel } = useStore();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ reward: string; krux: number; type: string } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const today = new Date().toDateString();
  const canSpin = !user?.lastSpinDate || user.lastSpinDate !== today;
  const countdown = useCountdown(canSpin ? null : user?.lastSpinDate || null);

  useEffect(() => {
    drawWheel(rotation);
  }, [rotation]);

  function drawWheel(rot: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = cx - 8;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    SEGMENTS.forEach((seg, i) => {
      const startAngle = ((rot + i * SEG_ANGLE - 90) * Math.PI) / 180;
      const endAngle = ((rot + (i + 1) * SEG_ANGLE - 90) * Math.PI) / 180;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(((rot + i * SEG_ANGLE + SEG_ANGLE / 2 - 90) * Math.PI) / 180);
      ctx.textAlign = 'right';
      ctx.fillStyle = seg.textColor;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(seg.label, radius - 10, 4);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.strokeStyle = '#39FF14';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function handleSpin() {
    if (spinning || !canSpin) return;
    setSpinning(true);
    setShowResult(false);
    setResult(null);

    const spinResult = spinWheel();
    if (!spinResult) { setSpinning(false); return; }

    // Determine which segment index corresponds to result
    const segIndex = SEGMENTS.findIndex(s => s.label.includes(spinResult.reward.split(' ')[0]) || spinResult.reward.includes(s.label.split(' ')[0]));
    const targetIndex = segIndex >= 0 ? segIndex : 0;

    // Calculate final rotation: multiple full spins + land on target segment
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const targetAngle = 360 - (targetIndex * SEG_ANGLE + SEG_ANGLE / 2);
    const finalRotation = rotation + extraSpins * 360 + targetAngle;

    // Animate
    const duration = 4000;
    const startTime = Date.now();
    const startRot = rotation;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic bezier ease-out
      const ease = 1 - Math.pow(1 - progress, 4);
      const currentRot = startRot + (finalRotation - startRot) * ease;

      setRotation(currentRot % 360);
      drawWheel(currentRot % 360);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setResult(spinResult);
        setShowResult(true);
      }
    };

    requestAnimationFrame(animate);
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0a0a0a] rounded-3xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-xl">Daily Spin</h2>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 text-sm hover:text-white">✕</button>
          )}
        </div>

        {/* Pointer */}
        <div className="relative flex justify-center mb-2">
          <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-[#39FF14] z-10 absolute top-0" style={{ filter: 'drop-shadow(0 0 8px #39FF14)' }} />
          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            className="rounded-full"
            style={{ marginTop: '18px' }}
          />
        </div>

        {showResult && result && (
          <div className="mt-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-4 border border-green-500/40 text-center badge-unlock">
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-green-400 font-bold text-lg">{result.reward}</p>
            {result.krux > 0 && (
              <div className="flex items-center justify-center gap-1 text-white mt-1">
                <Zap className="w-4 h-4 text-green-400" />
                <span className="font-bold">+{result.krux} KRUX added!</span>
              </div>
            )}
          </div>
        )}

        {!canSpin && !showResult && (
          <div className="mt-4 text-center">
            <p className="text-gray-400 text-sm">Come back tomorrow</p>
            <p className="text-white font-bold mt-1">{countdown}</p>
          </div>
        )}

        <button
          onClick={handleSpin}
          disabled={spinning || !canSpin}
          className={`w-full mt-4 py-4 rounded-2xl font-bold text-lg transition-all
            ${canSpin && !spinning
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white pop-out-btn'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
        >
          {spinning ? '🌀 Spinning...' : canSpin ? '🎰 SPIN NOW!' : '⏰ Already Spun'}
        </button>
      </div>
    </div>
  );
};
