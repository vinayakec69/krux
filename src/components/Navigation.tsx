import React from 'react';
import { Home, Camera, ShoppingBag, Trophy, BarChart2 } from 'lucide-react';
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
    { id: 'dashboard', icon: BarChart2, label: 'Stats' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
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
                'flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-300',
                isScan ? 'relative -mt-6' : ''
              )}
            >
              {isScan ? (
                <div className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300',
                  isActive 
                    ? 'bg-green-500 shadow-md shadow-green-200'
                    : 'bg-green-600'
                )}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
              ) : (
                <Icon className={cn(
                  'w-6 h-6 transition-colors duration-300',
                  isActive ? 'text-green-500' : 'text-gray-400'
                )} />
              )}
              <span className={cn(
                'text-xs font-medium transition-colors duration-300',
                isScan ? 'text-gray-600' : isActive ? 'text-green-500' : 'text-gray-400'
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
