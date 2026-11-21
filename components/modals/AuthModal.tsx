'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ArrowRight, 
  Phone, 
  ShieldCheck, 
  User, 
  LogOut, 
  CheckCircle2, 
  ShoppingBag, 
  Sparkles 
} from 'lucide-react';
import Image from 'next/image';
import { useAppStore } from '@/store/useAppStore';

export default function AuthModal() {
  const { 
    isAuthModalOpen, 
    setAuthModalOpen, 
    isAuthenticated, 
    user, 
    setAuthenticated, 
    logout, 
    orders 
  } = useAppStore();

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      setError('');
    }
  }, [isAuthenticated, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (phone.length === 10) {
      const displayName = name.trim() || `Customer ${phone.slice(-4)}`;
      setAuthenticated(true, {
        phone: `+91 ${phone}`,
        name: displayName,
      });
      setAuthModalOpen(false);
    } else {
      setError('Please enter a valid 10-digit mobile number');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-3xl border border-gray-100"
        >
          {/* Close Button */}
          <button
            onClick={() => setAuthModalOpen(false)}
            className="absolute z-20 p-2 text-white/80 transition-colors bg-white/20 backdrop-blur-md rounded-full top-4 right-4 hover:bg-white/30 hover:text-white shadow-sm cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* MD FRESH Brand Header */}
          <div className="relative bg-gradient-to-br from-green-700 via-emerald-600 to-green-800 p-6 pt-7 pb-6 text-white overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-green-200" />
                <span className="text-[10px] font-black uppercase tracking-wider text-white">
                  100% Farm Fresh Guarantee
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white p-1.5 shadow-md shrink-0 flex items-center justify-center">
                <Image 
                  src="/images/logo.png" 
                  alt="MD FRESH" 
                  width={38} 
                  height={38} 
                  className="object-contain"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-black tracking-tight text-white leading-tight">
                  {isAuthenticated ? 'Your Account' : 'Welcome to MD FRESH'}
                </h2>
                <p className="text-xs font-medium text-green-100 mt-0.5 truncate">
                  {isAuthenticated
                    ? `Logged in as ${user?.phone || 'Customer'}`
                    : 'Sign in to get farm-fresh produce delivered'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {!isAuthenticated ? (
              <motion.form
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
                    {error}
                  </div>
                )}

                {/* Phone input */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                    Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-0 pl-4 flex items-center gap-1.5 text-gray-600 font-bold text-sm pointer-events-none">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 10-digit number"
                      className="w-full py-3.5 pl-20 pr-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white text-base font-bold tracking-wide text-gray-900 transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Optional Name */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-700">
                    Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Saquib Ali Khan"
                    className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white text-sm font-medium text-gray-900 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={phone.length < 10}
                  className="flex items-center justify-center w-full py-4 font-black text-white transition-all bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-700 hover:to-emerald-700 rounded-2xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group shadow-md shadow-green-600/20 active:scale-[0.98]"
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </button>

                <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-gray-400">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span>100% Safe & Instant Login</span>
                </div>
              </motion.form>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white font-black text-xl flex items-center justify-center shadow-sm">
                    {user?.name?.[0] || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-base text-gray-900 truncate">
                      {user?.name || 'Valued Customer'}
                    </h3>
                    <p className="text-xs text-gray-500 font-semibold">{user?.phone}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-green-100 text-green-800 text-[10px] font-black uppercase rounded-lg">
                    Active
                  </span>
                </div>

                {/* Order count / quick stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-green-50/70 border border-green-200/60 rounded-2xl">
                    <div className="text-[10px] uppercase font-bold text-green-800">Total Orders</div>
                    <div className="text-xl font-black text-green-950 mt-0.5">
                      {orders.length}
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl">
                    <div className="text-[10px] uppercase font-bold text-emerald-800">Quality Promise</div>
                    <div className="text-sm font-black text-emerald-950 mt-1">
                      100% Farm Fresh
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(false)}
                    className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-2xl transition cursor-pointer"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setPhone('');
                      setName('');
                    }}
                    className="py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-2xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
