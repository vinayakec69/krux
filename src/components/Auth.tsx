import React, { useState } from 'react';
import { Leaf, Mail, Lock, User, MapPin, ArrowRight, Loader2, Sparkles, Eye, EyeOff, WifiOff } from 'lucide-react';
import { useStore } from '@/store/useStore';
const PASSWORD_REQUIREMENTS = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function getStrengthColor(strength: number): string {
  if (strength <= 1) return 'bg-red-400';
  if (strength <= 2) return 'bg-amber-400';
  if (strength <= 3) return 'bg-yellow-400';
  return 'bg-green-500';
}

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
        const result = await login(email, password);
        if (!result.success) {
          setError(result.error ?? 'Invalid email or password');
        }
      } else {
        if (!name || !email || !password || !location) {
          setError('Please fill in all fields');
          setIsSubmitting(false);
          return;
        }
        const result = await signup(name, email, password, location);
        if (!result.success) {
          setError(result.error ?? 'Sign up failed. Please try again.');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  const passwordStrength = !isLogin && password
    ? PASSWORD_REQUIREMENTS.filter(r => r.test(password)).length
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-3xl flex items-center justify-center mx-auto mb-4 glow-green float-animation">
            <Leaf className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">KRUX</h1>
          <p className="text-gray-500">Scan. Earn. Save the Planet.</p>
        </div>



        {/* MTP Banner */}
        <div className="bg-green-100 rounded-2xl p-4 mb-8 border border-green-200 max-w-md w-full">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-green-600 flex-shrink-0" />
            <p className="text-green-700 text-sm">
              <span className="font-bold">Be a Hero.</span> Every scan you make closes the circular loop and earns you KRUX coins.
            </p>
          </div>
        </div>

        {/* Auth Form */}
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
            {/* Tab Toggle */}
            <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  isLogin ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  !isLogin ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none transition-colors"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl py-4 pl-12 pr-12 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password requirements (signup only) */}
                {!isLogin && (
                  <div className="mt-2 space-y-1">
                    {/* Strength bar */}
                    {password.length > 0 && (
                      <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              i <= passwordStrength ? getStrengthColor(passwordStrength) : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-1">
                      {PASSWORD_REQUIREMENTS.map(req => (
                        <div key={req.label} className="flex items-center gap-1">
                          <span className={`text-xs ${req.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                            {req.test(password) ? '✓' : '○'} {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="City/Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none transition-colors"
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-red-500 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full pop-out-btn bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all duration-300"
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
            <p className="text-gray-400 text-sm">Join 50,000+ Eco Heroes worldwide</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="flex -space-x-2">
                {['🧑', '👩', '👨', '🧔', '👩‍🦰'].map((emoji, i) => (
                  <div key={i} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm border-2 border-white">
                    {emoji}
                  </div>
                ))}
              </div>
              <span className="text-green-600 text-sm font-medium">+50K</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Preview */}
      <div className="px-6 pb-8">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center border border-gray-200 shadow-sm">
            <div className="text-2xl mb-1">📸</div>
            <p className="text-gray-700 text-xs font-medium">Scan & Earn</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-200 shadow-sm">
            <div className="text-2xl mb-1">🛍️</div>
            <p className="text-gray-700 text-xs font-medium">Shop Eco</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-200 shadow-sm">
            <div className="text-2xl mb-1">🏆</div>
            <p className="text-gray-700 text-xs font-medium">Compete</p>
          </div>
        </div>
      </div>
    </div>
  );
};
