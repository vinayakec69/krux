import React, { useState } from 'react';
import {
  User, MapPin, Mail, Edit2, Check, X,
  Trophy, Zap, Leaf, Camera, LogOut,
  ChevronRight, Award, Flame
} from 'lucide-react';
import { useStore } from '@/store/useStore';

const AVATAR_OPTIONS = ['🌱', '🌿', '🍃', '🌳', '🌲', '🎋', '🌾', '🏆', '⭐', '✨', '💚', '🌍', '🌎', '🌏', '♻️', '🔋', '💧', '🌊'];

export const Profile: React.FC = () => {
  const { user, updateProfile, logout } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    location: user?.location || '',
    avatar: user?.avatar || '🌱'
  });

  if (!user) return null;

  const handleSave = () => {
    updateProfile(formData);
    setIsEditing(false);
    setShowAvatarPicker(false);
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      location: user.location,
      avatar: user.avatar
    });
    setIsEditing(false);
    setShowAvatarPicker(false);
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-green-900/30 to-black px-4 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">👤 Profile</h1>
          <button
            onClick={logout}
            className="p-2 bg-[#111] rounded-xl border border-gray-800 flex items-center gap-2 px-3"
          >
            <LogOut className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">Logout</span>
          </button>
        </div>

        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center text-5xl mb-3">
              {formData.avatar}
            </div>
            {isEditing && (
              <button
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="absolute bottom-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
              >
                <Edit2 className="w-4 h-4 text-white" />
              </button>
            )}
          </div>

          {showAvatarPicker && (
            <div className="bg-[#111] rounded-2xl p-4 border border-gray-800 mt-3">
              <p className="text-gray-400 text-sm mb-3">Choose your avatar</p>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setFormData({ ...formData, avatar: emoji });
                      setShowAvatarPicker(false);
                    }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-2xl transition-all ${
                      formData.avatar === emoji
                        ? 'bg-green-500/30 border-2 border-green-500'
                        : 'bg-[#1a1a1a] border border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#111] rounded-2xl p-3 border border-gray-800 text-center">
            <Zap className="w-6 h-6 text-green-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{user.kruxBalance}</p>
            <p className="text-gray-400 text-xs">KRUX</p>
          </div>
          <div className="bg-[#111] rounded-2xl p-3 border border-gray-800 text-center">
            <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{user.greenScore}</p>
            <p className="text-gray-400 text-xs">Score</p>
          </div>
          <div className="bg-[#111] rounded-2xl p-3 border border-gray-800 text-center">
            <Flame className="w-6 h-6 text-orange-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{user.streak}</p>
            <p className="text-gray-400 text-xs">Streak</p>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-400 text-sm font-medium">Profile Information</h3>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-xl border border-green-500/30 text-green-400 text-sm"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="p-2 bg-red-500/20 rounded-xl border border-red-500/30"
              >
                <X className="w-4 h-4 text-red-400" />
              </button>
              <button
                onClick={handleSave}
                className="p-2 bg-green-500/20 rounded-xl border border-green-500/30"
              >
                <Check className="w-4 h-4 text-green-400" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {/* Name */}
          <div className="bg-[#111] rounded-2xl p-4 border border-gray-800">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <p className="text-gray-400 text-xs mb-1">Name</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#1a1a1a] text-white px-3 py-2 rounded-xl border border-gray-700 focus:border-green-500 outline-none"
                  />
                ) : (
                  <p className="text-white font-medium">{user.name}</p>
                )}
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="bg-[#111] rounded-2xl p-4 border border-gray-800">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <p className="text-gray-400 text-xs mb-1">Email</p>
                <p className="text-white font-medium">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-[#111] rounded-2xl p-4 border border-gray-800">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <p className="text-gray-400 text-xs mb-1">Location</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-[#1a1a1a] text-white px-3 py-2 rounded-xl border border-gray-700 focus:border-green-500 outline-none"
                  />
                ) : (
                  <p className="text-white font-medium">{user.location}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="px-4 mb-6">
        <h3 className="text-gray-400 text-sm mb-3 font-medium">Achievements</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#111] rounded-2xl p-4 border border-gray-800">
            <Award className="w-6 h-6 text-purple-400 mb-2" />
            <p className="text-white font-bold text-xl">#{user.rank}</p>
            <p className="text-gray-400 text-xs">Global Rank</p>
          </div>
          <div className="bg-[#111] rounded-2xl p-4 border border-gray-800">
            <Camera className="w-6 h-6 text-blue-400 mb-2" />
            <p className="text-white font-bold text-xl">{user.totalScans}</p>
            <p className="text-gray-400 text-xs">Total Scans</p>
          </div>
        </div>
      </div>

      {/* Environmental Impact */}
      <div className="px-4 mb-6">
        <h3 className="text-gray-400 text-sm mb-3 font-medium">Environmental Impact</h3>
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-2xl p-4 border border-emerald-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Leaf className="w-8 h-8 text-emerald-400" />
                <div>
                  <p className="text-white font-bold text-xl">{user.co2Saved.toFixed(1)} kg</p>
                  <p className="text-gray-400 text-sm">CO₂ Emissions Saved</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl p-4 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">💧</div>
                <div>
                  <p className="text-white font-bold text-xl">{user.waterSaved.toFixed(1)} L</p>
                  <p className="text-gray-400 text-sm">Water Conserved</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-4 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">♻️</div>
                <div>
                  <p className="text-white font-bold text-xl">{user.plasticRecycled.toFixed(2)} kg</p>
                  <p className="text-gray-400 text-sm">Plastic Recycled</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Member Since */}
      <div className="px-4">
        <div className="bg-[#111] rounded-2xl p-4 border border-gray-800 text-center">
          <p className="text-gray-400 text-sm">Member Since</p>
          <p className="text-white font-bold text-lg mt-1">
            {new Date(parseInt(user.id)).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>
    </div>
  );
};
