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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-green-600" />
        <h3 className="text-gray-900 font-bold">Invite &amp; Earn</h3>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">+50 KRUX/referral</span>
      </div>

      {/* Referral Code */}
      <div className="bg-green-50 rounded-xl p-3 mb-3 flex items-center justify-between border border-green-100">
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Your Code</p>
          <p className="text-green-700 font-bold text-2xl tracking-widest font-mono">{code}</p>
        </div>
        <button
          onClick={handleCopy}
          className="p-3 bg-green-100 rounded-xl border border-green-200 hover:bg-green-200 transition-all duration-300"
        >
          {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-green-700" />}
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{user?.referralCount || 0}</p>
          <p className="text-gray-400 text-xs">Friends invited</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{(user?.referralCount || 0) * 50}</p>
          <p className="text-gray-400 text-xs">KRUX earned</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-700">∞</p>
          <p className="text-gray-400 text-xs">No limit</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 rounded-xl text-white font-medium transition-all duration-300"
        >
          <Share2 className="w-4 h-4" />
          Share Link
        </button>
        <button
          onClick={handleTestReferral}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-100 border border-green-200 rounded-xl text-green-700 font-medium hover:bg-green-200 transition-all duration-300 text-sm"
        >
          🎁 Simulate Referral
        </button>
      </div>
    </div>
  );
};
