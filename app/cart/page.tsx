'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';

// The cart lives in the slide-out drawer. /cart opens the store with the drawer open.
export default function CartPage() {
  const router = useRouter();
  const setCartDrawerOpen = useAppStore((s) => s.setCartDrawerOpen);

  useEffect(() => {
    setCartDrawerOpen(true);
    router.replace('/');
  }, [router, setCartDrawerOpen]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" aria-label="Opening cart"></div>
    </div>
  );
}
