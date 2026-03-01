import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Medal, TrendingUp, Crown, Zap } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { LeaderboardSkeleton } from './SkeletonLoader';

export const Leaderboard: React.FC = () => {
  const { leaderboard, user } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'global' | 'local'>('global');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2: return <Medal className="w-6 h-6 text-gray-300" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className="text-gray-400 font-bold">#{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50';
      case 2: return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/50';
      case 3: return 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/50';
      default: return 'bg-[#111] border-gray-800';
    }
  };

  // Add current user to leaderboard if authenticated
  const fullLeaderboard = user 
    ? [...leaderboard, {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        greenScore: user.greenScore,
        location: user.location,
        rank: leaderboard.length + 1,
        streak: user.streak,
      }].sort((a, b) => b.greenScore - a.greenScore).map((entry, index) => ({ ...entry, rank: index + 1 }))
    : leaderboard;

  const userRank = fullLeaderboard.find(e => e.id === user?.id)?.rank || 0;

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-lg border-b border-gray-800 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-7 h-7 text-yellow-400" />
              Leaderboard
            </h1>
            <p className="text-gray-400 text-sm">Compete to be the top Eco Hero</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('global')}
            className={`flex-1 py-2 rounded-xl font-medium transition-all ${
              filter === 'global'
                ? 'bg-purple-500 text-white'
                : 'bg-[#111] text-gray-400 border border-gray-800'
            }`}
          >
            🌍 Global
          </button>
          <button
            onClick={() => setFilter('local')}
            className={`flex-1 py-2 rounded-xl font-medium transition-all ${
              filter === 'local'
                ? 'bg-purple-500 text-white'
                : 'bg-[#111] text-gray-400 border border-gray-800'
            }`}
          >
            📍 Local
          </button>
        </div>
      </div>

      {/* User's Position Card */}
      {user && (
        <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded-2xl border border-green-500/30">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-500/30 rounded-full flex items-center justify-center text-2xl">
              {user.avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{user.name}</span>
                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">You</span>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 font-bold">{user.greenScore}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-orange-400">{user.streak} day streak</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">#{userRank}</div>
              <span className="text-gray-400 text-xs">Your Rank</span>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {!isLoading && (
        <div className="px-4 mt-6 mb-4">
          <div className="flex items-end justify-center gap-4">
            {/* 2nd Place */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-400/20 rounded-full flex items-center justify-center text-3xl mb-2 border-2 border-gray-400">
                {fullLeaderboard[1]?.avatar || '🥈'}
              </div>
              <div className="bg-gradient-to-t from-gray-500/30 to-gray-400/20 rounded-t-xl w-full h-20 flex flex-col items-center justify-end pb-2">
                <span className="text-white font-bold text-sm truncate max-w-full px-1">{fullLeaderboard[1]?.name}</span>
                <span className="text-gray-400 text-xs">{fullLeaderboard[1]?.greenScore}</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex-1 flex flex-col items-center">
              <div className="float-animation">
                <Crown className="w-8 h-8 text-yellow-400 mb-1" />
              </div>
              <div className="w-20 h-20 bg-yellow-400/20 rounded-full flex items-center justify-center text-4xl mb-2 border-2 border-yellow-400">
                {fullLeaderboard[0]?.avatar || '🏆'}
              </div>
              <div className="bg-gradient-to-t from-yellow-500/30 to-yellow-400/20 rounded-t-xl w-full h-28 flex flex-col items-center justify-end pb-2">
                <span className="text-white font-bold text-sm truncate max-w-full px-1">{fullLeaderboard[0]?.name}</span>
                <span className="text-yellow-400 text-xs font-bold">{fullLeaderboard[0]?.greenScore}</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-16 h-16 bg-amber-600/20 rounded-full flex items-center justify-center text-3xl mb-2 border-2 border-amber-600">
                {fullLeaderboard[2]?.avatar || '🥉'}
              </div>
              <div className="bg-gradient-to-t from-amber-600/30 to-amber-500/20 rounded-t-xl w-full h-16 flex flex-col items-center justify-end pb-2">
                <span className="text-white font-bold text-sm truncate max-w-full px-1">{fullLeaderboard[2]?.name}</span>
                <span className="text-gray-400 text-xs">{fullLeaderboard[2]?.greenScore}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="px-4 mt-4">
        <h3 className="text-gray-400 text-sm mb-3 font-medium">Full Rankings</h3>
        
        {isLoading ? (
          <LeaderboardSkeleton />
        ) : (
          <div className="space-y-3">
            {fullLeaderboard.slice(3).map((entry) => (
              <div 
                key={entry.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${getRankBg(entry.rank)} ${
                  entry.id === user?.id ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <div className="w-8 flex justify-center">
                  {getRankIcon(entry.rank)}
                </div>
                <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-2xl">
                  {entry.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{entry.name}</span>
                    {entry.id === user?.id && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">You</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-gray-400 text-xs">📍 {entry.location}</span>
                    {entry.streak > 0 && (
                      <span className="text-orange-400 text-xs flex items-center gap-1">
                        <Flame className="w-3 h-3" /> {entry.streak}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-green-400 font-bold">
                    <Zap className="w-4 h-4" />
                    {entry.greenScore}
                  </div>
                  <span className="text-gray-500 text-xs">Green Score</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Streak Info Card */}
      <div className="mx-4 mt-6 p-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-2xl border border-orange-500/30">
        <div className="flex items-center gap-3 mb-2">
          <Flame className="w-6 h-6 text-orange-400" />
          <h3 className="text-white font-bold">Daily Streak Rewards</h3>
        </div>
        <p className="text-gray-400 text-sm">
          Maintain your streak by scanning waste daily! Higher streaks = higher status in the community.
        </p>
        <div className="flex items-center gap-2 mt-3">
          {[1, 3, 7, 14, 30].map(days => (
            <div 
              key={days}
              className={`flex-1 text-center py-2 rounded-lg text-xs font-medium ${
                (user?.streak || 0) >= days 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-800 text-gray-500'
              }`}
            >
              {days}d
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
