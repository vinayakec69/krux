import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Zap } from 'lucide-react';
import { useStore } from '@/store/useStore';

const PRIZES = [5, 10, 15, 20, 25, 30, 50, 100];

// Animation constants
const SPIN_DURATION_MS = 5000;
const MIN_EXTRA_SPINS = 6;
const EXTRA_SPINS_RANGE = 2;
const CONFETTI_PARTICLE_COUNT = 45;
const CONFETTI_GRAVITY = 0.18;
const CONFETTI_FADE_RATE = 0.016;

// Monochromatic green segments (light → dark)
const SEGMENT_COLORS = [
  '#F0FDF4', // green-50
  '#DCFCE7', // green-100
  '#BBF7D0', // green-200
  '#86EFAC', // green-300
  '#4ADE80', // green-400
  '#22C55E', // green-500
  '#16A34A', // green-600
  '#15803D', // green-700
];

// Text: dark on light segments, white on dark segments
const TEXT_COLORS = [
  '#14532D', '#14532D', '#14532D', '#14532D',
  '#14532D', '#FFFFFF', '#FFFFFF', '#FFFFFF',
];

const SEGMENTS = PRIZES.length;
const SEGMENT_ANGLE = (2 * Math.PI) / SEGMENTS;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  alpha: number; color: string;
  size: number; rotation: number;
}

// Ease-out quartic-like: fast start, very slow finish (cubic-bezier(0.2, 0.8, 0.3, 1) approximation)
function easeOutQuartic(t: number): number {
  return 1 - Math.pow(1 - t, 3.5);
}

export const SpinWheel: React.FC = () => {
  const { user, claimSpinReward } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const pointerScaleRef = useRef(1);
  const pointerFrameRef = useRef<number>(0);

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [prizeCount, setPrizeCount] = useState(0);
  const [showPrize, setShowPrize] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [winSegment, setWinSegment] = useState<number | null>(null);
  const [, forceUpdate] = useState(0);

  const today = new Date().toDateString();
  const alreadySpun = user?.lastSpinDate === today;

  // Countdown timer
  useEffect(() => {
    if (!alreadySpun) return;
    const updateTimer = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${hours}h ${minutes}m`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [alreadySpun]);

  const drawWheel = useCallback((currentAngle: number, highlightSegment: number | null = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(cx, cy) - 10;

    ctx.clearRect(0, 0, width, height);

    // Outer shadow ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(34,197,94,0.12)';
    ctx.fill();
    ctx.restore();

    // Draw segments
    for (let i = 0; i < SEGMENTS; i++) {
      const start = currentAngle + i * SEGMENT_ANGLE;
      const end = start + SEGMENT_ANGLE;
      const isHighlighted = highlightSegment === i;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();

      if (alreadySpun && highlightSegment === null) {
        ctx.fillStyle = '#D1D5DB';
        ctx.globalAlpha = 0.5;
      } else if (isHighlighted) {
        ctx.fillStyle = SEGMENT_COLORS[i];
        ctx.shadowColor = '#22C55E';
        ctx.shadowBlur = 20;
      } else {
        ctx.fillStyle = SEGMENT_COLORS[i];
      }
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Prize label
      ctx.save();
      if (alreadySpun && highlightSegment === null) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#6B7280';
      } else {
        ctx.fillStyle = TEXT_COLORS[i];
      }
      ctx.translate(cx, cy);
      ctx.rotate(start + SEGMENT_ANGLE / 2);
      ctx.textAlign = 'right';
      ctx.font = `bold 12px sans-serif`;
      ctx.fillText(`${PRIZES[i]}`, r - 14, 5);
      ctx.restore();
    }

    // Tick marks at segment boundaries
    ctx.save();
    for (let i = 0; i < SEGMENTS; i++) {
      const tickAngle = currentAngle + i * SEGMENT_ANGLE;
      const x1 = cx + (r - 4) * Math.cos(tickAngle);
      const y1 = cy + (r - 4) * Math.sin(tickAngle);
      const x2 = cx + (r + 2) * Math.cos(tickAngle);
      const y2 = cy + (r + 2) * Math.sin(tickAngle);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();

    // Center circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, 2 * Math.PI);
    const grad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 24);
    grad.addColorStop(0, '#F0FDF4');
    grad.addColorStop(1, '#DCFCE7');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#15803D';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KRUX', cx, cy);
    ctx.restore();

    // Pointer at top — pointing downward into wheel
    const pScale = pointerScaleRef.current;
    ctx.save();
    ctx.translate(cx, cy - r - 4);
    ctx.scale(pScale, pScale);
    ctx.shadowColor = '#22C55E';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, 8);           // tip (pointing down)
    ctx.lineTo(-10, -10);       // left
    ctx.lineTo(10, -10);        // right
    ctx.closePath();
    ctx.fillStyle = '#16A34A';
    ctx.fill();
    ctx.restore();
  }, [alreadySpun]);

  // Initial draw
  useEffect(() => {
    drawWheel(angleRef.current, winSegment);
  }, [drawWheel, winSegment]);

  const launchConfetti = () => {
    const cc = confettiCanvasRef.current;
    if (!cc) return;
    const ctx = cc.getContext('2d');
    if (!ctx) return;
    const { width, height } = cc;
    const cx = width / 2;
    const cy = height / 2;
    const colors = ['#86EFAC', '#4ADE80', '#22C55E', '#16A34A', '#BBF7D0', '#DCFCE7'];
    const particles: Particle[] = [];

    for (let i = 0; i < CONFETTI_PARTICLE_COUNT; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const speed = 3 + Math.random() * 6;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        rotation: Math.random() * 360,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      let alive = false;
      particles.forEach(p => {
        if (p.alpha <= 0) return;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += CONFETTI_GRAVITY;
        p.alpha -= CONFETTI_FADE_RATE;
        p.rotation += 6;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });
      if (alive) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, width, height);
    };
    requestAnimationFrame(animate);
  };

  // Animate pointer bounce/tick at segment crossings
  const animatePointerBounce = (big = false) => {
    cancelAnimationFrame(pointerFrameRef.current);
    const peak = big ? 1.3 : 1.12;
    const start = performance.now();
    const dur = big ? 400 : 100;
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      // scale: 1 → peak → 1
      const s = t < 0.5 ? 1 + (peak - 1) * (t / 0.5) : peak - (peak - 1) * ((t - 0.5) / 0.5);
      pointerScaleRef.current = s;
      drawWheel(angleRef.current, winSegment);
      if (t < 1) pointerFrameRef.current = requestAnimationFrame(tick);
      else pointerScaleRef.current = 1;
    };
    pointerFrameRef.current = requestAnimationFrame(tick);
  };

  const handleSpin = () => {
    if (spinning || alreadySpun) return;
    setResult(null);
    setShowPrize(false);
    setPrizeCount(0);
    setWinSegment(null);
    setSpinning(true);

    // Pre-determine prize and target angle
    const prizeIndex = Math.floor(Math.random() * SEGMENTS);
    const prize = PRIZES[prizeIndex];

    // The pointer is at the top (angle = -π/2 in canvas coords).
    // Segment i center is at: angle + (i + 0.5) * segmentAngle
    // We want: targetAngle + (prizeIndex + 0.5) * segmentAngle ≡ -π/2 (mod 2π)
    // => targetAngle = -π/2 - (prizeIndex + 0.5) * segmentAngle
    const extraSpins = MIN_EXTRA_SPINS + Math.random() * EXTRA_SPINS_RANGE;
    const desiredAngle = -Math.PI / 2 - (prizeIndex + 0.5) * SEGMENT_ANGLE;
    const startAngle = angleRef.current;
    // Find target that is desiredAngle + k*2π, k chosen so we spin forward by ~extraSpins turns
    const turnsNeeded = Math.ceil((startAngle - desiredAngle) / (2 * Math.PI)) + extraSpins;
    const targetAngle = desiredAngle + turnsNeeded * 2 * Math.PI;

    const duration = SPIN_DURATION_MS;
    const startTime = performance.now();
    let lastSegment = -1;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutQuartic(t);
      const current = startAngle + (targetAngle - startAngle) * eased;
      angleRef.current = current;
      drawWheel(current, null);

      // Detect segment crossings for tick effect
      // Which segment is at the pointer (top = -π/2)?
      const relAngle = ((-Math.PI / 2 - current) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const currentSeg = Math.floor(relAngle / SEGMENT_ANGLE) % SEGMENTS;
      if (currentSeg !== lastSegment && t > 0.05 && t < 0.95) {
        lastSegment = currentSeg;
        animatePointerBounce(false);
      }

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        angleRef.current = targetAngle;
        setSpinning(false);
        setWinSegment(prizeIndex);
        // Pointer big bounce on stop
        animatePointerBounce(true);
        // Claim reward
        claimSpinReward(prize);
        setResult(prize);
        setShowPrize(true);
        launchConfetti();
        forceUpdate(n => n + 1);
        // Count-up animation
        let count = 0;
        const step = Math.max(1, Math.ceil(prize / 20));
        const countInterval = setInterval(() => {
          count = Math.min(count + step, prize);
          setPrizeCount(count);
          if (count >= prize) clearInterval(countInterval);
        }, 50);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  // Cleanup
  useEffect(() => () => {
    cancelAnimationFrame(animFrameRef.current);
    cancelAnimationFrame(pointerFrameRef.current);
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-900 font-bold">🎡 Daily Spin</h3>
        {alreadySpun && (
          <div className="flex items-center gap-1 text-gray-400 text-xs">
            <span>⏳</span>
            <span>Next spin in {timeLeft}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Canvas stack */}
        <div className="relative" style={{ width: 240, height: 240 }}>
          <canvas
            ref={canvasRef}
            width={240}
            height={240}
            className="absolute inset-0"
            style={{ opacity: alreadySpun && !winSegment ? 0.5 : 1 }}
          />
          {/* Confetti overlay */}
          <canvas
            ref={confettiCanvasRef}
            width={240}
            height={240}
            className="absolute inset-0 pointer-events-none"
          />
        </div>

        {/* Prize reveal */}
        {showPrize && result !== null && (
          <div className="flex flex-col items-center gap-1 pop">
            <div className="flex items-center gap-2 text-green-600 font-bold text-2xl">
              <Zap className="w-6 h-6" />
              +{prizeCount} KRUX!
            </div>
            <p className="text-gray-500 text-sm">Added to your balance 🎉</p>
          </div>
        )}

        {/* Cooldown breathing timer */}
        {alreadySpun && !showPrize && (
          <div className="text-center">
            <p className="text-gray-400 text-sm animate-pulse">
              ⏳ Next spin in {timeLeft}
            </p>
          </div>
        )}

        <button
          onClick={handleSpin}
          disabled={spinning || alreadySpun}
          className={`w-full py-3 rounded-xl font-bold transition-all duration-300 ${
            spinning || alreadySpun
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 text-white pop-out-btn'
          }`}
        >
          {spinning ? '🌀 Spinning...' : alreadySpun ? '✅ Spun Today' : '🎰 Spin Now!'}
        </button>
      </div>
    </div>
  );
};
