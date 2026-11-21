'use client';

import { useState, useEffect } from 'react';
import { 
  Bike, 
  MapPin, 
  Phone, 
  Navigation, 
  QrCode, 
  Banknote, 
  Check, 
  CheckCircle2, 
  Clock, 
  ShoppingBag, 
  Bell, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  ChevronRight, 
  ArrowLeft,
  Store,
  DollarSign,
  ShieldCheck,
  Volume2,
  Sparkles,
  User,
  Package
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface OrderItem {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  unit?: string;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  latitude?: number;
  longitude?: number;
  items: string | OrderItem[];
  subtotal: number;
  delivery_fee: number;
  handling_fee: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  status: 'received' | 'approved' | 'preparing' | 'dispatched' | 'arrived' | 'delivered' | 'cancelled';
  delivery_notes?: string;
  assigned_branch_name?: string;
  branch_distance_km?: number;
  rider_name?: string;
  rider_phone?: string;
  arrival_time?: string;
  payment_collected_by?: string;
  created_at: string;
  updated_at: string;
}

export default function RiderPortalPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [selectedOrderForQr, setSelectedOrderForQr] = useState<Order | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Rider Access Protection Gate
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  // Default rider profile
  const riderProfile = {
    name: 'Rajesh Kumar',
    phone: '+91 98765 00001',
    vehicleNo: 'KA 03 MD 4521',
    hub: 'Annasandrapalya Branch Hub'
  };

  useEffect(() => {
    try {
      const auth = sessionStorage.getItem('mdfresh_rider_auth');
      if (auth === 'true') {
        setIsAuthenticated(true);
      }
    } catch (e) {}
    setIsCheckingAuth(false);
  }, []);

  const handleRiderLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === '1234') {
      try {
        sessionStorage.setItem('mdfresh_rider_auth', 'true');
      } catch (e) {}
      setIsAuthenticated(true);
      setPinError('');
    } else {
      setPinError('Invalid Passcode. Enter 4-digit Partner PIN (Default: 1234)');
    }
  };

  const handleRiderLogout = () => {
    try {
      sessionStorage.removeItem('mdfresh_rider_auth');
    } catch (e) {}
    setIsAuthenticated(false);
    setPinInput('');
  };

  // Fetch orders from database
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Failed to fetch deliveries');
      const data: Order[] = await res.json();
      setOrders(data || []);
    } catch (err) {
      console.warn('Error loading rider orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3500);
    return () => clearInterval(interval);
  }, []);

  // Update order status (Dispatch, Arrived, Delivered, Payment)
  const handleUpdateStatus = async (orderId: string, updates: Partial<Order>) => {
    setActionLoadingId(orderId);
    setActionNotice(null);

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          rider_name: riderProfile.name,
          rider_phone: riderProfile.phone,
        }),
      });

      if (!res.ok) throw new Error('Failed to update order status');

      if (updates.status === 'arrived') {
        setActionNotice(`🔔 Customer notified! Arrival chime and alert sent to customer for Order #${orderId}`);
        // Play doorbell audio alert
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(659.25, ctx.currentTime);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.8);
          }
        } catch (e) {}
      } else if (updates.status === 'delivered') {
        setActionNotice(`✅ Order #${orderId} marked as successfully delivered!`);
      } else if (updates.payment_status?.includes('Paid')) {
        setActionNotice(`💰 Payment confirmed for Order #${orderId}!`);
        setSelectedOrderForQr(null);
      }

      await fetchOrders();
    } catch (err: any) {
      alert('Error updating delivery: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Active deliveries: received, approved, dispatched, arrived
  const activeOrders = orders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  );
  const completedOrders = orders.filter((o) => o.status === 'delivered');

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-amber-50/50 flex items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // PASSCODE ACCESS CONTROL GATE FOR DELIVERY PARTNERS
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-amber-50/50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
            <Bike className="w-8 h-8 text-green-600" />
          </div>

          <div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mb-2">
              RESTRICTED PARTNER ACCESS
            </span>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Delivery Partner App</h1>
            <p className="text-xs text-gray-500 mt-1">
              Authorized MD FRESH Riders Only. Enter your 4-digit partner passcode to access active delivery trips.
            </p>
          </div>

          <form onSubmit={handleRiderLogin} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••"
                autoFocus
                className="w-full text-center text-3xl font-mono tracking-[0.5em] py-3.5 px-4 bg-gray-50 border-2 border-gray-200 focus:border-green-600 focus:bg-white rounded-2xl outline-none transition"
              />
              <span className="text-[11px] text-gray-400 mt-1.5 block">
                Partner PIN: <strong className="text-green-700 font-bold">1234</strong>
              </span>
            </div>

            {pinError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
                {pinError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl text-sm shadow-md transition active:scale-[0.99] cursor-pointer"
            >
              Unlock Rider Console
            </button>
          </form>

          <div className="pt-2 border-t border-gray-100">
            <Link
              href="/"
              className="text-xs font-bold text-gray-500 hover:text-green-700 transition inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to MD FRESH Storefront</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-amber-50/50 flex flex-col font-sans">
      
      {/* ====================================================================== */}
      {/* 1. MD FRESH SIGNATURE NAVBAR (MATCHES SHOPPING HOME PAGE) */}
      {/* ====================================================================== */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)]">
        <div className="container px-4 mx-auto md:px-6">
          <div className="flex items-center justify-between h-20 gap-3 md:gap-6">
            
            {/* Logo & Portal Identity (Left) */}
            <div className="flex items-center gap-3 lg:gap-5 shrink-0">
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

              {/* Rider Status Badge */}
              <div className="hidden md:flex flex-col items-start p-1.5 rounded-2xl text-left">
                <div className="flex items-center gap-1.5 text-xs font-black text-gray-950">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span>
                  </span>
                  <span className="uppercase tracking-wide text-green-700">Delivery Partner Portal</span>
                </div>
                <div className="text-xs font-semibold text-gray-600 truncate max-w-[220px]">
                  {riderProfile.hub}
                </div>
              </div>
            </div>

            {/* Rider Info & Actions (Right) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              
              {/* Online Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-800 border border-green-200 rounded-xl text-xs font-black shadow-xs">
                <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                <span className="hidden sm:inline">Online •</span> {riderProfile.name.split(' ')[0]}
              </div>

              {/* Live Sync Button */}
              <button
                onClick={fetchOrders}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                title="Sync with Live Orders"
              >
                <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
                <span className="hidden sm:inline">Sync</span>
              </button>

              {/* Lock / Logout Button */}
              <button
                onClick={handleRiderLogout}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                title="Lock Rider App"
              >
                <span>Lock</span>
              </button>

              {/* Back to Storefront Link */}
              <Link
                href="/"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-xs font-black shadow-sm transition active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Storefront</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ====================================================================== */}
      {/* 2. HERO BANNER & STATS (MATCHES HOME PAGE GREEN HERO BANNER) */}
      {/* ====================================================================== */}
      <div className="container px-4 pt-6 pb-2 mx-auto md:px-6">
        <div className="bg-gradient-to-r from-emerald-950 via-green-900 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-green-800/40 relative overflow-hidden">
          
          {/* Subtle background glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-green-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="px-3.5 py-1 bg-green-500/20 text-green-300 border border-green-500/30 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5" />
                <span>RIDER DISPATCH TERMINAL</span>
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white mt-2 leading-tight">
                Partner Delivery Operations
              </h1>
              <p className="text-xs sm:text-sm text-green-200/90 font-medium mt-1 max-w-xl">
                Real-time delivery management with Google Maps navigation, customer arrival notifications, and doorstep UPI QR & cash settlement.
              </p>
            </div>

            {/* Quick Stat Badges */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 rounded-2xl text-center min-w-[100px]">
                <div className="text-2xl sm:text-3xl font-black text-white">{activeOrders.length}</div>
                <div className="text-[10px] font-black uppercase text-green-200 tracking-wider">Active Trips</div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 rounded-2xl text-center min-w-[100px]">
                <div className="text-2xl sm:text-3xl font-black text-emerald-300">{completedOrders.length}</div>
                <div className="text-[10px] font-black uppercase text-green-200 tracking-wider">Delivered</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* 3. MAIN WORKFLOW CONTAINER */}
      {/* ====================================================================== */}
      <main className="container px-4 py-6 mx-auto md:px-6 flex-1 space-y-6 max-w-5xl">
        
        {/* Real-Time Action Notification Banner */}
        {actionNotice && (
          <div className="p-4 bg-green-600 text-white rounded-2xl shadow-md flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2.5">
              <Bell className="w-5 h-5 shrink-0 animate-bounce" />
              <span>{actionNotice}</span>
            </div>
            <button
              onClick={() => setActionNotice(null)}
              className="text-white/80 hover:text-white text-base font-black p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Navigation (Segmented Pill Buttons matching MD Fresh Categories) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-sm border ${
              activeTab === 'active'
                ? 'bg-green-600 text-white border-green-600 shadow-md scale-[1.02]'
                : 'bg-white hover:bg-green-50/70 text-gray-700 border-gray-200'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>Active Deliveries</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'active' ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {activeOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-sm border ${
              activeTab === 'completed'
                ? 'bg-green-600 text-white border-green-600 shadow-md scale-[1.02]'
                : 'bg-white hover:bg-green-50/70 text-gray-700 border-gray-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Completed Today</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'completed' ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {completedOrders.length}
            </span>
          </button>
        </div>

        {/* Delivery Cards Stream */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-gray-500">Connecting to Live Dispatch System...</p>
          </div>
        ) : (activeTab === 'active' ? activeOrders : completedOrders).length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl shadow-xs">
              🚴
            </div>
            <h3 className="text-lg font-black text-gray-900">
              {activeTab === 'active' ? 'No Active Deliveries Right Now' : 'No Deliveries Completed Yet Today'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {activeTab === 'active' 
                ? 'When a customer places an order from checkout, it will instantly appear here for pickup, navigation, and doorstep delivery!'
                : 'Completed orders for today will appear here with cash and UPI collection summaries.'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {(activeTab === 'active' ? activeOrders : completedOrders).map((ord) => {
              const parsedItems: OrderItem[] = typeof ord.items === 'string' 
                ? JSON.parse(ord.items || '[]') 
                : (ord.items || []);
              
              const isReceived = ord.status === 'received';
              const isApproved = ord.status === 'approved' || ord.status === 'preparing';
              const isDispatched = ord.status === 'dispatched';
              const isArrived = ord.status === 'arrived';
              const isDelivered = ord.status === 'delivered';
              const isPaid = ord.payment_status?.includes('Paid');

              // Google Maps directions navigation URL
              const googleMapsNavigationUrl = ord.latitude && ord.longitude
                ? `https://www.google.com/maps/dir/?api=1&destination=${ord.latitude},${ord.longitude}`
                : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ord.delivery_address)}`;

              // Dynamic UPI collection string for rider phone
              const payeeVpa = 'mdfresh@upi';
              const upiCollectUri = `upi://pay?pa=${payeeVpa}&pn=MD%20Fresh%20Delivery&am=${ord.total_amount}&cu=INR&tn=${encodeURIComponent('Payment for ' + ord.id)}&tr=${ord.id}`;
              const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(upiCollectUri)}`;

              return (
                <div
                  key={ord.id}
                  className={`bg-white rounded-3xl border p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] hover:shadow-md transition-all space-y-4 ${
                    isArrived
                      ? 'border-orange-500 ring-4 ring-orange-100'
                      : isDispatched
                      ? 'border-green-500 ring-4 ring-green-50'
                      : 'border-gray-100'
                  }`}
                >
                  
                  {/* Card Header: Order ID, Status, Hub & Total Bill */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-sm ${
                        isDelivered ? 'bg-green-600' :
                        isArrived ? 'bg-orange-500 animate-pulse' :
                        isDispatched ? 'bg-green-600' : 'bg-amber-500'
                      }`}>
                        {isDelivered ? '✓' : isArrived ? '🔔' : isDispatched ? '🚴' : '📦'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-black text-lg text-gray-950">{ord.id}</span>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isDelivered ? 'bg-green-100 text-green-900 border border-green-200' :
                            isArrived ? 'bg-orange-100 text-orange-950 border border-orange-300 animate-pulse font-extrabold' :
                            isDispatched ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                            'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}>
                            {isDelivered ? 'Delivered' :
                             isArrived ? 'At Doorstep' :
                             isDispatched ? 'On Way to Customer' :
                             'Store Packing'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-0.5 flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-green-600 shrink-0" />
                          <span>Hub: <strong className="text-gray-800">{ord.assigned_branch_name || 'Annasandrapalya Branch'}</strong></span>
                          {ord.branch_distance_km != null && <span className="text-green-700 font-bold">• {ord.branch_distance_km} km</span>}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-2xl font-black text-gray-950">₹{ord.total_amount}</div>
                      <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-lg mt-0.5 ${
                        isPaid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isPaid ? '✓ Paid' : 'Collect on Delivery'}
                      </span>
                    </div>
                  </div>

                  {/* Customer Information & One-Tap Direct Calling */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white text-gray-700 flex items-center justify-center font-black border border-gray-200 shadow-xs">
                        <User className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 block">Customer Contact</span>
                        <strong className="text-gray-900 text-sm">{ord.customer_name}</strong>
                        <span className="text-gray-600 ml-2 font-mono font-bold">{ord.customer_phone}</span>
                      </div>
                    </div>

                    <a
                      href={`tel:${ord.customer_phone}`}
                      className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black flex items-center gap-2 shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Customer</span>
                    </a>
                  </div>

                  {/* Customer Delivery Address & Google Maps Navigation Action */}
                  <div className="p-4 bg-green-50/70 border border-green-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black uppercase text-green-800 block flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-green-600" />
                        <span>Delivery Address</span>
                      </span>
                      <p className="font-bold text-gray-900 leading-snug mt-1 text-xs sm:text-sm">
                        {ord.delivery_address}
                      </p>
                      {ord.delivery_notes && (
                        <div className="text-[11px] text-green-900 mt-1 font-semibold">
                          Instructions: <strong className="text-green-950">{ord.delivery_notes}</strong>
                        </div>
                      )}
                    </div>

                    <a
                      href={googleMapsNavigationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-white hover:bg-green-600 hover:text-white text-green-800 border-2 border-green-600 rounded-xl font-black flex items-center justify-center gap-2 shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                    >
                      <Navigation className="w-4 h-4 text-green-600 group-hover:text-white" />
                      <span>Open Google Maps</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Items Summary (Badges) */}
                  <div className="text-xs space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-400 block">
                      Parcel Contents ({parsedItems.length} {parsedItems.length === 1 ? 'item' : 'items'})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {parsedItems.map((it, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-gray-100/90 rounded-xl text-gray-800 font-bold text-xs border border-gray-200/60">
                          {it.name} <strong className="text-gray-950">×{it.quantity}</strong>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* ============================================================= */}
                  {/* RIDER ACTIONS & WORKFLOW */}
                  {/* ============================================================= */}
                  <div className="pt-3 border-t border-gray-100 space-y-3">
                    
                    {/* STEP 1: START TRIP (Pick up from hub) */}
                    {(isReceived || isApproved) && (
                      <button
                        type="button"
                        disabled={actionLoadingId === ord.id}
                        onClick={() => handleUpdateStatus(ord.id, { status: 'dispatched' })}
                        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                      >
                        <Bike className="w-4 h-4" />
                        <span>Start Delivery Trip (Pick up from Store Hub)</span>
                      </button>
                    )}

                    {/* STEP 2: ARRIVED AT LOCATION & NOTIFY CUSTOMER */}
                    {isDispatched && (
                      <button
                        type="button"
                        disabled={actionLoadingId === ord.id}
                        onClick={() => handleUpdateStatus(ord.id, { 
                          status: 'arrived',
                          arrival_time: new Date().toISOString()
                        })}
                        className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                      >
                        <Bell className="w-4 h-4 animate-bounce" />
                        <span>📍 I Have Reached / Arrived at Doorstep (Notify Customer)</span>
                      </button>
                    )}

                    {/* STEP 3: PAYMENT COLLECTION & CONFIRMATION (When arrived) */}
                    {isArrived && (
                      <div className="p-5 bg-gradient-to-r from-orange-50/80 via-amber-50/70 to-green-50/80 border-2 border-orange-300 rounded-3xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-gray-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                            <span>Doorstep Payment Due: ₹{ord.total_amount}</span>
                          </span>
                          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${isPaid ? 'bg-green-200 text-green-900' : 'bg-amber-200 text-amber-900'}`}>
                            {isPaid ? '✓ Paid' : 'Collect from Customer'}
                          </span>
                        </div>

                        {!isPaid ? (
                          <div className="grid sm:grid-cols-2 gap-2.5">
                            {/* Option A: Generate UPI QR on Rider Phone */}
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForQr(ord)}
                              className="py-3 px-4 bg-white hover:bg-green-50 border-2 border-green-600 text-green-800 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-95"
                            >
                              <QrCode className="w-4 h-4 text-green-600" />
                              <span>Show Instant UPI QR Code</span>
                            </button>

                            {/* Option B: Confirm Cash Collected */}
                            <button
                              type="button"
                              disabled={actionLoadingId === ord.id}
                              onClick={() => handleUpdateStatus(ord.id, {
                                payment_status: 'Paid (Cash Collected by Rider)',
                                payment_method: 'Cash on Delivery',
                                payment_collected_by: riderProfile.name
                              })}
                              className="py-3 px-4 bg-green-700 hover:bg-green-800 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                            >
                              <Banknote className="w-4 h-4" />
                              <span>Confirm Cash Collected (₹{ord.total_amount})</span>
                            </button>
                          </div>
                        ) : (
                          <div className="p-3 bg-white rounded-2xl border border-green-200 flex items-center justify-between text-xs font-bold text-green-900">
                            <span>✓ Payment Received: ₹{ord.total_amount}</span>
                            <span className="text-[10px] text-gray-500">{ord.payment_status}</span>
                          </div>
                        )}

                        {/* STEP 4: COMPLETE ORDER & HANDOVER PARCEL */}
                        <button
                          type="button"
                          disabled={actionLoadingId === ord.id}
                          onClick={() => handleUpdateStatus(ord.id, { 
                            status: 'delivered',
                            payment_status: isPaid ? ord.payment_status : 'Paid (Handover Cash/UPI)'
                          })}
                          className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-[0.99] cursor-pointer disabled:opacity-50 mt-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Handover Parcel & Complete Delivery ✓</span>
                        </button>
                      </div>
                    )}

                    {/* COMPLETED STATUS */}
                    {isDelivered && (
                      <div className="p-3.5 bg-green-50 rounded-2xl border border-green-200 flex items-center justify-between text-xs text-green-900 font-bold">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span>Successfully Delivered to Customer</span>
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {new Date(ord.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ===================================================================== */}
      {/* 4. RIDER UPI COLLECTION QR MODAL (MATCHES MD FRESH DESIGN) */}
      {/* ===================================================================== */}
      {selectedOrderForQr && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center border border-gray-100 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Image 
                  src="/images/logo.png" 
                  alt="MD FRESH Logo" 
                  width={32} 
                  height={32} 
                  className="object-contain" 
                />
                <h3 className="font-black text-gray-900 text-sm">MD FRESH Instant UPI QR</h3>
              </div>
              <button
                onClick={() => setSelectedOrderForQr(null)}
                className="text-gray-400 hover:text-gray-700 p-1 text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                Doorstep UPI Collection
              </span>
              <div className="text-3xl font-black text-gray-900 mt-0.5">₹{selectedOrderForQr.total_amount}</div>
              <p className="text-xs text-gray-500 mt-1 font-mono">Order #{selectedOrderForQr.id}</p>
            </div>

            {/* Dynamic NPCI UPI QR */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border-2 border-green-500/40 inline-block shadow-inner">
              <div className="w-56 h-56 relative bg-white p-1 rounded-xl">
                <Image
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(`upi://pay?pa=mdfresh@upi&pn=MD%20Fresh%20Delivery&am=${selectedOrderForQr.total_amount}&cu=INR&tn=${encodeURIComponent('Payment for ' + selectedOrderForQr.id)}&tr=${selectedOrderForQr.id}`)}`}
                  alt="Rider Payment QR"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-[10px] font-black text-green-800 mt-2 block">
                Scan with PhonePe • Google Pay • Paytm • BHIM
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleUpdateStatus(selectedOrderForQr.id, {
                  payment_status: 'Paid (UPI Collected by Rider)',
                  payment_method: 'UPI to Delivery Partner',
                  payment_collected_by: riderProfile.name
                })}
                className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirm UPI Payment Received</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrderForQr(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
