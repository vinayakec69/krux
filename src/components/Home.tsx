import React, { useState, useEffect } from 'react';
import {
  Camera, ShoppingBag, Trophy, BarChart2,
  Zap, Flame, ChevronRight,
  Snowflake, AlertTriangle, Star, Leaf,
} from 'lucide-react';
import { useStore, XP_PER_LEVEL, LEVEL_NAMES, ALL_BADGES } from '@/store/useStore';
import { CoinBalanceSkeleton } from '@/components/SkeletonLoader';
import { Badges } from '@/components/Badges';
import { Challenges } from '@/components/Challenges';
import { SpinWheel } from '@/components/SpinWheel';
import { Referral } from '@/components/Referral';
import { Sidebar } from '@/components/Sidebar';

interface HomeProps {
  onNavigate: (tab: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const {
    user, showRewardAnimation, leaderboard,
    buyStreakFreeze, levelUpTo, dismissLevelUp,
  } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [coinAnimating, setCoinAnimating] = useState(false);
  const [freezeBought, setFreezeBought] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [spinModalOpen, setSpinModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showRewardAnimation) {
      setCoinAnimating(true);
      setTimeout(() => setCoinAnimating(false), 300);
    }
  }, [showRewardAnimation]);

  const quickActions = [
    { id: 'scan',        icon: <Camera className="w-6 h-6" />,      label: 'Scan',  color: 'bg-green-500' },
    { id: 'shop',        icon: <ShoppingBag className="w-6 h-6" />, label: 'Shop',  color: 'bg-green-600' },
    { id: 'leaderboard', icon: <Trophy className="w-6 h-6" />,      label: 'Ranks', color: 'bg-green-700' },
    { id: 'dashboard',   icon: <BarChart2 className="w-6 h-6" />,   label: 'Stats', color: 'bg-green-800' },
  ];

  // XP / level helpers
  const level = user?.level ?? 1;
  const xp = user?.xp ?? 0;
  const currentLevelXp = XP_PER_LEVEL[level - 1] ?? 0;
  const nextLevelXp = XP_PER_LEVEL[level] ?? XP_PER_LEVEL[XP_PER_LEVEL.length - 1];
  const xpInLevel = xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const xpPct = Math.min(Math.round((xpInLevel / xpNeeded) * 100), 100);
  const levelName = LEVEL_NAMES[level - 1] ?? 'Legend';

  // Streak at risk: after 8 PM if no scan today
  const hour = new Date().getHours();
  const scannedToday = user?.lastScanDate === new Date().toDateString();
  const streakAtRisk = hour >= 20 && !scannedToday && (user?.streak ?? 0) > 0;

  const handleBuyFreeze = () => {
    const ok = buyStreakFreeze();
    if (ok) { setFreezeBought(true); setTimeout(() => setFreezeBought(false), 2000); }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onNavigate={onNavigate} />

      {/* Spin Wheel Modal */}
      {spinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-gray-900/60" onClick={() => setSpinModalOpen(false)} />
          <div className="relative w-full bg-white rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-900 font-bold text-xl">🎡 Daily Spin</h2>
              <button
                onClick={() => setSpinModalOpen(false)}
                className="p-2 bg-gray-100 rounded-xl text-gray-500 font-bold"
              >
                ✕
              </button>
            </div>
            <SpinWheel />
          </div>
        </div>
      )}

      {/* Level-up celebration overlay */}
      {levelUpTo !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="level-up bg-white border border-green-200 rounded-3xl p-8 text-center mx-6 shadow-xl">
            <div className="text-6xl mb-3">⬆️</div>
            <p className="text-green-600 font-bold text-2xl">Level Up!</p>
            <p className="text-gray-900 font-bold text-xl">Level {levelUpTo}</p>
            <p className="text-gray-500">{LEVEL_NAMES[(levelUpTo ?? 1) - 1]}</p>
            <button
              onClick={dismissLevelUp}
              className="mt-4 px-6 py-2 bg-green-500 text-white font-bold rounded-xl pointer-events-auto"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 bg-green-100 rounded-xl border border-green-200 hover:bg-green-200 transition-colors duration-200"
              aria-label="Open menu"
            >
              <Leaf className="w-5 h-5 text-green-600" />
            </button>
            <div>
              <p className="text-gray-500 text-sm">Welcome back,</p>
              <h2 className="text-gray-900 font-bold text-lg">{user?.name || 'Eco Hero'}</h2>
            </div>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">
            {user?.avatar || '🌱'}
          </div>
        </div>

        {/* ── Balance card ── */}
        {isLoading ? (
          <CoinBalanceSkeleton />
        ) : (
          <div className={`bg-green-500 rounded-3xl p-6 relative overflow-hidden ${coinAnimating ? 'coin-pulse' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm mb-1">Your KRUX Balance</p>
                <div className="flex items-baseline gap-2">
                  <Zap className="w-8 h-8 text-white" />
                  <span className="text-5xl font-bold text-white">
                    {user?.kruxBalance || 0}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-green-100 mb-1">
                  <Flame className="w-4 h-4" />
                  <span className="font-bold">{user?.streak || 0} day</span>
                </div>
                <p className="text-green-200 text-xs">streak</p>
                {(user?.streakFreezes ?? 0) > 0 && (
                  <div className="flex items-center justify-end gap-1 mt-1">
                    {Array.from({ length: user?.streakFreezes ?? 0 }).map((_, i) => (
                      <Snowflake key={i} className="w-3 h-3 text-green-200" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {showRewardAnimation && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="reward-burst bg-white/20 rounded-full w-32 h-32" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Level / XP bar ── */}
      <div className="px-4 mt-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-green-500" />
              <span className="text-gray-900 font-bold text-sm">Lv.{level} {levelName}</span>
            </div>
            <span className="text-gray-400 text-xs">{xpInLevel} / {xpNeeded} XP</span>
          </div>
          <div className="h-3 bg-green-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full progress-fill transition-all duration-500"
              style={{ width: `${xpPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Streak + Freeze ── */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame className="w-7 h-7 text-amber-500 streak-fire" />
            <div>
              <p className="text-gray-900 font-bold">{user?.streak || 0}-Day Streak</p>
              <p className="text-gray-500 text-xs">Freezes: {user?.streakFreezes ?? 0}/3</p>
            </div>
          </div>
          <button
            onClick={handleBuyFreeze}
            disabled={(user?.streakFreezes ?? 0) >= 3}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
              (user?.streakFreezes ?? 0) >= 3
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : freezeBought
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
            }`}
          >
            <Snowflake className="w-4 h-4" />
            {freezeBought ? 'Bought!' : '50 KRUX'}
          </button>
        </div>
      </div>

      {/* ── Streak at risk warning ── */}
      {streakAtRisk && (
        <div className="px-4 mb-4">
          <div className="shake bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-amber-600 font-bold text-sm">Streak at Risk! 🔥</p>
              <p className="text-gray-500 text-xs">Scan before midnight to keep your streak!</p>
            </div>
            <button
              onClick={() => onNavigate('scan')}
              className="px-3 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl"
            >
              Scan Now
            </button>
          </div>
        </div>
      )}

      {/* ── Challenges card ── */}
      <div className="px-4 mb-6">
        <Challenges />
      </div>

      {/* ── Main Scan Button ── */}
      <div className="px-4 mb-8">
        <button
          onClick={() => onNavigate('scan')}
          className="w-full pop-out-btn bg-green-500 hover:bg-green-600 text-white font-bold py-6 rounded-2xl flex items-center justify-center gap-3 text-xl transition-all duration-300"
        >
          <Camera className="w-8 h-8" />
          SCAN WASTE &amp; EARN
          <Zap className="w-6 h-6" />
        </button>
      </div>

      {/* ── Quick Actions ── */}
      <div className="px-4 mb-8">
        <h3 className="text-gray-500 text-sm mb-3 font-medium">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map(action => (
            <button
              key={action.id}
              onClick={() => onNavigate(action.id)}
              className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col items-center gap-2 hover:border-green-300 transition-all duration-300"
            >
              <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center text-white`}>
                {action.icon}
              </div>
              <span className="text-gray-700 text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Badges horizontal scroll ── */}
      <div className="px-4 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-500 text-sm font-medium">🏅 Achievement Badges</h3>
          <span className="text-gray-400 text-xs">{user?.badges?.length ?? 0}/{Object.keys(ALL_BADGES).length}</span>
        </div>
        <Badges />
      </div>

      {/* ── Top Earners Preview ── */}
      <div className="px-4 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-500 text-sm font-medium">Top Eco Heroes</h3>
          <button onClick={() => onNavigate('leaderboard')} className="text-green-600 text-sm flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {leaderboard.slice(0, 3).map((entry, index) => (
            <div key={entry.id} className={`flex items-center gap-4 p-4 ${index < 2 ? 'border-b border-gray-100' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${index === 0 ? 'bg-yellow-100' : index === 1 ? 'bg-gray-100' : 'bg-amber-100'}`}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl">
                {entry.avatar}
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-medium">{entry.name}</p>
                <p className="text-gray-400 text-xs">📍 {entry.location}</p>
              </div>
              <div className="text-right">
                <p className="text-green-600 font-bold">{entry.greenScore}</p>
                <div className="flex items-center gap-1 text-amber-500 text-xs">
                  <Flame className="w-3 h-3" /> {entry.streak}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Referral card ── */}
      <div className="px-4 mb-8">
        <Referral />
      </div>

      {/* ── Floating Spin FAB ── */}
      <button
        onClick={() => setSpinModalOpen(true)}
        className="fixed bottom-24 right-4 z-30 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-green-600 transition-all duration-300 pop-out-btn"
        aria-label="Daily Spin"
        title="Daily Spin"
      >
        🎰
      </button>
    </div>
  );
};
