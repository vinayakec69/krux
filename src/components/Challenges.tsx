import React from 'react';
import { Zap, CheckCircle } from 'lucide-react';
import { useStore, DAILY_CHALLENGES, WEEKLY_CHALLENGE } from '@/store/useStore';

export const Challenges: React.FC = () => {
  const { user } = useStore();
  const progress = user?.challengeProgress || {};

  const allChallenges = [
    ...DAILY_CHALLENGES,
    { ...WEEKLY_CHALLENGE, isWeekly: true },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-900 font-bold flex items-center gap-2">
          🎯 Daily Challenges
        </h3>
        <span className="text-gray-400 text-xs">Resets midnight</span>
      </div>

      <div className="space-y-3">
        {allChallenges.map(challenge => {
          const current = Math.min(progress[challenge.id] || 0, challenge.target);
          const pct = Math.round((current / challenge.target) * 100);
          const done = current >= challenge.target;
          const isWeekly = 'isWeekly' in challenge && challenge.isWeekly;

          return (
            <div key={challenge.id} className={`rounded-xl p-3 ${isWeekly ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {done ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  )}
                  <span className={`text-sm font-medium ${done ? 'text-green-600 line-through' : 'text-gray-900'}`}>
                    {challenge.label}
                  </span>
                  {isWeekly && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Weekly</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                  <Zap className="w-3 h-3" />+{challenge.reward}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-green-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full progress-fill ${done ? 'bg-green-500' : 'bg-green-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-gray-400 text-xs w-16 text-right">
                  {current}/{challenge.target}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
