import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ScanMetadata, checkForFraud } from '@/utils/fraudDetection';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { signupSchema, loginSchema } from '@/utils/validation';
import { hashPassword } from '@/utils/hashPassword';

/** Shape of a user record stored in localStorage for offline/demo mode. */
interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  location: string;
  createdAt: number;
}

const LS_USERS_KEY = 'krux_users';

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
  // Feature 3: Streak Freeze
  streakFreezes: number;
  // Feature 4: Spin Wheel
  lastSpinDate: string | null;
  // Feature 5: Level / XP
  xp: number;
  level: number;
  // Feature 6: Referral
  referralCode: string;
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

// ── XP / Level constants ──────────────────────────────────────────────────────
export const XP_PER_LEVEL = [
  0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700,
  7500, 10000, 13000, 17000, 22000, 28000, 35000, 43000, 52000, 62000,
];

export const LEVEL_NAMES = [
  'Novice', 'Eco Scout', 'Green Apprentice', 'Plastic Hunter', 'Recycler',
  'Eco Warrior', 'Nature Guardian', 'Planet Defender', 'Green Champion', 'Eco Legend',
  'Master Recycler', 'Sustainability Sage', 'Earth Protector', 'Planet Savior',
  'Eco Titan', 'Green God', 'Nature Spirit', 'Universe Guardian', 'Cosmic Eco', 'Infinity Hero',
];

function computeLevel(xp: number): number {
  let lv = 1;
  for (let i = 1; i < XP_PER_LEVEL.length; i++) {
    if (xp >= XP_PER_LEVEL[i]) lv = i + 1;
    else break;
  }
  return Math.min(lv, 20);
}

// ── Badge constants ───────────────────────────────────────────────────────────
export const ALL_BADGES: Record<string, { label: string; emoji: string; desc: string }> = {
  first_scan:   { label: 'First Scan',     emoji: '🔬', desc: 'Complete your first scan' },
  scans_10:     { label: '10 Scans',       emoji: '📦', desc: 'Complete 10 scans' },
  scans_50:     { label: '50 Scans',       emoji: '🎯', desc: 'Complete 50 scans' },
  scans_100:    { label: '100 Scans',      emoji: '💯', desc: 'Complete 100 scans' },
  streak_7:     { label: '7-Day Streak',   emoji: '🔥', desc: 'Maintain a 7-day streak' },
  streak_30:    { label: '30-Day Streak',  emoji: '🌟', desc: 'Maintain a 30-day streak' },
  krux_100:     { label: '100 KRUX',       emoji: '💰', desc: 'Earn 100 KRUX total' },
  krux_500:     { label: '500 KRUX',       emoji: '🏆', desc: 'Earn 500 KRUX total' },
  eco_warrior:  { label: 'Eco Warrior',    emoji: '🦸', desc: 'Reach level 5' },
  planet_savior:{ label: 'Planet Savior',  emoji: '🌍', desc: 'Reach level 10' },
};

// ── Challenge constants ───────────────────────────────────────────────────────
export const DAILY_CHALLENGES = [
  { id: 'scan_3',     label: 'Scan 3 items today',   target: 3,   reward: 20, type: 'daily' },
  { id: 'earn_30',    label: 'Earn 30 KRUX today',   target: 30,  reward: 15, type: 'daily' },
  { id: 'no_fraud',   label: 'Clean scan streak',    target: 2,   reward: 10, type: 'daily' },
];
export const WEEKLY_CHALLENGE = { id: 'scan_20_week', label: 'Scan 20 items this week', target: 20, reward: 100, type: 'weekly' };

function generateReferralCode(id: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffff;
  for (let i = 0; i < 6; i++) { code += chars[hash % chars.length]; hash = Math.floor(hash / chars.length) || (i * 7919); }
  return code;
}

// ──────────────────────────────────────────────────────────────────────────────

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
  newBadge: string | null;
  levelUpTo: number | null;
  darkMode: boolean;

  // Auth Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  signup: (name: string, email: string, password: string, location: string) => Promise<{ success: boolean; error?: string }>;

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
  dismissNewBadge: () => void;
  dismissLevelUp: () => void;
  toggleDarkMode: () => void;

  // Streak & Freeze
  updateStreak: () => void;
  buyStreakFreeze: () => boolean;

  // Engagement Features
  spinWheel: () => number | null;
  claimSpinReward: (prize: number) => void;
  addXp: (amount: number) => void;
  updateChallengeProgress: (challengeId: string, delta: number) => void;
  resetChallengesIfNeeded: () => void;
  registerReferral: () => void;

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
    features: ['100% Recycled Cotton', 'Eco-friendly dyes', 'Exclusive KRUX design', 'Available in S, M, L, XL', 'Pre-shrunk fabric', 'Machine washable'],
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
    features: ['500ml capacity', 'Double-wall vacuum insulation', 'BPA-free', 'Leak-proof cap', 'Easy-grip design', 'Dishwasher safe'],
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
    features: ['Upcycled denim material', 'Relaxed fit', 'Multiple pockets', 'Adjustable waist', 'Available in 28-36 waist', 'Reinforced stitching'],
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
    features: ['10000mAh capacity', 'Solar + USB charging', 'Dual USB output', 'LED flashlight built-in', 'Water-resistant', 'Fast charging support'],
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
    features: ['Bluetooth 5.2', 'Active noise cancellation', '24hr total battery life', 'Bamboo charging case', 'Touch controls', 'IPX5 water resistant'],
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
    features: ['Made from ocean plastic', 'Large 15L capacity', 'Reinforced handles', 'Interior pocket', 'Machine washable', 'Removes 1kg ocean plastic'],
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
    features: ['60% organic cotton, 40% recycled polyester', 'Kangaroo pocket', 'Adjustable drawstring hood', 'Ribbed cuffs and hem', 'Exclusive artwork', 'Unisex design'],
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
    features: ['5 brightness levels', '3 color temperatures', '10W wireless charging', 'Touch controls', 'USB-C port', 'Auto-off timer'],
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
    features: ['100% recycled materials', 'Shock-absorbing design', 'Raised edges for screen protection', 'Wireless charging compatible', 'Multiple iPhone/Android models', 'Lifetime warranty'],
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
    features: ['Upper from 12 recycled bottles', 'Natural rubber sole', 'Organic cotton laces', 'Memory foam insole', 'Sizes 6-13', 'Carbon-neutral shipping'],
    rating: 4.7,
    reviews: 89,
  },
];

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', name: 'EcoChampion',  avatar: '🏆', greenScore: 15420, location: 'Mumbai',    rank: 1, streak: 45 },
  { id: '2', name: 'GreenWarrior', avatar: '🌿', greenScore: 12350, location: 'Delhi',     rank: 2, streak: 32 },
  { id: '3', name: 'PlasticHunter',avatar: '🎯', greenScore: 10890, location: 'Bangalore', rank: 3, streak: 28 },
  { id: '4', name: 'RecycleKing',  avatar: '👑', greenScore: 9540,  location: 'Chennai',   rank: 4, streak: 21 },
  { id: '5', name: 'EarthSaver',   avatar: '🌍', greenScore: 8720,  location: 'Hyderabad', rank: 5, streak: 19 },
  { id: '6', name: 'WasteNinja',   avatar: '🥷', greenScore: 7650,  location: 'Pune',      rank: 6, streak: 15 },
  { id: '7', name: 'EcoHero99',    avatar: '🦸', greenScore: 6890,  location: 'Kolkata',   rank: 7, streak: 12 },
  { id: '8', name: 'GreenVibes',   avatar: '✨', greenScore: 5430,  location: 'Ahmedabad', rank: 8, streak: 10 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function checkEarnedBadges(user: User): string[] {
  const earned: string[] = [];
  const b = user.badges;
  if (!b.includes('first_scan')    && user.totalScans >= 1)    earned.push('first_scan');
  if (!b.includes('scans_10')      && user.totalScans >= 10)   earned.push('scans_10');
  if (!b.includes('scans_50')      && user.totalScans >= 50)   earned.push('scans_50');
  if (!b.includes('scans_100')     && user.totalScans >= 100)  earned.push('scans_100');
  if (!b.includes('streak_7')      && user.streak >= 7)        earned.push('streak_7');
  if (!b.includes('streak_30')     && user.streak >= 30)       earned.push('streak_30');
  if (!b.includes('krux_100')      && user.kruxBalance >= 100) earned.push('krux_100');
  if (!b.includes('krux_500')      && user.kruxBalance >= 500) earned.push('krux_500');
  if (!b.includes('eco_warrior')   && user.level >= 5)         earned.push('eco_warrior');
  if (!b.includes('planet_savior') && user.level >= 10)        earned.push('planet_savior');
  return earned;
}

// ──────────────────────────────────────────────────────────────────────────────

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
      newBadge: null,
      levelUpTo: null,
      darkMode: false,

      // Auth Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true });

        // Validate inputs
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) {
          set({ isLoading: false });
          return { success: false, error: parsed.error.issues[0].message };
        }

        // Try Supabase Auth when configured
        if (isSupabaseConfigured) {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: parsed.data.email,
            password: parsed.data.password,
          });

          if (!authError && authData.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .single();

            if (profile) {
              const userData: User = {
                id: authData.user.id,
                name: profile.name as string,
                email: authData.user.email ?? email,
                avatar: profile.avatar as string,
                kruxBalance: profile.krux_balance as number,
                greenScore: profile.green_score as number,
                streak: profile.streak as number,
                lastScanDate: profile.last_scan_date as string | null,
                totalScans: profile.total_scans as number,
                co2Saved: Number(profile.co2_saved),
                waterSaved: Number(profile.water_saved),
                plasticRecycled: Number(profile.plastic_recycled),
                location: profile.location as string,
                rank: 0,
                badges: (profile.badges as string[]) ?? [],
                challengeProgress: (profile.challenge_progress as Record<string, number>) ?? {},
                lastChallengeReset: profile.last_challenge_reset as string | null,
                streakFreezes: profile.streak_freezes as number,
                lastSpinDate: profile.last_spin_date as string | null,
                xp: profile.xp as number,
                level: profile.level as number,
                referralCode: profile.referral_code as string,
                referralCount: profile.referral_count as number,
              };
              set({ user: userData, isAuthenticated: true, isLoading: false });
              return { success: true };
            }
          }

          set({ isLoading: false });
          return { success: false, error: 'Invalid email or password' };
        }

        // localStorage fallback (offline/demo mode)
        const storedRaw = localStorage.getItem(LS_USERS_KEY);
        const storedUsers: StoredUser[] = storedRaw ? JSON.parse(storedRaw) : [];
        const pwHash = await hashPassword(parsed.data.password);
        const match = storedUsers.find(
          u => u.email.toLowerCase() === parsed.data.email.toLowerCase() && u.passwordHash === pwHash,
        );

        if (!match) {
          set({ isLoading: false });
          return { success: false, error: 'Invalid email or password' };
        }

        // Restore user from persisted store state (if available) or reconstruct defaults
        const persistedRaw = localStorage.getItem('krux-storage');
        let restoredUser: User | null = null;
        if (persistedRaw) {
          try {
            const persistedState = JSON.parse(persistedRaw);
            const persistedUser: User | null = persistedState?.state?.user ?? null;
            if (persistedUser && persistedUser.id === match.id) {
              restoredUser = persistedUser;
            }
          } catch (e) {
            console.warn('Failed to restore persisted user state:', e);
          }
        }

        if (!restoredUser) {
          restoredUser = {
            id: match.id,
            name: match.name,
            email: match.email,
            avatar: '🌱',
            kruxBalance: 50,
            greenScore: 0,
            streak: 0,
            lastScanDate: null,
            totalScans: 0,
            co2Saved: 0,
            waterSaved: 0,
            plasticRecycled: 0,
            location: match.location,
            rank: 0,
            badges: [],
            challengeProgress: {},
            lastChallengeReset: null,
            streakFreezes: 0,
            lastSpinDate: null,
            xp: 0,
            level: 1,
            referralCode: generateReferralCode(match.id),
            referralCount: 0,
          };
        }

        set({ user: restoredUser, isAuthenticated: true, isLoading: false });
        return { success: true };
      },

      logout: async () => {
        if (isSupabaseConfigured) {
          await supabase.auth.signOut();
        }
        set({ user: null, isAuthenticated: false, cart: [], activeTab: 'home' });
      },

      signup: async (name: string, email: string, password: string, location: string) => {
        set({ isLoading: true });

        // Validate with password-strength rules
        const parsed = signupSchema.safeParse({ name, email, password, location });
        if (!parsed.success) {
          set({ isLoading: false });
          return { success: false, error: parsed.error.issues[0].message };
        }

        // Try Supabase Auth when configured
        if (isSupabaseConfigured) {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: parsed.data.email,
            password: parsed.data.password,
            options: {
              data: { name: parsed.data.name, location: parsed.data.location },
            },
          });

          if (authError || !authData.user) {
            set({ isLoading: false });
            return { success: false, error: authError?.message ?? 'Sign up failed' };
          }

          await supabase.from('profiles').insert({
            id: authData.user.id,
            name: parsed.data.name,
            location: parsed.data.location,
            avatar: '🌱',
            krux_balance: 50,
          });

          const newUser: User = {
            id: authData.user.id,
            name: parsed.data.name,
            email: parsed.data.email,
            avatar: '🌱',
            kruxBalance: 50,
            greenScore: 0,
            streak: 0,
            lastScanDate: null,
            totalScans: 0,
            co2Saved: 0,
            waterSaved: 0,
            plasticRecycled: 0,
            location: parsed.data.location,
            rank: 0,
            badges: [],
            challengeProgress: {},
            lastChallengeReset: null,
            streakFreezes: 0,
            lastSpinDate: null,
            xp: 0,
            level: 1,
            referralCode: generateReferralCode(authData.user.id),
            referralCount: 0,
          };

          set({ user: newUser, isAuthenticated: true, isLoading: false });
          return { success: true };
        }

        // localStorage fallback (offline/demo mode)
        const storedRaw = localStorage.getItem(LS_USERS_KEY);
        const storedUsers: StoredUser[] = storedRaw ? JSON.parse(storedRaw) : [];

        const emailExists = storedUsers.some(
          u => u.email.toLowerCase() === parsed.data.email.toLowerCase(),
        );
        if (emailExists) {
          set({ isLoading: false });
          return { success: false, error: 'Email already registered' };
        }

        const id = crypto.randomUUID();
        const pwHash = await hashPassword(parsed.data.password);
        const newStoredUser: StoredUser = {
          id,
          name: parsed.data.name,
          email: parsed.data.email.toLowerCase(),
          passwordHash: pwHash,
          location: parsed.data.location,
          createdAt: Date.now(),
        };
        storedUsers.push(newStoredUser);
        localStorage.setItem(LS_USERS_KEY, JSON.stringify(storedUsers));

        const newUser: User = {
          id,
          name: parsed.data.name,
          email: parsed.data.email,
          avatar: '🌱',
          kruxBalance: 50,
          greenScore: 0,
          streak: 0,
          lastScanDate: null,
          totalScans: 0,
          co2Saved: 0,
          waterSaved: 0,
          plasticRecycled: 0,
          location: parsed.data.location,
          rank: 0,
          badges: [],
          challengeProgress: {},
          lastChallengeReset: null,
          streakFreezes: 0,
          lastSpinDate: null,
          xp: 0,
          level: 1,
          referralCode: generateReferralCode(id),
          referralCount: 0,
        };

        set({ user: newUser, isAuthenticated: true, isLoading: false });
        return { success: true };
      },

      // Scan Actions
      addScan: async (plasticType: string, metadata: ScanMetadata, kruxEarned: number) => {
        const { user, updateStreak, addXp, updateChallengeProgress } = get();
        if (!user) return { success: false, message: 'Not authenticated' };

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

        const storedMetadata = localStorage.getItem('krux_scan_metadata');
        const metadataList = storedMetadata ? JSON.parse(storedMetadata) : [];
        metadataList.push(metadata);
        localStorage.setItem('krux_scan_metadata', JSON.stringify(metadataList));

        updateStreak();
        addXp(25);
        updateChallengeProgress('scan_3', 1);
        updateChallengeProgress('earn_30', kruxEarned);
        updateChallengeProgress('no_fraud', 1);
        updateChallengeProgress('scan_20_week', 1);

        // Check badges after all updates
        const updatedUser = get().user;
        if (updatedUser) {
          const newBadges = checkEarnedBadges(updatedUser);
          if (newBadges.length > 0) {
            set(state => ({
              user: state.user ? { ...state.user, badges: [...state.user.badges, ...newBadges] } : null,
              newBadge: newBadges[0],
            }));
          }
        }

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
          user: state.user ? { ...state.user, kruxBalance: state.user.kruxBalance + amount } : null,
          showRewardAnimation: true,
        }));
        setTimeout(() => set({ showRewardAnimation: false }), 600);
        const u = get().user;
        if (u) {
          const newBadges = checkEarnedBadges(u);
          if (newBadges.length > 0) {
            set(state => ({
              user: state.user ? { ...state.user, badges: [...state.user.badges, ...newBadges] } : null,
              newBadge: newBadges[0],
            }));
          }
        }
      },

      deductKrux: (amount: number) => {
        const { user } = get();
        if (!user || user.kruxBalance < amount) return false;
        set(state => ({
          user: state.user ? { ...state.user, kruxBalance: state.user.kruxBalance - amount } : null,
        }));
        return true;
      },

      setOptimisticKrux: (amount: number) => { set({ pendingKrux: amount }); },

      revertOptimisticKrux: (amount: number) => {
        set(state => ({
          user: state.user ? { ...state.user, kruxBalance: state.user.kruxBalance - amount } : null,
          pendingKrux: 0,
        }));
      },

      // Marketplace Actions
      addToCart: (productId: string) => {
        set(state => {
          const existing = state.cart.find(item => item.productId === productId);
          if (existing) {
            return { cart: state.cart.map(item => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item) };
          }
          return { cart: [...state.cart, { productId, quantity: 1 }] };
        });
      },

      removeFromCart: (productId: string) => {
        set(state => ({ cart: state.cart.filter(item => item.productId !== productId) }));
      },

      updateCartQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) { get().removeFromCart(productId); return; }
        set(state => ({ cart: state.cart.map(item => item.productId === productId ? { ...item, quantity } : item) }));
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

        set(state => ({ orders: [...state.orders, newOrder], cart: [], showRewardAnimation: true }));
        setTimeout(() => set({ showRewardAnimation: false }), 600);
        return true;
      },

      // UI Actions
      setActiveTab: (tab: string) => set({ activeTab: tab }),
      setShowRewardAnimation: (show: boolean) => set({ showRewardAnimation: show }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      dismissNewBadge: () => set({ newBadge: null }),
      dismissLevelUp: () => set({ levelUpTo: null }),
      toggleDarkMode: () => set(state => ({ darkMode: !state.darkMode })),

      // Streak & Freeze
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
            // Missed a day - use freeze if available
            if (user.streakFreezes > 0) {
              set(state => ({
                user: state.user ? { ...state.user, streakFreezes: state.user.streakFreezes - 1 } : null,
              }));
            } else {
              newStreak = 1;
            }
          }
        } else {
          newStreak = 1;
        }

        set(state => ({
          user: state.user ? { ...state.user, streak: newStreak, lastScanDate: today } : null,
        }));

        const updated = get().user;
        if (updated) {
          const newBadges = checkEarnedBadges(updated);
          if (newBadges.length > 0) {
            set(state => ({
              user: state.user ? { ...state.user, badges: [...state.user.badges, ...newBadges] } : null,
              newBadge: newBadges[0],
            }));
          }
        }
      },

      buyStreakFreeze: () => {
        const { user, deductKrux } = get();
        if (!user || user.streakFreezes >= 3) return false;
        if (!deductKrux(50)) return false;
        set(state => ({
          user: state.user ? { ...state.user, streakFreezes: state.user.streakFreezes + 1 } : null,
        }));
        return true;
      },

      // Spin Wheel
      spinWheel: () => {
        const { user, addKrux, addXp } = get();
        if (!user) return null;

        const today = new Date().toDateString();
        if (user.lastSpinDate === today) return null;

        const prizes = [5, 10, 15, 20, 25, 30, 50, 100];
        const prize = prizes[Math.floor(Math.random() * prizes.length)];

        set(state => ({
          user: state.user ? { ...state.user, lastSpinDate: today } : null,
        }));

        addKrux(prize);
        addXp(10);
        return prize;
      },

      claimSpinReward: (prize: number) => {
        const today = new Date().toDateString();
        set(state => ({
          user: state.user ? { ...state.user, lastSpinDate: today } : null,
        }));
        get().addKrux(prize);
        get().addXp(10);
      },

      // XP / Level
      addXp: (amount: number) => {
        const { user } = get();
        if (!user) return;
        const newXp = user.xp + amount;
        const oldLevel = user.level;
        const newLevel = computeLevel(newXp);

        set(state => ({
          user: state.user ? { ...state.user, xp: newXp, level: newLevel } : null,
        }));

        if (newLevel > oldLevel) {
          set({ levelUpTo: newLevel });
          setTimeout(() => set({ levelUpTo: null }), 4000);
          const u = get().user;
          if (u) {
            const newBadges = checkEarnedBadges(u);
            if (newBadges.length > 0) {
              set(state => ({
                user: state.user ? { ...state.user, badges: [...state.user.badges, ...newBadges] } : null,
                newBadge: newBadges[0],
              }));
            }
          }
        }
      },

      // Challenges
      updateChallengeProgress: (challengeId: string, delta: number) => {
        const { user } = get();
        if (!user) return;
        get().resetChallengesIfNeeded();
        const current = user.challengeProgress[challengeId] || 0;

        const allChallenges = [...DAILY_CHALLENGES, WEEKLY_CHALLENGE];
        const challenge = allChallenges.find(c => c.id === challengeId);
        if (!challenge) return;

        const newVal = current + delta;
        const wasComplete = current >= challenge.target;
        const nowComplete = newVal >= challenge.target;

        set(state => ({
          user: state.user ? {
            ...state.user,
            challengeProgress: { ...state.user.challengeProgress, [challengeId]: newVal },
            kruxBalance: !wasComplete && nowComplete ? state.user.kruxBalance + challenge.reward : state.user.kruxBalance,
          } : null,
        }));

        if (!wasComplete && nowComplete) {
          get().addXp(20);
        }
      },

      resetChallengesIfNeeded: () => {
        const { user } = get();
        if (!user) return;
        const today = new Date().toDateString();
        if (user.lastChallengeReset !== today) {
          const weeklyProgress = user.challengeProgress[WEEKLY_CHALLENGE.id] || 0;
          const isNewWeek = (() => {
            if (!user.lastChallengeReset) return true;
            const last = new Date(user.lastChallengeReset);
            const now = new Date();
            return now.getDay() < last.getDay() || (now.getTime() - last.getTime()) >= 7 * 86400000;
          })();
          const newProgress: Record<string, number> = {};
          DAILY_CHALLENGES.forEach(c => { newProgress[c.id] = 0; });
          newProgress[WEEKLY_CHALLENGE.id] = isNewWeek ? 0 : weeklyProgress;
          set(state => ({
            user: state.user ? { ...state.user, challengeProgress: newProgress, lastChallengeReset: today } : null,
          }));
        }
      },

      // Referral
      registerReferral: () => {
        set(state => ({
          user: state.user ? {
            ...state.user,
            referralCount: state.user.referralCount + 1,
            kruxBalance: state.user.kruxBalance + 50,
          } : null,
        }));
        get().addXp(50);
      },

      // Initialize
      initializeApp: () => {
        const storedMetadata = localStorage.getItem('krux_scan_metadata');
        if (storedMetadata) {
          set({ scanMetadataHistory: JSON.parse(storedMetadata) });
        }
        get().resetChallengesIfNeeded();
        get().addXp(5); // daily login XP
      },
    }),
    {
      name: 'krux-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        scanRecords: state.scanRecords,
        scanMetadataHistory: state.scanMetadataHistory,
        cart: state.cart,
        orders: state.orders,
        darkMode: state.darkMode,
      }),
    }
  )
);
