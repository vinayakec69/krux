import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface DailyChallenge {
  id: string;
  label: string;
  bonus: number;
  target: number;
  emoji: string;
}

const DAILY_CHALLENGES: DailyChallenge[] = [
  { id: 'scan_3', label: 'Scan 3 plastics today', bonus: 25, target: 3, emoji: '♻️' },
  { id: 'scan_pet', label: 'Scan a PET bottle', bonus: 15, target: 1, emoji: '🍶' },
  { id: 'open_app', label: 'Open the app today', bonus: 5, target: 1, emoji: '📱' },
];

const WEEKLY_TARGET = 10;

function useCountdown(targetMidnight: boolean) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const target = new Date();
      if (targetMidnight) {
        target.setHours(24, 0, 0, 0);
      } else {
        // next Sunday midnight
        target.setDate(target.getDate() + (7 - target.getDay()));
        target.setHours(0, 0, 0, 0);
      }
      const diff = target.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMidnight]);
  return timeLeft;
}

interface ChallengesProps {
  compact?: boolean;
}

export const Challenges: React.FC<ChallengesProps> = ({ compact }) => {
  const { user } = useStore();
  const dailyCountdown = useCountdown(true);
  const weeklyCountdown = useCountdown(false);

  const progress = user?.challengeProgress || {};
  const weeklyProgress = Math.min(user?.weeklyChallengeProgress || 0, WEEKLY_TARGET);

  if (compact) {
    const completedCount = DAILY_CHALLENGES.filter(c => (progress[c.id] || 0) >= c.target).length;
    return (
      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl p-4 border border-blue-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <h3 className="text-white font-bold text-sm">Daily Challenges</h3>
          </div>
          <div className="flex items-center gap-1 text-gray-400 text-xs">
            <Clock className="w-3 h-3" />
            <span>{dailyCountdown}</span>
          </div>
        </div>
        <div className="space-y-2">
          {DAILY_CHALLENGES.map(challenge => {
            const current = Math.min(progress[challenge.id] || 0, challenge.target);
            const done = current >= challenge.target;
            const pct = Math.round((current / challenge.target) * 100);
            return (
              <div key={challenge.id} className="flex items-center gap-2">
                <span className="text-sm">{challenge.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${done ? 'text-green-400' : 'text-gray-300'}`}>
                      {challenge.label}
                    </span>
                    {done ? (
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 pop-animation" />
                    ) : (
                      <span className="text-xs text-gray-500">{current}/{challenge.target}</span>
                    )}
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-green-500' : 'bg-blue-500 fast-progress'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-yellow-400 font-bold">+{challenge.bonus}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-purple-400 font-medium">📅 Weekly: Scan 10 plastics</span>
            <span className="text-xs text-gray-500">{weeklyProgress}/10</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-purple-500 transition-all duration-500 ${weeklyProgress >= 10 ? '' : 'fast-progress'}`}
              style={{ width: `${Math.round((weeklyProgress / 10) * 100)}%` }}
            />
          </div>
          {weeklyProgress >= 10 && (
            <p className="text-xs text-purple-400 mt-1">✅ Completed! +100 KRUX earned</p>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-2 text-center">
          {completedCount}/{DAILY_CHALLENGES.length} done · Resets in {dailyCountdown}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 mb-6">
      <h3 className="text-gray-400 text-sm mb-3 font-medium">Daily Challenges</h3>
      <div className="bg-[#111] rounded-2xl border border-gray-800 p-4 space-y-4">
        {DAILY_CHALLENGES.map(challenge => {
          const current = Math.min(progress[challenge.id] || 0, challenge.target);
          const done = current >= challenge.target;
          const pct = Math.round((current / challenge.target) * 100);
          return (
            <div key={challenge.id}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{challenge.emoji}</span>
                  <span className={`text-sm font-medium ${done ? 'text-green-400' : 'text-white'}`}>
                    {challenge.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-yellow-400 font-bold">+{challenge.bonus} KRUX</span>
                  {done && <CheckCircle className="w-5 h-5 text-green-400" />}
                </div>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${done ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-gray-500 text-xs mt-1">{current}/{challenge.target}</p>
            </div>
          );
        })}

        <div className="pt-3 border-t border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">📅</span>
              <span className={`text-sm font-medium ${weeklyProgress >= 10 ? 'text-green-400' : 'text-white'}`}>
                Scan 10 plastics this week
              </span>
            </div>
            <span className="text-xs text-purple-400 font-bold">+100 KRUX</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-700"
              style={{ width: `${Math.round((weeklyProgress / 10) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{weeklyProgress}/10</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Resets in {weeklyCountdown}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
