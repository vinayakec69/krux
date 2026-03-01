import React, { useRef, useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { useStore } from '@/store/useStore';

const PRIZES = [5, 10, 15, 20, 25, 30, 50, 100];
const COLORS = ['#39FF14', '#BF00FF', '#22c55e', '#8b5cf6', '#39FF14', '#BF00FF', '#22c55e', '#8b5cf6'];
const SEGMENTS = PRIZES.length;
const SEGMENT_ANGLE = (2 * Math.PI) / SEGMENTS;

export const SpinWheel: React.FC = () => {
  const { user, spinWheel } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [angle, setAngle] = useState(0);

  const today = new Date().toDateString();
  const alreadySpun = user?.lastSpinDate === today;

  const drawWheel = (currentAngle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(cx, cy) - 6;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < SEGMENTS; i++) {
      const start = currentAngle + i * SEGMENT_ANGLE;
      const end = start + SEGMENT_ANGLE;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i];
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + SEGMENT_ANGLE / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`${PRIZES[i]}`, r - 10, 5);
      ctx.restore();
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.strokeStyle = '#39FF14';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pointer
    ctx.beginPath();
    ctx.moveTo(cx + r + 6, cy);
    ctx.lineTo(cx + r - 10, cy - 10);
    ctx.lineTo(cx + r - 10, cy + 10);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
  };

  useEffect(() => {
    drawWheel(angle);
  }, [angle]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSpin = () => {
    if (spinning || alreadySpun) return;
    setResult(null);
    setSpinning(true);

    const extraSpins = 5 + Math.random() * 5; // 5-10 full rotations
    const targetAngle = angle + extraSpins * 2 * Math.PI;
    const duration = 4000;
    const start = performance.now();
    const startAngle = angle;

    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // Ease out
      const eased = 1 - Math.pow(1 - t, 4);
      const current = startAngle + (targetAngle - startAngle) * eased;
      setAngle(current);
      drawWheel(current);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        const prize = spinWheel();
        setResult(prize);
      }
    };

    requestAnimationFrame(animate);
  };

  return (
    <div className="bg-[#111] rounded-2xl border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold">🎡 Daily Spin</h3>
        {alreadySpun && <span className="text-gray-500 text-xs">Come back tomorrow!</span>}
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={220}
            height={220}
            className="rounded-full"
          />
        </div>

        {result !== null && (
          <div className="flex items-center gap-2 text-green-400 font-bold text-xl pop animate-bounce">
            <Zap className="w-6 h-6" />
            +{result} KRUX won!
          </div>
        )}

        <button
          onClick={handleSpin}
          disabled={spinning || alreadySpun}
          className={`w-full py-3 rounded-xl font-bold text-black transition-all ${
            spinning || alreadySpun
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-[#39FF14] pop-out-btn'
          }`}
        >
          {spinning ? '🌀 Spinning...' : alreadySpun ? '✅ Spun Today' : '🎰 Spin Now!'}
        </button>
      </div>
    </div>
  );
};
