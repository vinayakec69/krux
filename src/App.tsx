import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Auth } from '@/components/Auth';
import { Home } from '@/components/Home';
import { Scanner } from '@/components/Scanner';
import { Marketplace } from '@/components/Marketplace';
import { Leaderboard } from '@/components/Leaderboard';
import { Dashboard } from '@/components/Dashboard';
import { Navigation } from '@/components/Navigation';
import { authApi } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';

export function App() {
  const { isAuthenticated, activeTab, setActiveTab, initializeApp, darkMode, syncProfile } = useStore();

  useEffect(() => {
    initializeApp();

    // Subscribe to Supabase auth state changes when configured
    if (isSupabaseConfigured()) {
      const { data } = authApi.onAuthStateChange((_event, session) => {
        if (session && syncProfile) {
          syncProfile();
        }
      });
      return () => {
        data.subscription.unsubscribe();
      };
    }
  }, [initializeApp, syncProfile]);

  if (!isAuthenticated) {
    return <Auth />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Home onNavigate={setActiveTab} />;
      case 'scan':
        return <Scanner />;
      case 'shop':
        return <Marketplace />;
      case 'leaderboard':
        return <Leaderboard />;
      case 'dashboard':
        return <Dashboard />;
      default:
        return <Home onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      {renderContent()}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}