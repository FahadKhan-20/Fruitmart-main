import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Product } from '@/types/product';
import { MAX_QTY_PER_ITEM } from '@/lib/pricing';

// Never more than the per-order limit, and never more than the shop has in stock.
const maxQty = (product: Product) =>
  typeof product.stock === 'number' && product.stock > 0
    ? Math.min(MAX_QTY_PER_ITEM, product.stock)
    : MAX_QTY_PER_ITEM;

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: number | string) => void;
  updateQuantity: (productId: number | string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  // Refresh cart products (price, name, stock) from the latest catalogue.
  syncProducts: (catalogue: Product[]) => void;
  hasHydrated: boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hasHydrated: false,
      addItem: (product) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.product.id === product.id);
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: Math.min(item.quantity + 1, maxQty(product)) }
                  : item,
              ),
            };
          }
          return { items: [...state.items, { product, quantity: 1 }] };
        });
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        }));
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId
              ? { ...item, quantity: Math.min(quantity, maxQty(item.product)) }
              : item,
          ),
        }));
      },
      clearCart: () => set({ items: [] }),
      syncProducts: (catalogue) => {
        if (catalogue.length === 0) return;
        const byId = new Map(catalogue.map((p) => [String(p.id), p]));
        const current = get().items;
        const next = current
          .filter((item) => byId.has(String(item.product.id)))
          .map((item) => {
            const product = byId.get(String(item.product.id))!;
            return { product, quantity: Math.min(item.quantity, maxQty(product)) };
          });
        const changed =
          next.length !== current.length ||
          next.some(
            (item, i) =>
              item.quantity !== current[i].quantity ||
              item.product.price !== current[i].product.price ||
              item.product.name !== current[i].product.name ||
              item.product.stock !== current[i].product.stock
          );
        if (changed) set({ items: next });
      },
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.product.price * item.quantity, 0);
      },
    }),
    {
      name: 'mdfresh_cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      // Rehydrated from StoreHydrator after mount, so server and first client render match.
      skipHydration: true,
      onRehydrateStorage: () => () => {
        useCartStore.setState({ hasHydrated: true });
      },
    },
  ),
);
