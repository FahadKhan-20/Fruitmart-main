'use client';

import { useEffect } from 'react';
import { hydrateAppStore } from '@/store/useAppStore';
import { useCartStore } from '@/store/cartStore';

// Restores saved location, login, orders and cart after the first client render.
export default function StoreHydrator() {
  useEffect(() => {
    hydrateAppStore();
    useCartStore.persist.rehydrate();
  }, []);
  return null;
}
