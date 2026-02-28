import React, { useState, useEffect } from 'react';
import { 
  Camera, ShoppingBag, Trophy, BarChart2, 
  Zap, Flame, ChevronRight, Sparkles, Leaf,
  TrendingUp, Gift, Star, LogOut
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { CoinBalanceSkeleton } from './SkeletonLoader';

interface HomeProps {
  onNavigate: (tab: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { user, showRewardAnimation, logout, leaderboard } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [coinAnimating, setCoinAnimating] = useState(false);

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
    { id: 'scan', icon: <Camera className="w-6 h-6" />, label: 'Scan', color: 'from-green-500 to-emerald-600' },
    { id: 'shop', icon: <ShoppingBag className="w-6 h-6" />, label: 'Shop', color: 'from-purple-500 to-pink-600' },
    { id: 'leaderboard', icon: <Trophy className="w-6 h-6" />, label: 'Ranks', color: 'from-yellow-500 to-orange-600' },
    { id: 'dashboard', icon: <BarChart2 className="w-6 h-6" />, label: 'Stats', color: 'from-blue-500 to-cyan-600' },
  ];

  const userRank = user ? leaderboard.length + 1 : 0;

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
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
          <button 
            onClick={logout}
            className="p-2 bg-[#111] rounded-xl border border-gray-800"
          >
            <LogOut className="w-5 h-5 text-gray-400" />
          </button>
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
      </div>

      {/* Hero Message */}
      <div className="px-4 -mt-2 mb-6">
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

      {/* Main Scan Button - Pop-out Effect (Secret #2) */}
      <div className="px-4 mb-8">
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

      {/* Stats Overview */}
      <div className="px-4 mb-8">
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
      <div className="px-4 mb-8">
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

      {/* Daily Rewards */}
      <div className="px-4 mb-8">
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
