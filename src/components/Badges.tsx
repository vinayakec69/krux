import React, { useState, useEffect } from 'react';
import { X, Lock } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const BADGES: Badge[] = [
  { id: 'first_scan', name: 'First Scan', description: 'Complete your first scan', icon: '🎯' },
  { id: 'scan_10', name: '10 Scans', description: 'Scan 10 plastic items', icon: '♻️' },
  { id: 'scan_50', name: '50 Scans', description: 'Scan 50 plastic items', icon: '🏆' },
  { id: 'scan_100', name: '100 Scans', description: 'Scan 100 plastic items', icon: '💎' },
  { id: 'streak_7', name: '7-Day Streak', description: 'Maintain a 7-day streak', icon: '🔥' },
  { id: 'streak_30', name: '30-Day Streak', description: 'Maintain a 30-day streak', icon: '⚡' },
  { id: 'krux_100', name: '100 KRUX Earned', description: 'Earn 100 KRUX total', icon: '💰' },
  { id: 'krux_500', name: '500 KRUX Earned', description: 'Earn 500 KRUX total', icon: '🌟' },
  { id: 'eco_warrior', name: 'Eco Warrior', description: 'Reach 1000 green score', icon: '🌿' },
  { id: 'planet_savior', name: 'Planet Savior', description: 'Save 10kg of CO₂', icon: '🌍' },
];

interface BadgesProps {
  onClose?: () => void;
  compact?: boolean;
}

export const Badges: React.FC<BadgesProps> = ({ onClose, compact }) => {
  const { user, checkAndAwardBadges } = useStore();
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [celebrating, setCelebrating] = useState<string | null>(null);

  useEffect(() => {
    const earned = checkAndAwardBadges();
    if (earned.length > 0) {
      setNewBadges(earned);
      setCelebrating(earned[0]);
      setTimeout(() => setCelebrating(null), 3000);
    }
  }, []);

  const earnedBadges = user?.badges || [];

  if (compact) {
    return (
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {BADGES.map(badge => {
          const isEarned = earnedBadges.includes(badge.id);
          return (
            <div
              key={badge.id}
              className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl relative
                ${isEarned ? 'bg-green-500/20 border border-green-500/40 badge-unlock' : 'bg-[#111] border border-gray-800 grayscale opacity-40'}`}
              title={badge.name}
            >
              {badge.icon}
              {!isEarned && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
      <div className="w-full bg-[#0a0a0a] rounded-t-3xl border-t border-gray-800 max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#0a0a0a] px-4 pt-4 pb-2 flex items-center justify-between border-b border-gray-800">
          <div>
            <h2 className="text-white font-bold text-xl">Achievement Badges</h2>
            <p className="text-gray-400 text-sm">{earnedBadges.length}/{BADGES.length} earned</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 bg-[#111] rounded-xl border border-gray-800">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {celebrating && (
          <div className="mx-4 mt-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-4 border border-green-500/40 slide-up">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{BADGES.find(b => b.id === celebrating)?.icon}</span>
              <div>
                <p className="text-green-400 font-bold">Badge Unlocked! 🎉</p>
                <p className="text-white">{BADGES.find(b => b.id === celebrating)?.name}</p>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 grid grid-cols-2 gap-3">
          {BADGES.map(badge => {
            const isEarned = earnedBadges.includes(badge.id);
            const isNew = newBadges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`rounded-2xl p-4 border relative overflow-hidden
                  ${isEarned
                    ? 'bg-green-500/10 border-green-500/30 glow-green'
                    : 'bg-[#111] border-gray-800'
                  } ${isNew ? 'badge-unlock' : ''}`}
              >
                <div className={`text-4xl mb-2 ${!isEarned ? 'grayscale opacity-40' : ''}`}>
                  {badge.icon}
                </div>
                <p className={`font-bold text-sm ${isEarned ? 'text-white' : 'text-gray-600'}`}>
                  {badge.name}
                </p>
                <p className={`text-xs mt-1 ${isEarned ? 'text-gray-400' : 'text-gray-700'}`}>
                  {badge.description}
                </p>
                {!isEarned && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-gray-700" />
                  </div>
                )}
                {isEarned && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
