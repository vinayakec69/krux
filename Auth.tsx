import React, { useState } from 'react';
import { Leaf, Mail, Lock, User, MapPin, ArrowRight, Loader2, Sparkles, Eye, EyeOff } from 'lucide-react';
import { useStore } from '@/store/useStore';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, signup } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const success = await login(email, password);
        if (!success) {
          setError('Invalid email or password');
        }
      } else {
        if (!name || !email || !password || !location) {
          setError('Please fill in all fields');
          setIsSubmitting(false);
          return;
        }
        const success = await signup(name, email, password, location);
        if (!success) {
          setError('Email already exists');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 glow-green float-animation">
            <Leaf className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">KRUX</h1>
          <p className="text-gray-400">Scan. Earn. Save the Planet.</p>
        </div>

        {/* MTP Banner */}
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded-2xl p-4 mb-8 border border-green-500/30 max-w-md w-full">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-green-400 flex-shrink-0" />
            <p className="text-green-300 text-sm">
              <span className="font-bold">Be a Hero.</span> Every scan you make closes the circular loop and earns you KRUX coins.
            </p>
          </div>
        </div>

        {/* Auth Form */}
        <div className="w-full max-w-md">
          <div className="bg-[#111] rounded-3xl p-6 border border-gray-800">
            {/* Tab Toggle */}
            <div className="flex mb-6 bg-black rounded-xl p-1">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  isLogin ? 'bg-green-500 text-white' : 'text-gray-400'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  !isLogin ? 'bg-green-500 text-white' : 'text-gray-400'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none transition-colors"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-xl py-4 pl-12 pr-12 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {!isLogin && (
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="City/Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none transition-colors"
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full pop-out-btn bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Start Your Journey' : 'Join the Movement'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Social Proof */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">Join 50,000+ Eco Heroes worldwide</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="flex -space-x-2">
                {['🧑', '👩', '👨', '🧔', '👩‍🦰'].map((emoji, i) => (
                  <div key={i} className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-sm border-2 border-black">
                    {emoji}
                  </div>
                ))}
              </div>
              <span className="text-green-400 text-sm font-medium">+50K</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Preview */}
      <div className="px-6 pb-8">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#111] rounded-xl p-3 text-center border border-gray-800">
            <div className="text-2xl mb-1">📸</div>
            <p className="text-white text-xs font-medium">Scan & Earn</p>
          </div>
          <div className="bg-[#111] rounded-xl p-3 text-center border border-gray-800">
            <div className="text-2xl mb-1">🛍️</div>
            <p className="text-white text-xs font-medium">Shop Eco</p>
          </div>
          <div className="bg-[#111] rounded-xl p-3 text-center border border-gray-800">
            <div className="text-2xl mb-1">🏆</div>
            <p className="text-white text-xs font-medium">Compete</p>
          </div>
        </div>
      </div>
    </div>
  );
};
