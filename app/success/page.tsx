'use client';

import { Suspense, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Check, 
  MapPin, 
  Phone, 
  ShoppingBag, 
  ArrowRight, 
  Package, 
  Bike, 
  Sparkles,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Store,
  Navigation
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface OrderData {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  latitude?: number;
  longitude?: number;
  assigned_branch_id?: string;
  assigned_branch_name?: string;
  branch_distance_km?: number;
  items: any[];
  subtotal: number;
  delivery_fee: number;
  handling_fee: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  status: 'received' | 'approved' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled';
  delivery_notes?: string;
  created_at: string;
  updated_at: string;
}

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || '';

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch live order from database API and poll every 3 seconds
  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) throw new Error('Order not found');
        const data = await res.json();
        if (isMounted) {
          setOrder(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Could not load order details');
          setLoading(false);
        }
      }
    };

    fetchOrder();

    // Poll every 3 seconds for live updates from store manager
    const interval = setInterval(fetchOrder, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [orderId]);

  // Determine stage (1: received, 2: approved/preparing, 3: dispatched, 4: delivered)
  const getStage = (status?: string) => {
    switch (status) {
      case 'received':
        return 1;
      case 'approved':
      case 'preparing':
        return 2;
      case 'dispatched':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 1;
    }
  };

  const stage = getStage(order?.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/60 via-emerald-50/40 to-teal-50/60 py-8 px-4 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-3xl shadow-xl border border-gray-100 max-w-lg w-full overflow-hidden"
      >
        {/* Top Status Header */}
        <div className={`p-6 text-white relative overflow-hidden transition-all duration-500 ${
          stage === 4 
            ? 'bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700'
            : stage === 3
            ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-600'
            : stage === 2
            ? 'bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700'
            : 'bg-gradient-to-br from-amber-600 via-orange-600 to-yellow-600'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              Live Order Tracker
            </span>
            <span className="text-xs font-mono font-bold text-white/90">
              ID: {orderId || 'MD-FRESH'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/90 text-gray-900 flex items-center justify-center shrink-0 shadow-md">
              {stage === 4 ? (
                <Check className="w-8 h-8 text-green-600 stroke-[3]" />
              ) : stage === 3 ? (
                <Bike className="w-8 h-8 text-blue-600" />
              ) : stage === 2 ? (
                <Package className="w-8 h-8 text-green-600" />
              ) : (
                <Clock className="w-8 h-8 text-amber-600 animate-spin" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-tight text-white">
                {stage === 4
                  ? 'Delivered Successfully!'
                  : stage === 3
                  ? 'Out for Delivery!'
                  : stage === 2
                  ? 'Store Packing Your Items!'
                  : 'Order Placed • Awaiting Store'}
              </h1>
              <p className="text-xs text-white/90 font-medium mt-0.5">
                {stage === 4
                  ? 'Enjoy your farm-fresh fruits & vegetables'
                  : stage === 3
                  ? 'Delivery partner is en route to your address'
                  : stage === 2
                  ? 'Manager approved order. Fresh produce being packed.'
                  : 'Sent to local shop manager for approval'}
              </p>
            </div>
          </div>
        </div>

        {/* Live Delivery Progress Tracker Bar */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-gray-400 mb-4">
            <span>Instant Dispatch Status</span>
            <span className="text-green-700 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>

          <div className="relative flex items-center justify-between px-2 pt-1 pb-1">
            {/* Progress Track Line */}
            <div className="absolute left-6 right-6 top-5 h-1 bg-gray-200 -z-0">
              <div 
                className="h-full bg-green-600 transition-all duration-700 ease-out"
                style={{ 
                  width: stage === 1 ? '15%' : stage === 2 ? '50%' : stage === 3 ? '85%' : '100%' 
                }}
              ></div>
            </div>

            {/* Step 1: Placed */}
            <div className="flex flex-col items-center gap-1.5 relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-colors ${
                stage >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <Check className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-gray-800 text-center">Placed</span>
            </div>

            {/* Step 2: Approved / Packing */}
            <div className="flex flex-col items-center gap-1.5 relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-colors ${
                stage >= 2 ? 'bg-green-600 text-white' : stage === 1 ? 'bg-amber-500 text-white animate-pulse' : 'bg-gray-200 text-gray-500'
              }`}>
                <Package className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-gray-800 text-center">Approved</span>
            </div>

            {/* Step 3: Dispatched */}
            <div className="flex flex-col items-center gap-1.5 relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-colors ${
                stage >= 3 ? 'bg-blue-600 text-white animate-bounce' : 'bg-gray-200 text-gray-400'
              }`}>
                <Bike className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-gray-800 text-center">On Way</span>
            </div>

            {/* Step 4: Delivered */}
            <div className="flex flex-col items-center gap-1.5 relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-colors ${
                stage >= 4 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'
              }`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-gray-800 text-center">Delivered</span>
            </div>
          </div>
        </div>

        {/* Live Delivery Details */}
        <div className="p-6 space-y-4">
          
          {/* Real-time Status Card Notice */}
          {stage === 1 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
              <Store className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-amber-900 block">Pending Shop Manager Approval</span>
                <span className="text-amber-700">The store manager is preparing your produce. This page updates in real-time!</span>
              </div>
            </div>
          )}

          {stage === 2 && (
            <div className="p-3.5 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
              <Package className="w-5 h-5 text-green-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-green-900 block">Order Approved by Store Manager!</span>
                <span className="text-green-700">Farm-fresh produce is currently being hand-selected and weighed for dispatch.</span>
              </div>
            </div>
          )}

          {stage === 3 && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
              <Truck className="w-5 h-5 text-blue-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-blue-900 block">Order Dispatched • Rider On The Way</span>
                <span className="text-blue-700">Estimated Arrival: <strong>8 to 12 minutes</strong> to your doorstep.</span>
              </div>
            </div>
          )}

          {stage === 4 && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-emerald-900 block">Order Completed & Delivered</span>
                <span className="text-emerald-700">Thank you for ordering with MD Fresh! Enjoy 100% farm-fresh nutrition.</span>
              </div>
            </div>
          )}

          {/* Branch Fulfillment Info */}
          {order?.assigned_branch_name && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Store className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider block">
                    Fulfilling Store Hub
                  </span>
                  <span className="text-xs font-bold text-gray-900 block truncate">
                    {order.assigned_branch_name}
                  </span>
                </div>
              </div>
              {order.branch_distance_km != null && (
                <span className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 rounded-lg text-xs font-black shrink-0">
                  {order.branch_distance_km} km away
                </span>
              )}
            </div>
          )}

          {/* Delivery Address Box */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                <span>Delivery Address</span>
                {order?.latitude && order?.longitude && (
                  <span className="text-green-700 font-bold flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-green-600" />
                    GPS Coords: {order.latitude.toFixed(2)}, {order.longitude.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-gray-900 mt-1 leading-snug">
                {order?.delivery_address || 'Koramangala 4th Block, Bengaluru, Karnataka 560034'}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                Recipient: <strong className="text-gray-700">{order?.customer_name || 'Customer'}</strong> • {order?.customer_phone || ''}
              </div>
            </div>
          </div>

          {/* Items Summary */}
          {order && order.items && (
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase text-gray-500">
                  Items Ordered ({Array.isArray(order.items) ? order.items.length : '1'})
                </span>
                <span className="text-xs font-black text-gray-900">
                  Total: ₹{order.total_amount}
                </span>
              </div>
              
              <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
                {Array.isArray(order.items) && order.items.map((it: any, idx: number) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <span className="text-gray-800 font-semibold truncate max-w-[220px]">
                      {it.name} ({it.quantity} {it.unit || 'unit'})
                    </span>
                    <span className="font-bold text-gray-900">₹{it.price * it.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-500 flex items-center justify-between font-semibold">
                <span>Payment: <strong className="text-gray-800">{order.payment_method}</strong></span>
                <span className="text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded">
                  {order.payment_status}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 space-y-2.5">
            <Link
              href="/"
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition shadow-md active:scale-[0.98] cursor-pointer"
            >
              <span>Back to MD FRESH Store</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
