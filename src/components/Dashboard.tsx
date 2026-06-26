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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📊 Impact Dashboard</h1>
            <p className="text-gray-500 text-sm">Track your environmental impact</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView('user')}
            className={`flex-1 py-2 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
              activeView === 'user'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            My Impact
          </button>
          <button
            onClick={() => setActiveView('brand')}
            className={`flex-1 py-2 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
              activeView === 'brand'
                ? 'bg-green-700 text-white'
                : 'bg-gray-100 text-gray-500 border border-gray-200'
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
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      icon: <Droplets className="w-6 h-6" />,
      label: 'Water Saved',
      value: `${(user?.waterSaved || 0).toFixed(0)} L`,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      icon: <Recycle className="w-6 h-6" />,
      label: 'Plastic Recycled',
      value: `${(user?.plasticRecycled || 0).toFixed(2)} kg`,
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      icon: <Leaf className="w-6 h-6" />,
      label: 'Trees Equivalent',
      value: `${((user?.co2Saved || 0) / 21).toFixed(1)}`,
      color: 'text-green-800',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
  ];

  return (
    <div className="p-4">
      {/* KRUX Balance Card */}
      {isLoading ? (
        <CoinBalanceSkeleton />
      ) : (
        <div className="bg-green-500 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-green-100 text-sm">KRUX Balance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">{user?.kruxBalance || 0}</span>
                <span className="text-green-200 font-medium">KRUX</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-900">{user?.totalScans || 0}</p>
          <p className="text-gray-400 text-xs">Total Scans</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-600">{user?.greenScore || 0}</p>
          <p className="text-gray-400 text-xs">Green Score</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm text-center">
          <p className="text-2xl font-bold text-amber-500">{user?.streak || 0}</p>
          <p className="text-gray-400 text-xs">Day Streak</p>
        </div>
      </div>

      {/* Impact Metrics */}
      <h3 className="text-gray-900 font-bold mb-3 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-green-500" />
        Environmental Impact
      </h3>
      
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {impactMetrics.map((metric, index) => (
            <div 
              key={index}
              className={`${metric.bgColor} rounded-2xl p-4 border ${metric.borderColor} shadow-sm`}
            >
              <div className={`${metric.color} mb-2`}>{metric.icon}</div>
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-gray-500 text-sm">{metric.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Achievements */}
      <h3 className="text-gray-900 font-bold mb-3 flex items-center gap-2">
        <Award className="w-5 h-5 text-green-500" />
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
      <div className="mt-6 bg-green-50 rounded-2xl p-4 border border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Recycle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-gray-900 font-bold">Request Pickup</h3>
              <p className="text-gray-500 text-sm">Connect with Safai Sathis</p>
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
  <div className={`bg-white rounded-xl p-4 border shadow-sm ${unlocked ? 'border-green-300' : 'border-gray-200'}`}>
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        unlocked ? 'bg-green-500' : 'bg-gray-100'
      }`}>
        {unlocked ? '🏆' : '🔒'}
      </div>
      <div className="flex-1">
        <h4 className="text-gray-900 font-medium">{title}</h4>
        <p className="text-gray-400 text-xs">{description}</p>
      </div>
      <span className={`text-sm font-bold ${unlocked ? 'text-green-600' : 'text-gray-400'}`}>
        {Math.round(progress)}%
      </span>
    </div>
    <div className="mt-3 h-2 bg-green-100 rounded-full overflow-hidden">
      <div 
        className={`h-full rounded-full transition-all duration-500 ${
          unlocked ? 'bg-green-500' : 'bg-gray-300'
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
    { type: 'HDPE', percentage: 25, color: 'bg-green-600' },
    { type: 'PP', percentage: 18, color: 'bg-green-700' },
    { type: 'Other', percentage: 12, color: 'bg-gray-400' },
  ];

  return (
    <div className="p-4">
      {/* EPR Compliance Header */}
      <div className="bg-green-700 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <FileCheck className="w-8 h-8 text-white" />
          <div>
            <h2 className="text-xl font-bold text-white">EPR Compliance Portal</h2>
            <p className="text-green-200 text-sm">Extended Producer Responsibility Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-white/10 rounded-xl p-3">
            <p className="text-green-200 text-xs">2025 Target</p>
            <p className="text-white font-bold">5,000 kg</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-3">
            <p className="text-green-200 text-xs">Current Progress</p>
            <p className="text-green-200 font-bold">2,450 kg (49%)</p>
          </div>
        </div>
        <div className="mt-4 h-3 bg-green-900 rounded-full overflow-hidden">
          <div className="h-full bg-green-300 rounded-full" style={{ width: '49%' }} />
        </div>
      </div>

      {/* Key Metrics */}
      <h3 className="text-gray-900 font-bold mb-3 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-green-600" />
        Key Metrics
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {eprMetrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-gray-400 text-xs mb-1">{metric.label}</p>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-gray-900">{metric.value}</span>
              <span className="text-green-600 text-xs">{metric.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Plastic Type Breakdown */}
      <h3 className="text-gray-900 font-bold mb-3 flex items-center gap-2">
        <Recycle className="w-5 h-5 text-green-600" />
        Plastic Type Breakdown
      </h3>
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm mb-6">
        <div className="space-y-3">
          {plasticBreakdown.map((item) => (
            <div key={item.type}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700">{item.type}</span>
                <span className="text-gray-500">{item.percentage}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
      <h3 className="text-gray-900 font-bold mb-3 flex items-center gap-2">
        <FileCheck className="w-5 h-5 text-green-600" />
        Recent Audit Trail
      </h3>
      <div className="space-y-3">
        {[
          { date: '2024-01-15', type: 'PET', amount: '125 kg', status: 'Verified' },
          { date: '2024-01-14', type: 'HDPE', amount: '89 kg', status: 'Verified' },
          { date: '2024-01-13', type: 'PP', amount: '67 kg', status: 'Pending' },
        ].map((record, index) => (
          <div key={index} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-gray-900 font-medium">{record.type} Collection</p>
              <p className="text-gray-400 text-xs">{record.date}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-900 font-bold">{record.amount}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                record.status === 'Verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-600'
              }`}>
                {record.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Download Report Button */}
      <button className="w-full mt-6 py-4 bg-green-700 hover:bg-green-800 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all duration-300">
        <FileCheck className="w-5 h-5" />
        Download EPR Compliance Report
      </button>
    </div>
  );
};
