import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Auth } from '@/components/Auth';
import { Home } from '@/components/Home';
import { Scanner } from '@/components/Scanner';
import { Marketplace } from '@/components/Marketplace';
import { Leaderboard } from '@/components/Leaderboard';
import { Dashboard } from '@/components/Dashboard';
import { Navigation } from '@/components/Navigation';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-6">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-green-500 text-white font-bold rounded-full hover:bg-green-600 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const { isAuthenticated, activeTab, setActiveTab, initializeApp, darkMode } = useStore();

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
      default:
        return <Home onNavigate={setActiveTab} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className={`min-h-screen bg-gray-50 transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
        {renderContent()}
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </ErrorBoundary>
  );
}