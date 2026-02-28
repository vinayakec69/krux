import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Auth } from '@/components/Auth';
import { Home } from '@/components/Home';
import { Scanner } from '@/components/Scanner';
import { Marketplace } from '@/components/Marketplace';
import { Leaderboard } from '@/components/Leaderboard';
import { Dashboard } from '@/components/Dashboard';
import { Profile } from '@/components/Profile';
import { Navigation } from '@/components/Navigation';

export function App() {
  const { isAuthenticated, activeTab, setActiveTab, initializeApp } = useStore();

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

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
      case 'profile':
        return <Profile />;
      default:
        return <Home onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {renderContent()}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
