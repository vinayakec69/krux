import React, { useState } from 'react';
import { Share2, Copy, Check, Users } from 'lucide-react';
import { useStore } from '@/store/useStore';

export const Referral: React.FC = () => {
  const { user, registerReferral } = useStore();
  const [copied, setCopied] = useState(false);

  const code = user?.referralCode || '------';
  const referralLink = `https://krux.app/join?ref=${code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join KRUX & Earn!',
        text: `Use my referral code ${code} on KRUX to earn KRUX coins for recycling plastic! 🌱`,
        url: referralLink,
      }).catch(() => handleCopy());
    } else {
      handleCopy();
    }
  };

  // Simulate referral for demo purposes
  const handleTestReferral = () => {
    registerReferral();
  };

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-purple-400" />
        <h3 className="text-white font-bold">Invite &amp; Earn</h3>
        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">+50 KRUX/referral</span>
      </div>

      {/* Referral Code */}
      <div className="bg-black/50 rounded-xl p-3 mb-3 flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-xs mb-0.5">Your Code</p>
          <p className="text-[#BF00FF] font-bold text-2xl tracking-widest">{code}</p>
        </div>
        <button
          onClick={handleCopy}
          className="p-3 bg-purple-500/20 rounded-xl border border-purple-500/40 hover:bg-purple-500/30 transition-all"
        >
          {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-purple-400" />}
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{user?.referralCount || 0}</p>
          <p className="text-gray-500 text-xs">Friends invited</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[#39FF14]">{(user?.referralCount || 0) * 50}</p>
          <p className="text-gray-500 text-xs">KRUX earned</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-400">∞</p>
          <p className="text-gray-500 text-xs">No limit</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#BF00FF]/20 border border-[#BF00FF]/40 rounded-xl text-purple-300 font-medium hover:bg-[#BF00FF]/30 transition-all"
        >
          <Share2 className="w-4 h-4" />
          Share Link
        </button>
        <button
          onClick={handleTestReferral}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#39FF14]/10 border border-[#39FF14]/30 rounded-xl text-[#39FF14] font-medium hover:bg-[#39FF14]/20 transition-all text-sm"
        >
          🎁 Simulate Referral
        </button>
      </div>
    </div>
  );
};
