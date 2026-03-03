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
      case 1: return 'bg-yellow-50 border-yellow-200';
      case 2: return 'bg-gray-50 border-gray-200';
      case 3: return 'bg-amber-50 border-amber-200';
      default: return 'bg-white border-gray-200';
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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="w-7 h-7 text-yellow-400" />
              Leaderboard
            </h1>
            <p className="text-gray-500 text-sm">Compete to be the top Eco Hero</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('global')}
            className={`flex-1 py-2 rounded-xl font-medium transition-all duration-300 ${
              filter === 'global'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}
          >
            🌍 Global
          </button>
          <button
            onClick={() => setFilter('local')}
            className={`flex-1 py-2 rounded-xl font-medium transition-all duration-300 ${
              filter === 'local'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}
          >
            📍 Local
          </button>
        </div>
      </div>

      {/* User's Position Card */}
      {user && (
        <div className="mx-4 mt-4 p-4 bg-green-50 rounded-2xl border border-green-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl">
              {user.avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-900 font-bold">{user.name}</span>
                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">You</span>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-bold">{user.greenScore}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span className="text-amber-600">{user.streak} day streak</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">#{userRank}</div>
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
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-2 border-2 border-gray-300">
                {fullLeaderboard[1]?.avatar || '🥈'}
              </div>
              <div className="bg-gray-100 rounded-t-xl w-full h-20 flex flex-col items-center justify-end pb-2">
                <span className="text-gray-700 font-bold text-sm truncate max-w-full px-1">{fullLeaderboard[1]?.name}</span>
                <span className="text-gray-500 text-xs">{fullLeaderboard[1]?.greenScore}</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex-1 flex flex-col items-center">
              <div className="float-animation">
                <Crown className="w-8 h-8 text-yellow-400 mb-1" />
              </div>
              <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center text-4xl mb-2 border-2 border-yellow-300">
                {fullLeaderboard[0]?.avatar || '🏆'}
              </div>
              <div className="bg-yellow-50 rounded-t-xl w-full h-28 flex flex-col items-center justify-end pb-2">
                <span className="text-gray-900 font-bold text-sm truncate max-w-full px-1">{fullLeaderboard[0]?.name}</span>
                <span className="text-green-600 text-xs font-bold">{fullLeaderboard[0]?.greenScore}</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-3xl mb-2 border-2 border-amber-300">
                {fullLeaderboard[2]?.avatar || '🥉'}
              </div>
              <div className="bg-amber-50 rounded-t-xl w-full h-16 flex flex-col items-center justify-end pb-2">
                <span className="text-gray-700 font-bold text-sm truncate max-w-full px-1">{fullLeaderboard[2]?.name}</span>
                <span className="text-gray-500 text-xs">{fullLeaderboard[2]?.greenScore}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="px-4 mt-4">
        <h3 className="text-gray-500 text-sm mb-3 font-medium">Full Rankings</h3>
        
        {isLoading ? (
          <LeaderboardSkeleton />
        ) : (
          <div className="space-y-3">
            {fullLeaderboard.slice(3).map((entry) => (
              <div 
                key={entry.id}
                className={`flex items-center gap-4 p-4 rounded-xl border shadow-sm transition-all ${getRankBg(entry.rank)} ${
                  entry.id === user?.id ? 'ring-2 ring-green-400' : ''
                }`}
              >
                <div className="w-8 flex justify-center">
                  {getRankIcon(entry.rank)}
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-2xl">
                  {entry.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 font-medium">{entry.name}</span>
                    {entry.id === user?.id && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">You</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-gray-400 text-xs">📍 {entry.location}</span>
                    {entry.streak > 0 && (
                      <span className="text-amber-500 text-xs flex items-center gap-1">
                        <Flame className="w-3 h-3" /> {entry.streak}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-green-700 font-bold">
                    <Zap className="w-4 h-4" />
                    {entry.greenScore}
                  </div>
                  <span className="text-gray-400 text-xs">Green Score</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Streak Info Card */}
      <div className="mx-4 mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-200">
        <div className="flex items-center gap-3 mb-2">
          <Flame className="w-6 h-6 text-amber-500" />
          <h3 className="text-gray-900 font-bold">Daily Streak Rewards</h3>
        </div>
        <p className="text-gray-500 text-sm">
          Maintain your streak by scanning waste daily! Higher streaks = higher status in the community.
        </p>
        <div className="flex items-center gap-2 mt-3">
          {[1, 3, 7, 14, 30].map(days => (
            <div 
              key={days}
              className={`flex-1 text-center py-2 rounded-lg text-xs font-medium ${
                (user?.streak || 0) >= days 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white text-gray-400 border border-gray-200'
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
