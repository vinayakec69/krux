import React, { useState, useEffect } from 'react';
import { 
  Leaf, Droplets, Recycle, Wind, TrendingUp, 
  Award, ChevronRight, Zap,
  BarChart3, Users, Building2, FileCheck
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { DashboardSkeleton, CoinBalanceSkeleton } from './SkeletonLoader';

export const Dashboard: React.FC = () => {
  const { user } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'user' | 'brand'>('user');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-lg border-b border-gray-800 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">📊 Impact Dashboard</h1>
            <p className="text-gray-400 text-sm">Track your environmental impact</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView('user')}
            className={`flex-1 py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              activeView === 'user'
                ? 'bg-green-500 text-white'
                : 'bg-[#111] text-gray-400 border border-gray-800'
            }`}
          >
            <Users className="w-4 h-4" />
            My Impact
          </button>
          <button
            onClick={() => setActiveView('brand')}
            className={`flex-1 py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              activeView === 'brand'
                ? 'bg-purple-500 text-white'
                : 'bg-[#111] text-gray-400 border border-gray-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Brand Portal
          </button>
        </div>
      </div>

      {activeView === 'user' ? (
        <UserDashboard user={user} isLoading={isLoading} />
      ) : (
        <BrandDashboard />
      )}
    </div>
  );
};

interface UserDashboardProps {
  user: any;
  isLoading: boolean;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, isLoading }) => {
  const impactMetrics = [
    {
      icon: <Wind className="w-6 h-6" />,
      label: 'CO₂ Saved',
      value: `${(user?.co2Saved || 0).toFixed(1)} kg`,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
    },
    {
      icon: <Droplets className="w-6 h-6" />,
      label: 'Water Saved',
      value: `${(user?.waterSaved || 0).toFixed(0)} L`,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
      borderColor: 'border-cyan-500/30',
    },
    {
      icon: <Recycle className="w-6 h-6" />,
      label: 'Plastic Recycled',
      value: `${(user?.plasticRecycled || 0).toFixed(2)} kg`,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
    },
    {
      icon: <Leaf className="w-6 h-6" />,
      label: 'Trees Equivalent',
      value: `${((user?.co2Saved || 0) / 21).toFixed(1)}`,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/30',
    },
  ];

  return (
    <div className="p-4">
      {/* KRUX Balance Card */}
      {isLoading ? (
        <CoinBalanceSkeleton />
      ) : (
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded-2xl p-6 border border-green-500/30 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">KRUX Balance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">{user?.kruxBalance || 0}</span>
                <span className="text-green-400 font-medium">KRUX</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#111] rounded-xl p-3 border border-gray-800 text-center">
          <p className="text-2xl font-bold text-white">{user?.totalScans || 0}</p>
          <p className="text-gray-400 text-xs">Total Scans</p>
        </div>
        <div className="bg-[#111] rounded-xl p-3 border border-gray-800 text-center">
          <p className="text-2xl font-bold text-green-400">{user?.greenScore || 0}</p>
          <p className="text-gray-400 text-xs">Green Score</p>
        </div>
        <div className="bg-[#111] rounded-xl p-3 border border-gray-800 text-center">
          <p className="text-2xl font-bold text-orange-400">{user?.streak || 0}</p>
          <p className="text-gray-400 text-xs">Day Streak</p>
        </div>
      </div>

      {/* Impact Metrics */}
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-green-400" />
        Environmental Impact
      </h3>
      
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {impactMetrics.map((metric, index) => (
            <div 
              key={index}
              className={`${metric.bgColor} rounded-2xl p-4 border ${metric.borderColor}`}
            >
              <div className={`${metric.color} mb-2`}>{metric.icon}</div>
              <p className="text-2xl font-bold text-white">{metric.value}</p>
              <p className="text-gray-400 text-sm">{metric.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Achievements */}
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        <Award className="w-5 h-5 text-yellow-400" />
        Achievements
      </h3>
      <div className="space-y-3">
        <AchievementCard 
          title="First Scan" 
          description="Complete your first plastic scan"
          progress={user?.totalScans > 0 ? 100 : 0}
          unlocked={user?.totalScans > 0}
        />
        <AchievementCard 
          title="Streak Master" 
          description="Maintain a 7-day scanning streak"
          progress={Math.min((user?.streak || 0) / 7 * 100, 100)}
          unlocked={user?.streak >= 7}
        />
        <AchievementCard 
          title="Eco Warrior" 
          description="Reach 1000 Green Score"
          progress={Math.min((user?.greenScore || 0) / 1000 * 100, 100)}
          unlocked={user?.greenScore >= 1000}
        />
        <AchievementCard 
          title="Carbon Neutral Hero" 
          description="Save 10kg of CO₂"
          progress={Math.min((user?.co2Saved || 0) / 10 * 100, 100)}
          unlocked={user?.co2Saved >= 10}
        />
      </div>

      {/* Request Pickup Card */}
      <div className="mt-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-4 border border-purple-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center">
              <Recycle className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-bold">Request Pickup</h3>
              <p className="text-gray-400 text-sm">Connect with Safai Sathis</p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-gray-400" />
        </div>
      </div>
    </div>
  );
};

interface AchievementCardProps {
  title: string;
  description: string;
  progress: number;
  unlocked: boolean;
}

const AchievementCard: React.FC<AchievementCardProps> = ({ title, description, progress, unlocked }) => (
  <div className={`bg-[#111] rounded-xl p-4 border ${unlocked ? 'border-yellow-500/50' : 'border-gray-800'}`}>
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        unlocked ? 'bg-yellow-500' : 'bg-gray-800'
      }`}>
        {unlocked ? '🏆' : '🔒'}
      </div>
      <div className="flex-1">
        <h4 className="text-white font-medium">{title}</h4>
        <p className="text-gray-500 text-xs">{description}</p>
      </div>
      <span className={`text-sm font-bold ${unlocked ? 'text-yellow-400' : 'text-gray-500'}`}>
        {Math.round(progress)}%
      </span>
    </div>
    <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
      <div 
        className={`h-full rounded-full transition-all duration-500 ${
          unlocked ? 'bg-yellow-500' : 'bg-gray-600'
        }`}
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

const BrandDashboard: React.FC = () => {
  const eprMetrics = [
    { label: 'Total Plastic Collected', value: '2,450 kg', change: '+12%' },
    { label: 'EPR Credits Generated', value: '1,890', change: '+8%' },
    { label: 'Verified Transactions', value: '15,230', change: '+15%' },
    { label: 'Active Users', value: '3,450', change: '+22%' },
  ];

  const plasticBreakdown = [
    { type: 'PET', percentage: 45, color: 'bg-green-500' },
    { type: 'HDPE', percentage: 25, color: 'bg-blue-500' },
    { type: 'PP', percentage: 18, color: 'bg-purple-500' },
    { type: 'Other', percentage: 12, color: 'bg-gray-500' },
  ];

  return (
    <div className="p-4">
      {/* EPR Compliance Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-indigo-600/20 rounded-2xl p-6 border border-purple-500/30 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <FileCheck className="w-8 h-8 text-purple-400" />
          <div>
            <h2 className="text-xl font-bold text-white">EPR Compliance Portal</h2>
            <p className="text-gray-400 text-sm">Extended Producer Responsibility Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-black/30 rounded-xl p-3">
            <p className="text-gray-400 text-xs">2025 Target</p>
            <p className="text-white font-bold">5,000 kg</p>
          </div>
          <div className="flex-1 bg-black/30 rounded-xl p-3">
            <p className="text-gray-400 text-xs">Current Progress</p>
            <p className="text-green-400 font-bold">2,450 kg (49%)</p>
          </div>
        </div>
        <div className="mt-4 h-3 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-green-500 rounded-full" style={{ width: '49%' }} />
        </div>
      </div>

      {/* Key Metrics */}
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-purple-400" />
        Key Metrics
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {eprMetrics.map((metric, index) => (
          <div key={index} className="bg-[#111] rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">{metric.label}</p>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-white">{metric.value}</span>
              <span className="text-green-400 text-xs">{metric.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Plastic Type Breakdown */}
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        <Recycle className="w-5 h-5 text-green-400" />
        Plastic Type Breakdown
      </h3>
      <div className="bg-[#111] rounded-2xl p-4 border border-gray-800 mb-6">
        <div className="space-y-3">
          {plasticBreakdown.map((item) => (
            <div key={item.type}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-white">{item.type}</span>
                <span className="text-gray-400">{item.percentage}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${item.color} rounded-full`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Trail */}
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        <FileCheck className="w-5 h-5 text-blue-400" />
        Recent Audit Trail
      </h3>
      <div className="space-y-3">
        {[
          { date: '2024-01-15', type: 'PET', amount: '125 kg', status: 'Verified' },
          { date: '2024-01-14', type: 'HDPE', amount: '89 kg', status: 'Verified' },
          { date: '2024-01-13', type: 'PP', amount: '67 kg', status: 'Pending' },
        ].map((record, index) => (
          <div key={index} className="bg-[#111] rounded-xl p-4 border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-white font-medium">{record.type} Collection</p>
              <p className="text-gray-500 text-xs">{record.date}</p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold">{record.amount}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                record.status === 'Verified' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {record.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Download Report Button */}
      <button className="w-full mt-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-white font-bold flex items-center justify-center gap-2">
        <FileCheck className="w-5 h-5" />
        Download EPR Compliance Report
      </button>
    </div>
  );
};
