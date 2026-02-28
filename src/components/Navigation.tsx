import React from 'react';
import { Home, Camera, ShoppingBag, Trophy, User } from 'lucide-react';
import { cn } from '@/utils/cn';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'scan', icon: Camera, label: 'Scan' },
    { id: 'shop', icon: ShoppingBag, label: 'Shop' },
    { id: 'leaderboard', icon: Trophy, label: 'Ranks' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#111]/95 backdrop-blur-lg border-t border-gray-800 px-4 py-2 z-50">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isScan = tab.id === 'scan';
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all',
                isScan ? 'relative -mt-6' : '',
                isActive && !isScan ? 'bg-green-500/20' : ''
              )}
            >
              {isScan ? (
                <div className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center transition-all',
                  isActive 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 glow-green'
                    : 'bg-gradient-to-r from-green-600 to-emerald-700'
                )}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
              ) : (
                <Icon className={cn(
                  'w-6 h-6 transition-colors',
                  isActive ? 'text-green-400' : 'text-gray-500'
                )} />
              )}
              <span className={cn(
                'text-xs font-medium transition-colors',
                isScan ? 'text-white' : isActive ? 'text-green-400' : 'text-gray-500'
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
