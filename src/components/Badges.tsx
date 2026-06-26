import React, { useEffect, useState } from 'react';
import { useStore, ALL_BADGES } from '@/store/useStore';

export const Badges: React.FC = () => {
  const { user, dismissNewBadge, newBadge } = useStore();
  const [celebrating, setCelebrating] = useState<string | null>(null);

  useEffect(() => {
    if (newBadge) {
      setCelebrating(newBadge);
      const t = setTimeout(() => {
        setCelebrating(null);
        dismissNewBadge();
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [newBadge, dismissNewBadge]);

  const earned = user?.badges || [];

  return (
    <>
      {/* Badge unlock popup */}
      {celebrating && ALL_BADGES[celebrating] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="badge-unlock bg-white border border-green-300 rounded-3xl p-6 text-center mx-4 shadow-xl">
            <div className="text-5xl mb-3 sparkle">{ALL_BADGES[celebrating].emoji}</div>
            <p className="text-green-600 font-bold text-lg">Badge Unlocked!</p>
            <p className="text-gray-900 font-bold">{ALL_BADGES[celebrating].label}</p>
            <p className="text-gray-500 text-sm mt-1">{ALL_BADGES[celebrating].desc}</p>
          </div>
        </div>
      )}

      {/* Horizontal scroll badge section */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {Object.entries(ALL_BADGES).map(([id, badge]) => {
          const isUnlocked = earned.includes(id);
          return (
            <div
              key={id}
              className={`flex-shrink-0 w-20 flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all ${
                isUnlocked
                  ? 'bg-green-100 border-green-300 shadow-sm'
                  : 'bg-gray-100 border-gray-200 opacity-60'
              }`}
            >
              <span className={`text-2xl ${isUnlocked ? 'sparkle' : 'grayscale'}`}>
                {badge.emoji}
              </span>
              <span className={`text-xs font-medium text-center leading-tight ${isUnlocked ? 'text-gray-900' : 'text-gray-400'}`}>
                {badge.label}
              </span>
              {!isUnlocked && <span className="text-gray-400 text-xs">🔒</span>}
            </div>
          );
        })}
      </div>
    </>
  );
};
