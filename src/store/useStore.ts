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
  updateProfile: (data: { name: string; location: string; avatar: string }) => void;
  
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
          set({ user: userData, isAuthenticated: true, isLoading: false });
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
        };

        users.push(newUser);
        localStorage.setItem('krux_users', JSON.stringify(users));

        const { password: _, ...userData } = newUser;
        set({ user: userData, isAuthenticated: true, isLoading: false });
        return true;
      },

      updateProfile: (data: { name: string; location: string; avatar: string }) => {
        const { user } = get();
        if (!user) return;

        // Update local state
        set(state => ({
          user: state.user ? { ...state.user, ...data } : null,
        }));

        // Update localStorage
        const storedUsers = localStorage.getItem('krux_users');
        const users = storedUsers ? JSON.parse(storedUsers) : [];
        const userIndex = users.findIndex((u: any) => u.email === user.email);

        if (userIndex !== -1) {
          users[userIndex] = { ...users[userIndex], ...data };
          localStorage.setItem('krux_users', JSON.stringify(users));
        }
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
          } : null,
        }));
      },

      // Initialize
      initializeApp: () => {
        const storedMetadata = localStorage.getItem('krux_scan_metadata');
        if (storedMetadata) {
          set({ scanMetadataHistory: JSON.parse(storedMetadata) });
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
    }
  )
);
