import React, { useState, useEffect } from 'react';
import {
  Camera, ShoppingBag, Trophy, BarChart2,
  Zap, Flame, ChevronRight, LogOut,
  Snowflake, AlertTriangle, Star,
} from 'lucide-react';
import { useStore, XP_PER_LEVEL, LEVEL_NAMES, ALL_BADGES } from '@/store/useStore';
import { CoinBalanceSkeleton } from '@/components/SkeletonLoader';
import { Badges } from '@/components/Badges';
import { Challenges } from '@/components/Challenges';
import { SpinWheel } from '@/components/SpinWheel';
import { Referral } from '@/components/Referral';

interface HomeProps {
  onNavigate: (tab: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const {
    user, showRewardAnimation, logout, leaderboard,
    buyStreakFreeze, levelUpTo, dismissLevelUp,
  } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [coinAnimating, setCoinAnimating] = useState(false);
  const [freezeBought, setFreezeBought] = useState(false);

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
    { id: 'scan',        icon: <Camera className="w-6 h-6" />,      label: 'Scan',  color: 'from-green-500 to-emerald-600' },
    { id: 'shop',        icon: <ShoppingBag className="w-6 h-6" />, label: 'Shop',  color: 'from-purple-500 to-pink-600' },
    { id: 'leaderboard', icon: <Trophy className="w-6 h-6" />,      label: 'Ranks', color: 'from-yellow-500 to-orange-600' },
    { id: 'dashboard',   icon: <BarChart2 className="w-6 h-6" />,   label: 'Stats', color: 'from-blue-500 to-cyan-600' },
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
    <div className="min-h-screen bg-black pb-24">
      {/* Level-up celebration overlay */}
      {levelUpTo !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="level-up bg-gradient-to-br from-[#39FF14]/20 to-[#BF00FF]/20 border border-[#39FF14]/50 rounded-3xl p-8 text-center mx-6 shadow-2xl">
            <div className="text-6xl mb-3">⬆️</div>
            <p className="text-[#39FF14] font-bold text-2xl">Level Up!</p>
            <p className="text-white font-bold text-xl">Level {levelUpTo}</p>
            <p className="text-gray-400">{LEVEL_NAMES[(levelUpTo ?? 1) - 1]}</p>
            <button
              onClick={dismissLevelUp}
              className="mt-4 px-6 py-2 bg-[#39FF14] text-black font-bold rounded-xl pointer-events-auto"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-gradient-to-b from-green-900/30 to-black px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center text-2xl">
              {user?.avatar || '🌱'}
            </div>
            <div>
              <p className="text-gray-400 text-sm">Welcome back,</p>
              <h2 className="text-white font-bold text-lg">{user?.name || 'Eco Hero'}</h2>
            </div>
          </div>
          <button onClick={logout} className="p-2 bg-[#111] rounded-xl border border-gray-800">
            <LogOut className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* ── Balance card ── */}
        {isLoading ? (
          <CoinBalanceSkeleton />
        ) : (
          <div className={`bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded-3xl p-6 border border-green-500/30 relative overflow-hidden ${coinAnimating ? 'coin-pulse' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Your KRUX Balance</p>
                <div className="flex items-baseline gap-2">
                  <Zap className="w-8 h-8 text-green-400" />
                  <span className={`text-5xl font-bold text-white ${coinAnimating ? 'text-green-400' : ''}`}>
                    {user?.kruxBalance || 0}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-orange-400 mb-1">
                  <Flame className="w-4 h-4" />
                  <span className="font-bold">{user?.streak || 0} day</span>
                </div>
                <p className="text-gray-500 text-xs">streak</p>
                {(user?.streakFreezes ?? 0) > 0 && (
                  <div className="flex items-center justify-end gap-1 mt-1">
                    {Array.from({ length: user?.streakFreezes ?? 0 }).map((_, i) => (
                      <Snowflake key={i} className="w-3 h-3 text-cyan-400" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {showRewardAnimation && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="reward-burst bg-green-400/30 rounded-full w-32 h-32" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Level / XP bar ── */}
      <div className="px-4 -mt-4 mb-6">
        <div className="bg-[#111] rounded-2xl border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-bold text-sm">Lv.{level} {levelName}</span>
            </div>
            <span className="text-gray-500 text-xs">{xpInLevel} / {xpNeeded} XP</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#39FF14] to-[#BF00FF] rounded-full progress-fill transition-all duration-500"
              style={{ width: `${xpPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Streak + Freeze ── */}
      <div className="px-4 mb-4">
        <div className="bg-[#111] rounded-2xl border border-gray-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame className="w-7 h-7 text-orange-400 streak-fire" />
            <div>
              <p className="text-white font-bold">{user?.streak || 0}-Day Streak</p>
              <p className="text-gray-500 text-xs">Freezes: {user?.streakFreezes ?? 0}/3</p>
            </div>
          </div>
          <button
            onClick={handleBuyFreeze}
            disabled={(user?.streakFreezes ?? 0) >= 3}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              (user?.streakFreezes ?? 0) >= 3
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : freezeBought
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20'
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
          <div className="shake bg-orange-500/10 border border-orange-500/40 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-orange-400 font-bold text-sm">Streak at Risk! 🔥</p>
              <p className="text-gray-400 text-xs">Scan before midnight to keep your streak!</p>
            </div>
            <button
              onClick={() => onNavigate('scan')}
              className="px-3 py-2 bg-orange-500 text-black text-xs font-bold rounded-xl"
            >
              Scan Now
            </button>
          </div>
        </div>
      )}

      {/* ── Spin Wheel card ── */}
      <div className="px-4 mb-6">
        <SpinWheel />
      </div>

      {/* ── Challenges card ── */}
      <div className="px-4 mb-6">
        <Challenges />
      </div>

      {/* ── Main Scan Button ── */}
      <div className="px-4 mb-8">
        <button
          onClick={() => onNavigate('scan')}
          className="w-full pop-out-btn bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-6 rounded-2xl flex items-center justify-center gap-3 text-xl"
        >
          <Camera className="w-8 h-8" />
          SCAN WASTE &amp; EARN
          <Zap className="w-6 h-6" />
        </button>
      </div>

      {/* ── Quick Actions ── */}
      <div className="px-4 mb-8">
        <h3 className="text-gray-400 text-sm mb-3 font-medium">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map(action => (
            <button
              key={action.id}
              onClick={() => onNavigate(action.id)}
              className="bg-[#111] rounded-2xl p-4 border border-gray-800 flex flex-col items-center gap-2 hover:border-gray-700 transition-all"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center text-white`}>
                {action.icon}
              </div>
              <span className="text-white text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Badges horizontal scroll ── */}
      <div className="px-4 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-400 text-sm font-medium">🏅 Achievement Badges</h3>
          <span className="text-gray-600 text-xs">{user?.badges?.length ?? 0}/{Object.keys(ALL_BADGES).length}</span>
        </div>
        <Badges />
      </div>

      {/* ── Top Earners Preview ── */}
      <div className="px-4 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-400 text-sm font-medium">Top Eco Heroes</h3>
          <button onClick={() => onNavigate('leaderboard')} className="text-green-400 text-sm flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-[#111] rounded-2xl border border-gray-800 overflow-hidden">
          {leaderboard.slice(0, 3).map((entry, index) => (
            <div key={entry.id} className={`flex items-center gap-4 p-4 ${index < 2 ? 'border-b border-gray-800' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'}`}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
              </div>
              <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-xl">
                {entry.avatar}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{entry.name}</p>
                <p className="text-gray-500 text-xs">📍 {entry.location}</p>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-bold">{entry.greenScore}</p>
                <div className="flex items-center gap-1 text-orange-400 text-xs">
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
    </div>
  );
};
