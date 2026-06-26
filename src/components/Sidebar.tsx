import React from 'react';
import { X, User, Info, Settings, MessageSquare, Sun, Moon, LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigate }) => {
  const { user, darkMode, toggleDarkMode, logout } = useStore();

  const menuItems = [
    {
      id: 'profile',
      icon: <User className="w-5 h-5 text-green-600" />,
      label: '👤 Profile',
      description: user ? `${user.totalScans} scans · Lv.${user.level} · ${user.kruxBalance} KRUX` : '',
      action: () => { onNavigate('dashboard'); onClose(); },
    },
    {
      id: 'impact',
      icon: '🌍',
      label: '📊 My Impact',
      description: user ? `${user.co2Saved.toFixed(1)} kg CO₂ saved` : '',
      action: () => { onNavigate('dashboard'); onClose(); },
    },
    {
      id: 'achievements',
      icon: '🏆',
      label: '🏆 Achievements',
      description: user ? `${user.badges.length} badges earned` : '',
      action: () => { onNavigate('leaderboard'); onClose(); },
    },
    {
      id: 'about',
      icon: <Info className="w-5 h-5 text-green-600" />,
      label: 'ℹ️ About Us',
      description: 'KRUX mission & sustainability',
      action: () => onClose(),
    },
    {
      id: 'settings',
      icon: <Settings className="w-5 h-5 text-green-600" />,
      label: '⚙️ Settings',
      description: 'App preferences (coming soon)',
      action: () => onClose(),
    },
    {
      id: 'feedback',
      icon: <MessageSquare className="w-5 h-5 text-green-600" />,
      label: '💬 Feedback',
      description: 'Send us your feedback',
      action: () => onClose(),
    },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-gray-900/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar drawer */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-green-500 p-5 pt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-white text-2xl">🍃</span>
              <span className="text-white font-bold text-xl">KRUX</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/20 rounded-xl"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                {user.avatar}
              </div>
              <div>
                <p className="text-white font-bold">{user.name}</p>
                <p className="text-green-100 text-xs">
                  {user.kruxBalance} KRUX · Lv.{user.level} · 🔥 {user.streak}d
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={item.action}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 transition-colors duration-200 text-left"
              >
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center text-base flex-shrink-0">
                  {typeof item.icon === 'string' ? item.icon : item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium text-sm">{item.label}</p>
                  {item.description && (
                    <p className="text-gray-400 text-xs truncate">{item.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Environmental Impact card */}
          {user && (
            <div className="mt-4 p-4 bg-green-50 rounded-2xl border border-green-100">
              <p className="text-green-800 font-bold text-sm mb-3">🌿 Environmental Impact</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-green-700 font-bold text-base">{user.co2Saved.toFixed(1)}</p>
                  <p className="text-gray-400 text-xs">kg CO₂</p>
                </div>
                <div>
                  <p className="text-green-700 font-bold text-base">{user.waterSaved.toFixed(0)}</p>
                  <p className="text-gray-400 text-xs">L Water</p>
                </div>
                <div>
                  <p className="text-green-700 font-bold text-base">{user.plasticRecycled.toFixed(2)}</p>
                  <p className="text-gray-400 text-xs">kg Plastic</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer: Dark mode toggle + Logout */}
        <div className="p-4 border-t border-gray-100 space-y-3">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {darkMode ? (
                <Moon className="w-5 h-5 text-green-500" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500" />
              )}
              <span className="text-gray-700 font-medium text-sm">
                {darkMode ? 'Dark Mode' : 'Light Mode'}
              </span>
            </div>
            {/* Pill toggle switch */}
            <button
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                darkMode ? 'bg-green-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-300 ${
                  darkMode ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Logout */}
          <button
            onClick={() => { void logout(); onClose(); }}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors duration-200 text-left"
          >
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
              <LogOut className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-red-500 font-medium text-sm">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};
