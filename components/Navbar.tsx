'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  MapPin, 
  Search, 
  ShoppingCart, 
  User, 
  ChevronDown, 
  Zap, 
  ShieldCheck, 
  X,
  Bike,
  Store
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { useCartStore } from '@/store/cartStore';

export default function Navbar() {
  const { 
    location, 
    setLocationModalOpen, 
    isAuthenticated, 
    user, 
    setAuthModalOpen, 
    setCartDrawerOpen, 
    searchQuery, 
    setSearchQuery 
  } = useAppStore();
  
  const { getTotalItems, getTotalPrice } = useCartStore();
  const [localQuery, setLocalQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const cartItemCount = getTotalItems();
  const totalPrice = getTotalPrice();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localQuery);
    if (pathname !== '/') {
      router.push('/');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)]">
      <div className="container px-4 mx-auto md:px-6">
        <div className="flex items-center justify-between h-20 gap-3 md:gap-6">
          
          {/* Logo & Location (Left) */}
          <div className="flex items-center gap-4 lg:gap-6 shrink-0">
            <Link href="/" className="flex items-center gap-2 group">
              <Image 
                src="/images/logo.png" 
                alt="MD FRESH Logo" 
                width={56} 
                height={56} 
                className="object-contain" 
                priority
              />
              <div className="text-2xl md:text-3xl font-black tracking-tight text-transparent bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text">
                MD FRESH
              </div>
            </Link>

            <div className="hidden h-9 w-px bg-gray-200 md:block"></div>

            {/* Location Selector */}
            <button
              onClick={() => setLocationModalOpen(true)}
              className="hidden md:flex flex-col items-start hover:bg-gray-50/80 p-2 rounded-2xl transition-all border border-transparent hover:border-gray-200 text-left max-w-[210px] cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 text-xs font-black text-gray-950">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span>
                </span>
                <span className="uppercase tracking-wide text-green-700">Delivering Farm Fresh</span>
              </div>
              <div className="flex items-center text-xs font-semibold text-gray-600 group-hover:text-gray-900 w-full mt-0.5">
                <span className="truncate" suppressHydrationWarning>
                  {mounted && location ? location : 'Select location'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 ml-1 text-gray-400 shrink-0 group-hover:text-gray-700 transition-colors" />
              </div>
            </button>
          </div>

          {/* Search Bar (Center) */}
          <div className="flex-1 max-w-xl hidden md:block min-w-0 mx-2 lg:mx-4">
            <form onSubmit={handleSearch} className="relative group">
              <input
                type="text"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                placeholder='Search "apples", "mangoes", "fresh spinach", "tomatoes"...'
                className="w-full py-3 pl-11 pr-20 transition-all bg-gray-100/80 hover:bg-gray-100 border border-transparent focus:border-green-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-green-500/10 focus:bg-white text-sm font-medium text-gray-900 placeholder-gray-400"
              />
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-gray-400 group-focus-within:text-green-600 transition-colors" />
              </div>
              {localQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalQuery('');
                    setSearchQuery('');
                  }}
                  className="absolute inset-y-0 right-12 pr-1 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button 
                type="submit" 
                className="absolute inset-y-1.5 right-1.5 flex items-center justify-center px-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-xs font-bold shadow-xs cursor-pointer"
              >
                Search
              </button>
            </form>
          </div>

          {/* Actions (Right) */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {/* Delivery Partner Quick Link */}
            <Link
              href="/rider"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-black text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition shadow-xs"
              title="Delivery Partner Portal"
            >
              <Bike className="w-4 h-4 text-amber-600" />
              <span>Rider Portal</span>
            </Link>

            {/* Store Manager Quick Link */}
            <Link
              href="/admin"
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-black text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition"
              title="Store Orders & Dispatch Admin"
            >
              <Store className="w-3.5 h-3.5 text-gray-600" />
              <span>Store Hub</span>
            </Link>

            {/* Login / Profile */}
            {mounted && isAuthenticated ? (
              <button 
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 font-bold text-gray-800 transition-colors rounded-2xl bg-gray-100 hover:bg-gray-200 cursor-pointer"
              >
                <div className="w-7 h-7 rounded-xl bg-green-600 flex items-center justify-center text-white text-xs font-black shadow-xs">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-xs hidden sm:inline">{user?.name?.split(' ')[0] || 'Account'}</span>
              </button>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-4 py-2.5 text-sm font-black text-gray-800 hover:text-green-700 transition-colors rounded-xl hover:bg-gray-50 cursor-pointer"
              >
                Login
              </button>
            )}

            {/* Blinkit Style Green Cart Button */}
            <button
              onClick={() => setCartDrawerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 font-black text-white transition-all bg-green-600 hover:bg-green-700 rounded-2xl shadow-sm hover:shadow-md active:scale-95 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              {mounted && cartItemCount > 0 ? (
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[10px] uppercase font-bold text-green-100">
                    {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
                  </span>
                  <span className="text-xs font-black">₹{totalPrice}</span>
                </div>
              ) : (
                <span className="text-xs font-bold">My Cart</span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search & Location Bar */}
        <div className="pb-3 md:hidden flex flex-col gap-2.5">
          <button
            onClick={() => setLocationModalOpen(true)}
            className="flex items-center justify-between text-left p-2 rounded-xl bg-gray-50 border border-gray-100"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-green-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] font-black text-green-700 uppercase">Farm Fresh Delivery</div>
                <div className="text-xs font-bold text-gray-900 truncate" suppressHydrationWarning>
                  {mounted && location ? location : 'Select delivery address'}
                </div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          </button>

          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="Search fruits, vegetables & groceries..."
              className="w-full py-2.5 pl-10 pr-14 bg-gray-100 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-green-500"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <button 
              type="submit" 
              className="absolute right-1 top-1 bottom-1 px-3 bg-green-600 text-white rounded-lg text-xs font-bold"
            >
              Go
            </button>
          </form>

          {/* Mobile Quick Links: Rider & Store Manager */}
          <div className="flex items-center gap-2 pt-0.5">
            <Link
              href="/rider"
              className="flex-1 py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-center text-[11px] font-black flex items-center justify-center gap-1.5"
            >
              <Bike className="w-3.5 h-3.5 text-amber-600" />
              <span>Rider Portal</span>
            </Link>
            <Link
              href="/admin"
              className="flex-1 py-1.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-xl text-center text-[11px] font-black flex items-center justify-center gap-1.5"
            >
              <Store className="w-3.5 h-3.5 text-gray-600" />
              <span>Store Hub</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
