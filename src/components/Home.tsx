import React, { useState, useEffect } from 'react';
import { 
  Camera, ShoppingBag, Trophy, BarChart2, 
  Zap, Flame, ChevronRight, Sparkles, Leaf,
  TrendingUp, Gift, Star, LogOut, Medal, AlertTriangle
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { CoinBalanceSkeleton } from './SkeletonLoader';
import { Badges } from './Badges';
import { Challenges } from './Challenges';
import { SpinWheel } from './SpinWheel';
import { Referral } from './Referral';

interface HomeProps {
  onNavigate: (tab: string) => void;
}

const XP_LEVELS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5000, 7000, 9000, 12000, 15000, 20000, 26000, 33000, 41000, 50000, 60000];
const LEVEL_NAMES = [
  '', 'Eco Newbie', 'Plastic Spotter', 'Waste Warrior', 'Recycler', 'Green Guardian',
  'Eco Hero', 'Planet Defender', 'Nature Keeper', 'Eco Champion', 'Eco Champion II',
  'Eco Master', 'Green Legend', 'Eco Legend', 'Planet Protector', 'Eco Titan',
  'Green Titan', 'Earth Guardian', 'Sustainability Pro', 'Sustainability Legend', 'Eco God',
];

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { user, showRewardAnimation, logout, leaderboard, buyStreakFreeze } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [coinAnimating, setCoinAnimating] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);

  const prevLevel = React.useRef(user?.level || 1);

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

  useEffect(() => {
    if (user?.level && user.level > prevLevel.current) {
      setLevelUp(user.level);
      setTimeout(() => setLevelUp(null), 3000);
    }
    prevLevel.current = user?.level || 1;
  }, [user?.level]);

  const quickActions = [
    { id: 'scan', icon: <Camera className="w-6 h-6" />, label: 'Scan', color: 'from-green-500 to-emerald-600' },
    { id: 'shop', icon: <ShoppingBag className="w-6 h-6" />, label: 'Shop', color: 'from-purple-500 to-pink-600' },
    { id: 'leaderboard', icon: <Trophy className="w-6 h-6" />, label: 'Ranks', color: 'from-yellow-500 to-orange-600' },
    { id: 'dashboard', icon: <BarChart2 className="w-6 h-6" />, label: 'Stats', color: 'from-blue-500 to-cyan-600' },
  ];

  const userRank = user ? leaderboard.length + 1 : 0;

  // XP progress
  const level = user?.level || 1;
  const xp = user?.xp || 0;
  const currentLevelXP = XP_LEVELS[level - 1] || 0;
  const nextLevelXP = XP_LEVELS[level] || XP_LEVELS[XP_LEVELS.length - 1];
  const xpProgress = Math.min(100, Math.round(((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100));

  // Streak at risk: past 8 PM and no scan today
  const now = new Date();
  const today = now.toDateString();
  const lastScanToday = user?.lastScanDate === today;
  const isStreakAtRisk = !lastScanToday && now.getHours() >= 20 && (user?.streak || 0) > 0;

  // Spin available
  const today2 = new Date().toDateString();
  const canSpin = !user?.lastSpinDate || user.lastSpinDate !== today2;

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Level-up overlay */}
      {levelUp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="text-center level-up-animation">
            <div className="text-7xl mb-4">⚡</div>
            <p className="text-green-400 font-bold text-2xl glow-green">LEVEL UP!</p>
            <p className="text-white text-xl mt-2">Level {levelUp}</p>
            <p className="text-gray-400">{LEVEL_NAMES[levelUp] || ''}</p>
          </div>
        </div>
      )}

      {/* Spin Wheel Modal */}
      {showSpinWheel && <SpinWheel onClose={() => setShowSpinWheel(false)} />}

      {/* Badges Modal */}
      {showBadges && <Badges onClose={() => setShowBadges(false)} />}

      {/* Header */}
      <div className="bg-gradient-to-b from-green-900/30 to-black px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center text-2xl">
              {user?.avatar || '🌱'}
            </div>
            <div>
              <p className="text-gray-400 text-sm">Welcome back,</p>
              <h2 className="text-white font-bold text-lg">{user?.name || 'Eco Hero'}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBadges(true)}
              className="flex items-center gap-1 px-2 py-1.5 bg-[#111] rounded-xl border border-gray-800"
            >
              <Medal className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 text-xs font-bold">{(user?.badges || []).length}</span>
            </button>
            <button 
              onClick={logout}
              className="p-2 bg-[#111] rounded-xl border border-gray-800"
            >
              <LogOut className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* KRUX Balance Card */}
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
                <div className="flex items-center gap-1 text-blue-400">
                  <span className="text-xs">❄️ x{user?.streakFreezes || 0}</span>
                </div>
                <p className="text-gray-500 text-xs">streak</p>
              </div>
            </div>

            {/* Reward Animation Overlay */}
            {showRewardAnimation && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="reward-burst bg-green-400/30 rounded-full w-32 h-32" />
              </div>
            )}
          </div>
        )}

        {/* Level / XP Bar */}
        <div className="mt-3 bg-black/40 rounded-2xl px-4 py-3 border border-gray-800">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 font-bold text-sm">Lv.{level}</span>
              <span className="text-gray-400 text-xs">{LEVEL_NAMES[level] || ''}</span>
            </div>
            <span className="text-gray-500 text-xs">{xp} / {nextLevelXP} XP</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-700 progress-fill"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Streak at Risk Warning */}
      {isStreakAtRisk && (
        <div className="px-4 -mt-2 mb-4">
          <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-2xl p-3 border border-red-500/30 shake-animation">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-400 font-bold text-sm">Streak at Risk! 🔥</p>
                <p className="text-gray-400 text-xs">Scan before midnight to keep your {user?.streak}-day streak!</p>
              </div>
              <button
                onClick={() => onNavigate('scan')}
                className="px-3 py-1.5 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-colors"
              >
                Scan Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Message */}
      <div className="px-4 mb-4">
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-4 border border-purple-500/30">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-400 flex-shrink-0" />
            <div>
              <h3 className="text-white font-bold">You're an Eco Hero! 🦸</h3>
              <p className="text-gray-400 text-sm">Every scan contributes to closing the circular loop.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Spin Wheel Card */}
      <div className="px-4 mb-4">
        <button
          onClick={() => setShowSpinWheel(true)}
          className={`w-full rounded-2xl p-4 border flex items-center gap-3 transition-all
            ${canSpin
              ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30 bounce-animation'
              : 'bg-[#111] border-gray-800'
            }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl
            ${canSpin ? 'bg-yellow-500/30' : 'bg-gray-800'}`}>
            🎰
          </div>
          <div className="flex-1 text-left">
            <h3 className={`font-bold ${canSpin ? 'text-yellow-400' : 'text-gray-400'}`}>
              {canSpin ? 'Spin Available! 🎉' : 'Daily Spin'}
            </h3>
            <p className="text-gray-500 text-xs">{canSpin ? 'Tap to spin and win KRUX!' : 'Come back tomorrow'}</p>
          </div>
          <ChevronRight className={`w-5 h-5 ${canSpin ? 'text-yellow-400' : 'text-gray-600'}`} />
        </button>
      </div>

      {/* Daily Challenges */}
      <div className="px-4 mb-4">
        <Challenges compact />
      </div>

      {/* Main Scan Button */}
      <div className="px-4 mb-6">
        <button
          onClick={() => onNavigate('scan')}
          className="w-full pop-out-btn bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-6 rounded-2xl flex items-center justify-center gap-3 text-xl"
        >
          <Camera className="w-8 h-8" />
          SCAN WASTE & EARN
          <Zap className="w-6 h-6" />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6">
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

      {/* Achievement Badges horizontal scroll */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-400 text-sm font-medium">Achievement Badges</h3>
          <button
            onClick={() => setShowBadges(true)}
            className="text-green-400 text-sm flex items-center gap-1"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <Badges compact />
      </div>

      {/* Referral Card */}
      <div className="px-4 mb-4">
        <Referral compact />
      </div>

      {/* Streak Freeze */}
      <div className="px-4 mb-6">
        <div className="bg-[#111] rounded-2xl border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">❄️</span>
                <h3 className="text-white font-bold text-sm">Streak Freeze</h3>
              </div>
              <p className="text-gray-400 text-xs">Protect your streak on missed days</p>
              <p className="text-blue-400 text-xs mt-1">You have {user?.streakFreezes || 0}/3 freezes</p>
            </div>
            <button
              onClick={() => buyStreakFreeze()}
              disabled={(user?.streakFreezes || 0) >= 3}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                (user?.streakFreezes || 0) >= 3
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30'
              }`}
            >
              Buy (50 KRUX)
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="px-4 mb-6">
        <h3 className="text-gray-400 text-sm mb-3 font-medium">Your Impact</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#111] rounded-2xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">Green Score</span>
            </div>
            <p className="text-3xl font-bold text-white">{user?.greenScore || 0}</p>
          </div>
          <div className="bg-[#111] rounded-2xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-400 text-sm">Global Rank</span>
            </div>
            <p className="text-3xl font-bold text-white">#{userRank}</p>
          </div>
          <div className="bg-[#111] rounded-2xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-5 h-5 text-emerald-400" />
              <span className="text-gray-400 text-sm">CO₂ Saved</span>
            </div>
            <p className="text-3xl font-bold text-white">{(user?.co2Saved || 0).toFixed(1)}<span className="text-lg text-gray-400">kg</span></p>
          </div>
          <div className="bg-[#111] rounded-2xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-5 h-5 text-blue-400" />
              <span className="text-gray-400 text-sm">Total Scans</span>
            </div>
            <p className="text-3xl font-bold text-white">{user?.totalScans || 0}</p>
          </div>
        </div>
      </div>

      {/* Top Earners Preview */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-400 text-sm font-medium">Top Eco Heroes</h3>
          <button 
            onClick={() => onNavigate('leaderboard')}
            className="text-green-400 text-sm flex items-center gap-1"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-[#111] rounded-2xl border border-gray-800 overflow-hidden">
          {leaderboard.slice(0, 3).map((entry, index) => (
            <div 
              key={entry.id}
              className={`flex items-center gap-4 p-4 ${index < 2 ? 'border-b border-gray-800' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
              }`}>
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

      {/* Daily Bonus */}
      <div className="px-4 mb-6">
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl p-4 border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-500/30 rounded-xl flex items-center justify-center">
                <Gift className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-white font-bold">Daily Bonus</h3>
                <p className="text-gray-400 text-sm">Scan today to maintain streak!</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-yellow-400 font-bold">
              <Star className="w-5 h-5" />
              +5 KRUX
            </div>
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="px-4">
        <h3 className="text-gray-400 text-sm mb-3 font-medium">Recycling Tips</h3>
        <div className="space-y-3">
          {[
            { tip: 'Clean plastic before scanning for higher accuracy', emoji: '🧹' },
            { tip: 'HDPE plastics earn more KRUX - look for recycling code #2', emoji: '💰' },
            { tip: 'Maintain your streak for bonus multipliers', emoji: '🔥' },
          ].map((item, index) => (
            <div key={index} className="bg-[#111] rounded-xl p-3 border border-gray-800 flex items-center gap-3">
              <span className="text-2xl">{item.emoji}</span>
              <p className="text-gray-300 text-sm">{item.tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
