import { create } from 'zustand';
import { findNearestBranch, ShopBranch, NearestBranchResult } from '@/lib/branches';

export interface UserAddress {
  id: string;
  type: 'Home' | 'Work' | 'Other';
  shortName: string;
  fullAddress: string;
  flatNo?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface OrderItem {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  image?: string;
}

export interface UserOrder {
  id: string;
  createdAt: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryFee: number;
  paymentMethod: string;
  status: 'Order Placed' | 'Packing' | 'Out for Delivery' | 'Delivered';
  deliveryAddress: string;
  assignedBranchName?: string;
  branchDistanceKm?: number;
  etaMinutes?: number;
}

interface AppState {
  // Location State
  location: string | null;
  fullAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  isLocationModalOpen: boolean;
  setLocation: (shortName: string, fullAddr?: string, lat?: number | null, lng?: number | null) => void;
  setLocationModalOpen: (isOpen: boolean) => void;

  // Nearest Branch Routing
  nearestBranch: ShopBranch | null;
  branchDistanceKm: number | null;
  deliveryEtaMinutes: number | null;

  // Saved Addresses
  addresses: UserAddress[];
  addAddress: (addr: Omit<UserAddress, 'id'>) => void;
  selectAddress: (id: string) => void;

  // Search State
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Auth State
  isAuthenticated: boolean;
  user: {
    phone: string;
    name: string;
    email?: string;
  } | null;
  isAuthModalOpen: boolean;
  setAuthenticated: (status: boolean, user?: any) => void;
  setAuthModalOpen: (isOpen: boolean) => void;
  logout: () => void;

  // Orders History
  orders: UserOrder[];
  addOrder: (order: UserOrder) => void;

  // Global UI
  isCartDrawerOpen: boolean;
  setCartDrawerOpen: (isOpen: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Location (consistent across SSR & initial client render)
  location: null,
  fullAddress: null,
  latitude: null,
  longitude: null,
  isLocationModalOpen: false,

  // Nearest Branch Routing
  nearestBranch: null,
  branchDistanceKm: null,
  deliveryEtaMinutes: null,

  setLocation: (loc, fullAddr, lat = null, lng = null) => {
    const addressToSet = fullAddr || loc;
    const routing = findNearestBranch(lat, lng, addressToSet);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('mdfresh_location', JSON.stringify(loc));
      localStorage.setItem('mdfresh_full_address', JSON.stringify(addressToSet));
      if (lat && lng) {
        localStorage.setItem('mdfresh_coords', JSON.stringify({ lat, lng }));
      }
      localStorage.setItem('mdfresh_branch', JSON.stringify(routing));
    }

    set({
      location: loc,
      fullAddress: addressToSet,
      latitude: lat,
      longitude: lng,
      nearestBranch: routing.branch,
      branchDistanceKm: routing.distanceKm,
      deliveryEtaMinutes: routing.etaMinutes,
      isLocationModalOpen: false,
    });
  },
  setLocationModalOpen: (isOpen) => set({ isLocationModalOpen: isOpen }),

  // Saved Addresses (Preset for the 4 MD FRESH Branches)
  addresses: [
    {
      id: 'addr-1',
      type: 'Home',
      shortName: 'Annasandrapalya, Bengaluru',
      fullAddress: 'Annasandrapalya Main Rd, HAL Post, Bengaluru, Karnataka 560017',
      latitude: 12.9592,
      longitude: 77.6548,
      isDefault: true,
    },
    {
      id: 'addr-2',
      type: 'Work',
      shortName: 'Kodihalli, Bengaluru',
      fullAddress: 'HAL 2nd Stage, Old Airport Rd, Kodihalli, Bengaluru, Karnataka 560008',
      latitude: 12.9631,
      longitude: 77.6499,
      isDefault: false,
    },
    {
      id: 'addr-3',
      type: 'Other',
      shortName: 'LB Shastri Nagar, Bengaluru',
      fullAddress: 'L.B. Shastri Nagar Main Rd, Vimanapura, Bengaluru, Karnataka 560017',
      latitude: 12.9645,
      longitude: 77.6625,
      isDefault: false,
    },
    {
      id: 'addr-4',
      type: 'Other',
      shortName: 'Basvanagar, Bengaluru',
      fullAddress: 'Basavanagar Main Rd, Marathahalli Post, Bengaluru, Karnataka 560037',
      latitude: 12.9692,
      longitude: 77.6807,
      isDefault: false,
    },
  ],
  addAddress: (newAddr) => {
    const addressWithId: UserAddress = {
      ...newAddr,
      id: `addr-${Date.now()}`,
    };
    const updated = [addressWithId, ...get().addresses];
    if (typeof window !== 'undefined') {
      localStorage.setItem('mdfresh_saved_addresses', JSON.stringify(updated));
    }
    set({
      addresses: updated,
      location: newAddr.shortName,
      fullAddress: newAddr.fullAddress,
      latitude: newAddr.latitude || null,
      longitude: newAddr.longitude || null,
    });
    if (newAddr.shortName) {
      get().setLocation(newAddr.shortName, newAddr.fullAddress, newAddr.latitude, newAddr.longitude);
    }
  },
  selectAddress: (id) => {
    const found = get().addresses.find((a) => a.id === id);
    if (found) {
      get().setLocation(found.shortName, found.fullAddress, found.latitude, found.longitude);
    }
  },

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Auth
  isAuthenticated: false,
  user: null,
  isAuthModalOpen: false,
  setAuthenticated: (status, user = null) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mdfresh_is_auth', JSON.stringify(status));
      localStorage.setItem('mdfresh_user', JSON.stringify(user));
    }
    set({ isAuthenticated: status, user, isAuthModalOpen: false });
  },
  setAuthModalOpen: (isOpen) => set({ isAuthModalOpen: isOpen }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mdfresh_is_auth');
      localStorage.removeItem('mdfresh_user');
    }
    set({ isAuthenticated: false, user: null });
  },

  // Orders
  orders: [],
  addOrder: (order) => {
    const updated = [order, ...get().orders];
    if (typeof window !== 'undefined') {
      localStorage.setItem('mdfresh_orders', JSON.stringify(updated));
    }
    set({ orders: updated });
  },

  // UI
  isCartDrawerOpen: false,
  setCartDrawerOpen: (isOpen) => set({ isCartDrawerOpen: isOpen }),
}));

// Load saved state from localStorage. Called once from StoreHydrator after the first
// client render, so server HTML and the first client render match.
let appStoreHydrated = false;
export function hydrateAppStore() {
  if (typeof window === 'undefined' || appStoreHydrated) return;
  appStoreHydrated = true;
  {
    try {
      const loc = localStorage.getItem('mdfresh_location') || localStorage.getItem('blinkit_location');
      const full = localStorage.getItem('mdfresh_full_address') || localStorage.getItem('blinkit_full_address');
      const isAuth = localStorage.getItem('mdfresh_is_auth') || localStorage.getItem('blinkit_is_auth');
      const u = localStorage.getItem('mdfresh_user') || localStorage.getItem('blinkit_user');
      const ord = localStorage.getItem('mdfresh_orders') || localStorage.getItem('blinkit_orders');
      const addrs = localStorage.getItem('mdfresh_saved_addresses') || localStorage.getItem('blinkit_saved_addresses');
      
      const coordsRaw = localStorage.getItem('mdfresh_coords');
      let lat: number | null = null;
      let lng: number | null = null;
      if (coordsRaw) {
        try {
          const parsed = JSON.parse(coordsRaw);
          lat = typeof parsed.lat === 'number' ? parsed.lat : parseFloat(parsed.lat);
          lng = typeof parsed.lng === 'number' ? parsed.lng : parseFloat(parsed.lng);
        } catch (e) {}
      }

      const effectiveLoc = loc ? JSON.parse(loc) : 'Annasandrapalya, Bengaluru';
      const effectiveFull = full ? JSON.parse(full) : 'Annasandrapalya Main Rd, HAL Post, Bengaluru, Karnataka 560017';
      const routing = findNearestBranch(lat, lng, effectiveFull);

      useAppStore.setState({
        location: effectiveLoc,
        fullAddress: effectiveFull,
        latitude: lat,
        longitude: lng,
        nearestBranch: routing.branch,
        branchDistanceKm: routing.distanceKm,
        deliveryEtaMinutes: routing.etaMinutes,
        ...(isAuth ? { isAuthenticated: JSON.parse(isAuth) } : {}),
        ...(u ? { user: JSON.parse(u) } : {}),
        ...(ord ? { orders: JSON.parse(ord) } : {}),
        ...(addrs ? { addresses: JSON.parse(addrs) } : {}),
      });
    } catch (e) {
      console.warn('Store client hydration error:', e);
    }
  }
}
