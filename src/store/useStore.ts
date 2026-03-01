import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ScanMetadata, checkForFraud } from '@/utils/fraudDetection';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  kruxBalance: number;
  greenScore: number;
  streak: number;
  lastScanDate: string | null;
  totalScans: number;
  co2Saved: number;
  waterSaved: number;
  plasticRecycled: number;
  location: string;
  rank: number;
  // Feature 1: Badges
  badges: string[];
  // Feature 2: Challenges
  challengeProgress: Record<string, number>;
  lastChallengeReset: string | null;
  weeklyChallengeProgress: number;
  lastWeeklyReset: string | null;
  // Feature 3: Streak Freeze
  streakFreezes: number;
  lastActiveDate: string | null;
  // Feature 4: Spin Wheel
  lastSpinDate: string | null;
  // Feature 5: XP / Level
  xp: number;
  level: number;
  // Feature 6: Referral
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
}

export interface ScanRecord {
  id: string;
  userId: string;
  plasticType: string;
  timestamp: number;
  metadata: ScanMetadata;
  kruxEarned: number;
  verified: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  affiliateCommission: number;
  features: string[];
  rating: number;
  reviews: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  greenScore: number;
  location: string;
  rank: number;
  streak: number;
}

export interface DeliveryInfo {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Order {
  id: string;
  products: { productId: string; quantity: number }[];
  total: number;
  deliveryInfo: DeliveryInfo;
  status: string;
  createdAt: number;
}

interface AppState {
  // User State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Scan State
  scanRecords: ScanRecord[];
  scanMetadataHistory: ScanMetadata[];
  
  // Marketplace
  products: Product[];
  cart: { productId: string; quantity: number }[];
  orders: Order[];
  
  // Leaderboard
  leaderboard: LeaderboardEntry[];
  
  // UI State
  activeTab: string;
  showRewardAnimation: boolean;
  pendingKrux: number;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  signup: (name: string, email: string, password: string, location: string) => Promise<boolean>;
  
  // Scan Actions
  addScan: (plasticType: string, metadata: ScanMetadata, kruxEarned: number) => Promise<{ success: boolean; message: string }>;
  checkDuplicate: (metadata: ScanMetadata) => { isFraud: boolean; reason: string };
  
  // Coin Actions
  addKrux: (amount: number) => void;
  deductKrux: (amount: number) => boolean;
  setOptimisticKrux: (amount: number) => void;
  revertOptimisticKrux: (amount: number) => void;
  
  // Marketplace Actions
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  checkout: (deliveryInfo: DeliveryInfo) => Promise<boolean>;
  
  // UI Actions
  setActiveTab: (tab: string) => void;
  setShowRewardAnimation: (show: boolean) => void;
  setLoading: (loading: boolean) => void;
  
  // Streak
  updateStreak: () => void;
  
  // Feature 1: Badges
  checkAndAwardBadges: () => string[];
  
  // Feature 2: Challenges
  updateChallengeProgress: (challengeId: string, amount?: number) => void;
  resetDailyChallenges: () => void;
  
  // Feature 3: Streak Freeze
  buyStreakFreeze: () => boolean;
  
  // Feature 4: Spin Wheel
  spinWheel: () => { reward: string; krux: number; type: string } | null;
  
  // Feature 5: XP
  addXP: (amount: number) => void;
  
  // Feature 6: Referral
  applyReferralCode: (code: string) => boolean;
  
  // Initialize
  initializeApp: () => void;
}

const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Eco Warrior Anime Tee',
    description: 'Limited edition anime-style eco warrior t-shirt made from 100% recycled materials. Features exclusive KRUX artwork.',
    price: 250,
    image: '👕',
    category: 'clothing',
    stock: 50,
    affiliateCommission: 25,
    features: [
      '100% Recycled Cotton',
      'Eco-friendly dyes',
      'Exclusive KRUX design',
      'Available in S, M, L, XL',
      'Pre-shrunk fabric',
      'Machine washable'
    ],
    rating: 4.8,
    reviews: 127,
  },
  {
    id: '2',
    name: 'Ocean Blue Steel Bottle',
    description: 'Premium stainless steel bottle with ocean-inspired design. Double-wall insulation keeps drinks cold for 24hrs or hot for 12hrs.',
    price: 150,
    image: '🍶',
    category: 'accessories',
    stock: 100,
    affiliateCommission: 20,
    features: [
      '500ml capacity',
      'Double-wall vacuum insulation',
      'BPA-free',
      'Leak-proof cap',
      'Easy-grip design',
      'Dishwasher safe'
    ],
    rating: 4.9,
    reviews: 243,
  },
  {
    id: '3',
    name: 'Street Style Baggy Pants',
    description: 'Comfortable baggy pants made from upcycled denim. Perfect blend of street style and sustainability.',
    price: 400,
    image: '👖',
    category: 'clothing',
    stock: 30,
    affiliateCommission: 30,
    features: [
      'Upcycled denim material',
      'Relaxed fit',
      'Multiple pockets',
      'Adjustable waist',
      'Available in 28-36 waist',
      'Reinforced stitching'
    ],
    rating: 4.6,
    reviews: 89,
  },
  {
    id: '4',
    name: 'Solar Power Bank 10000mAh',
    description: 'Eco-friendly solar-powered charger for all your devices. Charge on-the-go using sunlight or USB.',
    price: 350,
    image: '🔋',
    category: 'electronics',
    stock: 25,
    affiliateCommission: 15,
    features: [
      '10000mAh capacity',
      'Solar + USB charging',
      'Dual USB output',
      'LED flashlight built-in',
      'Water-resistant',
      'Fast charging support'
    ],
    rating: 4.5,
    reviews: 156,
  },
  {
    id: '5',
    name: 'Bamboo Wireless Earbuds',
    description: 'Premium wireless earbuds with sustainable bamboo charging case. Crystal clear audio with eco-conscious design.',
    price: 500,
    image: '🎧',
    category: 'electronics',
    stock: 20,
    affiliateCommission: 20,
    features: [
      'Bluetooth 5.2',
      'Active noise cancellation',
      '24hr total battery life',
      'Bamboo charging case',
      'Touch controls',
      'IPX5 water resistant'
    ],
    rating: 4.7,
    reviews: 198,
  },
  {
    id: '6',
    name: 'Ocean Plastic Tote Bag',
    description: 'Stylish tote bag made from recycled ocean plastic. Each bag removes 1kg of plastic from the ocean.',
    price: 100,
    image: '👜',
    category: 'accessories',
    stock: 200,
    affiliateCommission: 25,
    features: [
      'Made from ocean plastic',
      'Large 15L capacity',
      'Reinforced handles',
      'Interior pocket',
      'Machine washable',
      'Removes 1kg ocean plastic'
    ],
    rating: 4.9,
    reviews: 312,
  },
  {
    id: '7',
    name: 'Anime Eco Hoodie',
    description: 'Cozy hoodie featuring exclusive eco-warrior anime art. Made with organic cotton and recycled polyester.',
    price: 450,
    image: '🧥',
    category: 'clothing',
    stock: 40,
    affiliateCommission: 25,
    features: [
      '60% organic cotton, 40% recycled polyester',
      'Kangaroo pocket',
      'Adjustable drawstring hood',
      'Ribbed cuffs and hem',
      'Exclusive artwork',
      'Unisex design'
    ],
    rating: 4.8,
    reviews: 167,
  },
  {
    id: '8',
    name: 'Smart LED Desk Lamp',
    description: 'Energy-efficient LED lamp with wireless charging base. Adjustable brightness and color temperature.',
    price: 300,
    image: '💡',
    category: 'electronics',
    stock: 35,
    affiliateCommission: 18,
    features: [
      '5 brightness levels',
      '3 color temperatures',
      '10W wireless charging',
      'Touch controls',
      'USB-C port',
      'Auto-off timer'
    ],
    rating: 4.6,
    reviews: 134,
  },
  {
    id: '9',
    name: 'Recycled Phone Case',
    description: 'Durable phone case made from recycled materials. Slim design with excellent protection.',
    price: 80,
    image: '📱',
    category: 'accessories',
    stock: 150,
    affiliateCommission: 30,
    features: [
      '100% recycled materials',
      'Shock-absorbing design',
      'Raised edges for screen protection',
      'Wireless charging compatible',
      'Multiple iPhone/Android models',
      'Lifetime warranty'
    ],
    rating: 4.4,
    reviews: 256,
  },
  {
    id: '10',
    name: 'Eco Sneakers',
    description: 'Comfortable sneakers made from recycled plastic bottles and natural rubber. Style meets sustainability.',
    price: 600,
    image: '👟',
    category: 'clothing',
    stock: 25,
    affiliateCommission: 22,
    features: [
      'Upper from 12 recycled bottles',
      'Natural rubber sole',
      'Organic cotton laces',
      'Memory foam insole',
      'Sizes 6-13',
      'Carbon-neutral shipping'
    ],
    rating: 4.7,
    reviews: 89,
  },
];

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', name: 'EcoChampion', avatar: '🏆', greenScore: 15420, location: 'Mumbai', rank: 1, streak: 45 },
  { id: '2', name: 'GreenWarrior', avatar: '🌿', greenScore: 12350, location: 'Delhi', rank: 2, streak: 32 },
  { id: '3', name: 'PlasticHunter', avatar: '🎯', greenScore: 10890, location: 'Bangalore', rank: 3, streak: 28 },
  { id: '4', name: 'RecycleKing', avatar: '👑', greenScore: 9540, location: 'Chennai', rank: 4, streak: 21 },
  { id: '5', name: 'EarthSaver', avatar: '🌍', greenScore: 8720, location: 'Hyderabad', rank: 5, streak: 19 },
  { id: '6', name: 'WasteNinja', avatar: '🥷', greenScore: 7650, location: 'Pune', rank: 6, streak: 15 },
  { id: '7', name: 'EcoHero99', avatar: '🦸', greenScore: 6890, location: 'Kolkata', rank: 7, streak: 12 },
  { id: '8', name: 'GreenVibes', avatar: '✨', greenScore: 5430, location: 'Ahmedabad', rank: 8, streak: 10 },
];

function generateReferralCode(userId: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[(parseInt(userId, 10) + i * 7) % chars.length];
  }
  return code;
}

function getWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toDateString();
}

function migrateUser(user: any): User {
  return {
    badges: [],
    challengeProgress: {},
    lastChallengeReset: null,
    weeklyChallengeProgress: 0,
    lastWeeklyReset: null,
    streakFreezes: 0,
    lastActiveDate: null,
    lastSpinDate: null,
    xp: 0,
    level: 1,
    referralCode: generateReferralCode(user.id || Date.now().toString()),
    referredBy: null,
    referralCount: 0,
    ...user,
  };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      scanRecords: [],
      scanMetadataHistory: [],
      products: INITIAL_PRODUCTS,
      cart: [],
      orders: [],
      leaderboard: MOCK_LEADERBOARD,
      activeTab: 'home',
      showRewardAnimation: false,
      pendingKrux: 0,

      // Auth Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const storedUsers = localStorage.getItem('krux_users');
        const users = storedUsers ? JSON.parse(storedUsers) : [];
        const user = users.find((u: any) => u.email === email && u.password === password);
        
        if (user) {
          const { password: _, ...userData } = user;
          set({ user: migrateUser(userData), isAuthenticated: true, isLoading: false });
          return true;
        }
        
        set({ isLoading: false });
        return false;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, cart: [], activeTab: 'home' });
      },

      signup: async (name: string, email: string, password: string, location: string) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const storedUsers = localStorage.getItem('krux_users');
        const users = storedUsers ? JSON.parse(storedUsers) : [];
        
        if (users.find((u: any) => u.email === email)) {
          set({ isLoading: false });
          return false;
        }
        
        const newUser: User & { password: string } = {
          id: Date.now().toString(),
          name,
          email,
          password,
          avatar: '🌱',
          kruxBalance: 50,
          greenScore: 0,
          streak: 0,
          lastScanDate: null,
          totalScans: 0,
          co2Saved: 0,
          waterSaved: 0,
          plasticRecycled: 0,
          location,
          rank: users.length + 1,
          badges: [],
          challengeProgress: {},
          lastChallengeReset: null,
          weeklyChallengeProgress: 0,
          lastWeeklyReset: null,
          streakFreezes: 0,
          lastActiveDate: null,
          lastSpinDate: null,
          xp: 0,
          level: 1,
          referralCode: generateReferralCode(Date.now().toString()),
          referredBy: null,
          referralCount: 0,
        };
        
        users.push(newUser);
        localStorage.setItem('krux_users', JSON.stringify(users));
        
        const { password: _, ...userData } = newUser;
        set({ user: userData, isAuthenticated: true, isLoading: false });
        return true;
      },

      // Scan Actions
      addScan: async (plasticType: string, metadata: ScanMetadata, kruxEarned: number) => {
        const { user, updateStreak } = get();
        if (!user) return { success: false, message: 'Not authenticated' };
        
        // Check for fraud
        const fraudCheck = get().checkDuplicate(metadata);
        if (fraudCheck.isFraud) {
          return { success: false, message: `🚫 FRAUD DETECTED: ${fraudCheck.reason}` };
        }
        
        const newScan: ScanRecord = {
          id: Date.now().toString(),
          userId: user.id,
          plasticType,
          timestamp: Date.now(),
          metadata,
          kruxEarned,
          verified: true,
        };
        
        set(state => ({
          scanRecords: [...state.scanRecords, newScan],
          scanMetadataHistory: [...state.scanMetadataHistory, metadata],
        }));
        
        // Update user stats
        set(state => ({
          user: state.user ? {
            ...state.user,
            kruxBalance: state.user.kruxBalance + kruxEarned,
            greenScore: state.user.greenScore + kruxEarned * 2,
            totalScans: state.user.totalScans + 1,
            co2Saved: state.user.co2Saved + 0.5,
            waterSaved: state.user.waterSaved + 2,
            plasticRecycled: state.user.plasticRecycled + 0.05,
          } : null,
        }));
        
        // Add XP for scan
        get().addXP(50);
        
        // Update challenge progress for scan
        get().updateChallengeProgress('scan_3', 1);
        if (plasticType.toLowerCase().includes('pet')) {
          get().updateChallengeProgress('scan_pet', 1);
        }
        
        // Store metadata in localStorage for persistence
        const storedMetadata = localStorage.getItem('krux_scan_metadata');
        const metadataList = storedMetadata ? JSON.parse(storedMetadata) : [];
        metadataList.push(metadata);
        localStorage.setItem('krux_scan_metadata', JSON.stringify(metadataList));
        
        updateStreak();
        
        return { success: true, message: `+${kruxEarned} KRUX earned!` };
      },

      checkDuplicate: (metadata: ScanMetadata) => {
        const storedMetadata = localStorage.getItem('krux_scan_metadata');
        const existingScans: ScanMetadata[] = storedMetadata ? JSON.parse(storedMetadata) : [];
        return checkForFraud(metadata, existingScans);
      },

      // Coin Actions
      addKrux: (amount: number) => {
        set(state => ({
          user: state.user ? {
            ...state.user,
            kruxBalance: state.user.kruxBalance + amount,
          } : null,
          showRewardAnimation: true,
        }));
        setTimeout(() => set({ showRewardAnimation: false }), 600);
      },

      deductKrux: (amount: number) => {
        const { user } = get();
        if (!user || user.kruxBalance < amount) return false;
        
        set(state => ({
          user: state.user ? {
            ...state.user,
            kruxBalance: state.user.kruxBalance - amount,
          } : null,
        }));
        return true;
      },

      setOptimisticKrux: (amount: number) => {
        set({ pendingKrux: amount });
      },

      revertOptimisticKrux: (amount: number) => {
        set(state => ({
          user: state.user ? {
            ...state.user,
            kruxBalance: state.user.kruxBalance - amount,
          } : null,
          pendingKrux: 0,
        }));
      },

      // Marketplace Actions
      addToCart: (productId: string) => {
        set(state => {
          const existing = state.cart.find(item => item.productId === productId);
          if (existing) {
            return {
              cart: state.cart.map(item =>
                item.productId === productId
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }
          return { cart: [...state.cart, { productId, quantity: 1 }] };
        });
      },

      removeFromCart: (productId: string) => {
        set(state => ({
          cart: state.cart.filter(item => item.productId !== productId),
        }));
      },

      updateCartQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        set(state => ({
          cart: state.cart.map(item =>
            item.productId === productId ? { ...item, quantity } : item
          ),
        }));
      },

      checkout: async (deliveryInfo: DeliveryInfo) => {
        const { cart, products, user, deductKrux } = get();
        if (!user || cart.length === 0) return false;
        
        const total = cart.reduce((sum, item) => {
          const product = products.find(p => p.id === item.productId);
          return sum + (product ? product.price * item.quantity : 0);
        }, 0);
        
        if (!deductKrux(total)) return false;
        
        const newOrder: Order = {
          id: Date.now().toString(),
          products: [...cart],
          total,
          deliveryInfo,
          status: 'confirmed',
          createdAt: Date.now(),
        };
        
        set(state => ({
          orders: [...state.orders, newOrder],
          cart: [],
          showRewardAnimation: true,
        }));
        
        setTimeout(() => set({ showRewardAnimation: false }), 600);
        return true;
      },

      // UI Actions
      setActiveTab: (tab: string) => set({ activeTab: tab }),
      setShowRewardAnimation: (show: boolean) => set({ showRewardAnimation: show }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      // Streak
      updateStreak: () => {
        const { user } = get();
        if (!user) return;
        
        const today = new Date().toDateString();
        const lastScan = user.lastScanDate;
        
        let newStreak = user.streak;
        if (lastScan) {
          const lastDate = new Date(lastScan);
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (lastDate.toDateString() === yesterday.toDateString()) {
            newStreak = user.streak + 1;
          } else if (lastDate.toDateString() !== today) {
            // Missed a day - try to use streak freeze
            if ((user.streakFreezes || 0) > 0) {
              set(state => ({
                user: state.user ? {
                  ...state.user,
                  streakFreezes: (state.user.streakFreezes || 1) - 1,
                  lastScanDate: today,
                  lastActiveDate: today,
                } : null,
              }));
              return;
            }
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }
        
        set(state => ({
          user: state.user ? {
            ...state.user,
            streak: newStreak,
            lastScanDate: today,
            lastActiveDate: today,
          } : null,
        }));
      },

      // Feature 1: Badges
      checkAndAwardBadges: () => {
        const { user } = get();
        if (!user) return [];
        const earned = user.badges || [];
        const newBadges: string[] = [];
        
        const check = (id: string, condition: boolean) => {
          if (condition && !earned.includes(id)) newBadges.push(id);
        };
        
        check('first_scan', user.totalScans >= 1);
        check('scan_10', user.totalScans >= 10);
        check('scan_50', user.totalScans >= 50);
        check('scan_100', user.totalScans >= 100);
        check('streak_7', user.streak >= 7);
        check('streak_30', user.streak >= 30);
        check('krux_100', user.kruxBalance >= 100);
        check('krux_500', user.kruxBalance >= 500);
        check('eco_warrior', user.greenScore >= 1000);
        check('planet_savior', user.co2Saved >= 10);
        
        if (newBadges.length > 0) {
          const allBadges = [...earned, ...newBadges];
          set(state => ({
            user: state.user ? { ...state.user, badges: allBadges } : null,
          }));
        }
        return newBadges;
      },

      // Feature 2: Challenges
      updateChallengeProgress: (challengeId: string, amount = 1) => {
        const { user } = get();
        if (!user) return;
        
        // Reset daily if needed
        const today = new Date().toDateString();
        const lastReset = user.lastChallengeReset;
        let currentProgress = { ...(user.challengeProgress || {}) };
        let weeklyProgress = user.weeklyChallengeProgress || 0;
        
        if (lastReset !== today) {
          currentProgress = {};
          set(state => ({
            user: state.user ? {
              ...state.user,
              challengeProgress: {},
              lastChallengeReset: today,
            } : null,
          }));
        }
        
        // Reset weekly if needed
        const lastWeeklyReset = user.lastWeeklyReset;
        const weekStart = getWeekStart();
        if (lastWeeklyReset !== weekStart) {
          weeklyProgress = 0;
          set(state => ({
            user: state.user ? {
              ...state.user,
              weeklyChallengeProgress: 0,
              lastWeeklyReset: weekStart,
            } : null,
          }));
        }
        
        const prevVal = currentProgress[challengeId] || 0;
        const newVal = prevVal + amount;
        
        const dailyTargets: Record<string, number> = { scan_3: 3, scan_pet: 1, open_app: 1 };
        const target = dailyTargets[challengeId];
        
        // Award bonus KRUX when challenge completed
        if (target && prevVal < target && newVal >= target) {
          const bonuses: Record<string, number> = { scan_3: 25, scan_pet: 15, open_app: 5 };
          const bonus = bonuses[challengeId] || 0;
          if (bonus > 0) get().addKrux(bonus);
          get().addXP(25);
        }
        
        // Update weekly scan progress
        if (challengeId === 'scan_3' || challengeId === 'scan_pet') {
          const newWeekly = weeklyProgress + amount;
          if (weeklyProgress < 10 && newWeekly >= 10) {
            get().addKrux(100);
            get().addXP(50);
          }
          set(state => ({
            user: state.user ? {
              ...state.user,
              challengeProgress: { ...state.user.challengeProgress, [challengeId]: newVal },
              weeklyChallengeProgress: newWeekly,
            } : null,
          }));
          return;
        }
        
        set(state => ({
          user: state.user ? {
            ...state.user,
            challengeProgress: { ...state.user.challengeProgress, [challengeId]: newVal },
          } : null,
        }));
      },

      resetDailyChallenges: () => {
        const today = new Date().toDateString();
        set(state => ({
          user: state.user ? {
            ...state.user,
            challengeProgress: {},
            lastChallengeReset: today,
          } : null,
        }));
        // Auto-complete "open app" challenge
        get().updateChallengeProgress('open_app', 1);
      },

      // Feature 3: Streak Freeze
      buyStreakFreeze: () => {
        const { user, deductKrux } = get();
        if (!user) return false;
        if ((user.streakFreezes || 0) >= 3) return false;
        if (!deductKrux(50)) return false;
        set(state => ({
          user: state.user ? {
            ...state.user,
            streakFreezes: (state.user.streakFreezes || 0) + 1,
          } : null,
        }));
        return true;
      },

      // Feature 4: Spin Wheel
      spinWheel: () => {
        const { user } = get();
        if (!user) return null;
        const today = new Date().toDateString();
        if (user.lastSpinDate === today) return null;
        
        const segments = [
          { reward: '5 KRUX', krux: 5, type: 'common', weight: 30 },
          { reward: '10 KRUX', krux: 10, type: 'common', weight: 25 },
          { reward: '15 KRUX', krux: 15, type: 'uncommon', weight: 20 },
          { reward: '25 KRUX', krux: 25, type: 'rare', weight: 12 },
          { reward: '50 KRUX', krux: 50, type: 'epic', weight: 5 },
          { reward: '2x Next Scan', krux: 0, type: 'rare', weight: 5 },
          { reward: 'Streak Freeze', krux: 0, type: 'rare', weight: 2 },
          { reward: '100 KRUX', krux: 100, type: 'legendary', weight: 1 },
        ];
        
        const totalWeight = segments.reduce((s, seg) => s + seg.weight, 0);
        let rand = Math.random() * totalWeight;
        let result = segments[0];
        for (const seg of segments) {
          rand -= seg.weight;
          if (rand <= 0) { result = seg; break; }
        }
        
        set(state => ({
          user: state.user ? { ...state.user, lastSpinDate: today } : null,
        }));
        
        if (result.krux > 0) get().addKrux(result.krux);
        if (result.type === 'rare' && result.reward === 'Streak Freeze') {
          set(state => ({
            user: state.user ? {
              ...state.user,
              streakFreezes: Math.min((state.user.streakFreezes || 0) + 1, 3),
            } : null,
          }));
        }
        
        return result;
      },

      // Feature 5: XP
      addXP: (amount: number) => {
        const xpLevels = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5000, 7000, 9000, 12000, 15000, 20000, 26000, 33000, 41000, 50000, 60000];
        set(state => {
          if (!state.user) return state;
          const newXP = (state.user.xp || 0) + amount;
          let newLevel = state.user.level || 1;
          while (newLevel < xpLevels.length && newXP >= xpLevels[newLevel]) newLevel++;
          return { user: { ...state.user, xp: newXP, level: newLevel } };
        });
      },

      // Feature 6: Referral
      applyReferralCode: (code: string) => {
        const { user } = get();
        if (!user || user.referredBy) return false;
        if (code === user.referralCode) return false;
        
        // Award new user bonus
        get().addKrux(25);
        set(state => ({
          user: state.user ? { ...state.user, referredBy: code } : null,
        }));
        
        // In a real app would reward the referrer server-side
        return true;
      },

      // Initialize
      initializeApp: () => {
        const storedMetadata = localStorage.getItem('krux_scan_metadata');
        if (storedMetadata) {
          set({ scanMetadataHistory: JSON.parse(storedMetadata) });
        }
        // Auto-complete "open app" daily challenge
        const { user } = get();
        if (user) {
          const today = new Date().toDateString();
          if (user.lastChallengeReset !== today) {
            get().resetDailyChallenges();
          } else {
            // ensure open_app is done
            const prog = user.challengeProgress || {};
            if (!prog['open_app'] || prog['open_app'] < 1) {
              get().updateChallengeProgress('open_app', 1);
            }
          }
          // Add daily login XP
          if (user.lastActiveDate !== today) {
            get().addXP(10);
            set(state => ({
              user: state.user ? { ...state.user, lastActiveDate: today } : null,
            }));
          }
        }
      },
    }),
    {
      name: 'krux-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        scanRecords: state.scanRecords,
        cart: state.cart,
        orders: state.orders,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          state.user = migrateUser(state.user);
        }
      },
    }
  )
);
