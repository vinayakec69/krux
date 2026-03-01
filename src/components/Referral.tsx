import React, { useState } from 'react';
import { Copy, Share2, CheckCircle, Users } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface ReferralProps {
  compact?: boolean;
}

export const Referral: React.FC<ReferralProps> = ({ compact }) => {
  const { user, applyReferralCode } = useStore();
  const [copied, setCopied] = useState(false);
  const [referralInput, setReferralInput] = useState('');
  const [referralMsg, setReferralMsg] = useState('');

  const referralCode = user?.referralCode || 'KRUX00';

  function handleCopy() {
    navigator.clipboard.writeText(referralCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShare() {
    const text = `Join me on KRUX - the eco app that rewards you for recycling! Use my code ${referralCode} and get 25 KRUX free! 🌿♻️`;
    if (navigator.share) {
      navigator.share({ title: 'Join KRUX', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleApplyReferral() {
    if (!referralInput.trim()) return;
    const success = applyReferralCode(referralInput.trim().toUpperCase());
    if (success) {
      setReferralMsg('✅ Code applied! +25 KRUX bonus!');
    } else {
      setReferralMsg('❌ Invalid or already used code');
    }
    setTimeout(() => setReferralMsg(''), 3000);
  }

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-4 border border-purple-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-bold text-sm">Invite & Earn</h3>
          </div>
          <span className="text-xs text-purple-400 font-medium">
            {user?.referralCount || 0} friends invited
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-[#111] rounded-xl border border-gray-800 px-3 py-2 flex items-center justify-between">
            <span className="text-green-400 font-bold font-mono tracking-widest text-lg">
              {referralCode}
            </span>
            <button
              onClick={handleCopy}
              className="ml-2 p-1 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
          <button
            onClick={handleShare}
            className="p-2.5 bg-purple-500/20 rounded-xl border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
          >
            <Share2 className="w-5 h-5 text-purple-400" />
          </button>
        </div>

        <p className="text-gray-500 text-xs text-center">
          You get <span className="text-green-400 font-bold">+50 KRUX</span> · Friend gets <span className="text-green-400 font-bold">+25 KRUX</span>
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 mb-6">
      <h3 className="text-gray-400 text-sm mb-3 font-medium">Invite & Earn</h3>
      <div className="bg-[#111] rounded-2xl border border-gray-800 p-4 space-y-4">
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-1">Your referral code</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl font-bold text-green-400 font-mono tracking-widest sparkle">
              {referralCode}
            </span>
            <button
              onClick={handleCopy}
              className={`p-2 rounded-xl border transition-all ${copied ? 'bg-green-500/20 border-green-500/40' : 'bg-gray-800 border-gray-700'}`}
            >
              {copied ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
          {copied && <p className="text-green-400 text-xs mt-1 slide-up">Copied!</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-500/10 rounded-xl p-3 text-center border border-green-500/20">
            <p className="text-2xl font-bold text-green-400">+50</p>
            <p className="text-gray-400 text-xs">KRUX you earn</p>
          </div>
          <div className="bg-blue-500/10 rounded-xl p-3 text-center border border-blue-500/20">
            <p className="text-2xl font-bold text-blue-400">+25</p>
            <p className="text-gray-400 text-xs">KRUX friend gets</p>
          </div>
        </div>

        <button
          onClick={handleShare}
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5" />
          Share Invite Link
        </button>

        {!user?.referredBy && (
          <div className="pt-3 border-t border-gray-800">
            <p className="text-gray-400 text-xs mb-2">Have a referral code?</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralInput}
                onChange={e => setReferralInput(e.target.value.toUpperCase())}
                placeholder="Enter code"
                maxLength={6}
                className="flex-1 bg-black border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 font-mono tracking-widest"
              />
              <button
                onClick={handleApplyReferral}
                className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl text-sm font-medium hover:bg-green-500/30 transition-colors"
              >
                Apply
              </button>
            </div>
            {referralMsg && <p className="text-xs mt-2 slide-up">{referralMsg}</p>}
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Friends invited</span>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-white font-bold">{user?.referralCount || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
