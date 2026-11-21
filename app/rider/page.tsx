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
  Volume2
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
  const [cashCalcInput, setCashCalcInput] = useState<{ [orderId: string]: string }>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Default rider profile
  const riderProfile = {
    name: 'Rajesh Kumar',
    phone: '+91 98765 00001',
    vehicleNo: 'KA 03 MD 4521',
    hub: 'Annasandrapalya Branch Hub'
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
        setActionNotice(`🔔 Customer notified: Arrival notification sent to customer for Order #${orderId}!`);
        // Play audio alert on arrival
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.volume = 0.6;
          audio.play().catch(() => {});
        } catch (e) {}
      } else if (updates.status === 'delivered') {
        setActionNotice(`✅ Order #${orderId} marked as successfully delivered!`);
      } else if (updates.payment_status?.includes('Paid')) {
        setActionNotice(`💰 Payment collected successfully for Order #${orderId}!`);
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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      
      {/* Top Rider Header */}
      <header className="bg-emerald-950 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 rounded-xl transition"
              title="Back to Storefront"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-gray-950 flex items-center justify-center font-black">
                <Bike className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight leading-tight">
                  MD FRESH • Delivery Partner Portal
                </h1>
                <p className="text-[11px] text-emerald-300 font-semibold">
                  {riderProfile.name} • {riderProfile.vehicleNo}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOrders}
              className="p-2 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sync</span>
            </button>
            <span className="px-2.5 py-1 bg-emerald-500 text-gray-950 rounded-lg text-xs font-black flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-950 animate-pulse" />
              Online
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-4xl mx-auto px-4 flex gap-2 border-t border-emerald-900/60 pt-2 pb-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'active'
                ? 'bg-emerald-500 text-gray-950 shadow-sm'
                : 'text-emerald-300 hover:bg-emerald-900/50'
            }`}
          >
            <span>Active Trips</span>
            <span className="px-1.5 py-0.2 bg-emerald-900 text-white rounded text-[10px]">
              {activeOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'completed'
                ? 'bg-emerald-500 text-gray-950 shadow-sm'
                : 'text-emerald-300 hover:bg-emerald-900/50'
            }`}
          >
            <span>Completed Today</span>
            <span className="px-1.5 py-0.2 bg-emerald-900 text-white rounded text-[10px]">
              {completedOrders.length}
            </span>
          </button>
        </div>
      </header>

      {/* Main Delivery Partner Content */}
      <main className="max-w-4xl w-full mx-auto px-4 py-6 flex-1 space-y-4">
        
        {actionNotice && (
          <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-md flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <button
              onClick={() => setActionNotice(null)}
              className="text-white/80 hover:text-white text-sm font-black p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-gray-200 shadow-sm">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-gray-500">Connecting to Live Dispatch System...</p>
          </div>
        ) : (activeTab === 'active' ? activeOrders : completedOrders).length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">
              🚴
            </div>
            <h3 className="text-base font-black text-gray-900">
              {activeTab === 'active' ? 'No Active Deliveries Right Now' : 'No Deliveries Completed Yet'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {activeTab === 'active' 
                ? 'When a customer places an order from checkout, it will immediately appear here for pickup and doorstep delivery!'
                : 'Completed orders for today will appear here with cash and UPI collection summaries.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
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
                  className={`bg-white rounded-3xl border p-5 shadow-sm transition space-y-4 ${
                    isArrived
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                      : isDispatched
                      ? 'border-blue-400 ring-2 ring-blue-400/20 shadow-md'
                      : 'border-gray-200'
                  }`}
                >
                  
                  {/* Card Header: Order ID, Status & Bill Amount */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs ${
                        isDelivered ? 'bg-emerald-600' :
                        isArrived ? 'bg-emerald-500 animate-pulse' :
                        isDispatched ? 'bg-blue-600' : 'bg-amber-500'
                      }`}>
                        {isDelivered ? '✓' : isArrived ? '🔔' : isDispatched ? '🚴' : '📦'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-base text-gray-900">{ord.id}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isDelivered ? 'bg-emerald-100 text-emerald-800' :
                            isArrived ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                            isDispatched ? 'bg-blue-100 text-blue-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {isDelivered ? 'Delivered' :
                             isArrived ? 'Arrived at Doorstep' :
                             isDispatched ? 'On The Way (En Route)' :
                             'Store Packing'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Hub: <strong className="text-gray-700">{ord.assigned_branch_name || 'Annasandrapalya Branch'}</strong>
                          {ord.branch_distance_km != null && ` • ${ord.branch_distance_km} km`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-black text-gray-900">₹{ord.total_amount}</div>
                      <span className={`text-[11px] font-bold ${isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {isPaid ? '✓ Paid' : 'Collect on Delivery'}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info & Direct Call Action */}
                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 block">Customer</span>
                      <strong className="text-gray-900 text-sm">{ord.customer_name}</strong>
                      <span className="text-gray-500 ml-2 font-mono">{ord.customer_phone}</span>
                    </div>

                    <a
                      href={`tel:${ord.customer_phone}`}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Customer</span>
                    </a>
                  </div>

                  {/* Customer Delivery Address & Google Maps Navigation Action */}
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black uppercase text-blue-800 block flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-600" />
                        <span>Delivery Location</span>
                      </span>
                      <p className="font-bold text-gray-900 leading-snug mt-0.5">
                        {ord.delivery_address}
                      </p>
                      {ord.delivery_notes && (
                        <div className="text-[11px] text-blue-900 mt-1 font-semibold">
                          Note: {ord.delivery_notes}
                        </div>
                      )}
                    </div>

                    <a
                      href={googleMapsNavigationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Open Google Maps</span>
                      <ExternalLink className="w-3 h-3 text-blue-200" />
                    </a>
                  </div>

                  {/* Items Summary (Expandable / Preview) */}
                  <div className="text-xs space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-400 block">
                      Parcel Contents ({parsedItems.length} items)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {parsedItems.map((it, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-800 font-semibold text-[11px]">
                          {it.name} <strong className="text-gray-900">×{it.quantity}</strong>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* ============================================================= */}
                  {/* RIDER ACTIONS & WORKFLOW */}
                  {/* ============================================================= */}
                  <div className="pt-3 border-t border-gray-100 space-y-3">
                    
                    {/* STEP 1: START TRIP (If still received or packing) */}
                    {(isReceived || isApproved) && (
                      <button
                        type="button"
                        disabled={actionLoadingId === ord.id}
                        onClick={() => handleUpdateStatus(ord.id, { status: 'dispatched' })}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer disabled:opacity-50"
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
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer disabled:opacity-50"
                      >
                        <Bell className="w-4 h-4 animate-bounce" />
                        <span>📍 I Have Reached / Arrived at Doorstep (Notify Customer)</span>
                      </button>
                    )}

                    {/* STEP 3: PAYMENT COLLECTION & CONFIRMATION (When arrived) */}
                    {isArrived && (
                      <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                            <span>Doorstep Payment Collection (₹{ord.total_amount})</span>
                          </span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${isPaid ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-100 text-amber-800'}`}>
                            {isPaid ? '✓ Paid' : 'Pending Payment'}
                          </span>
                        </div>

                        {!isPaid ? (
                          <div className="grid sm:grid-cols-2 gap-2">
                            {/* Option A: Generate UPI QR on Rider Phone */}
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForQr(ord)}
                              className="py-2.5 px-3 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                            >
                              <QrCode className="w-4 h-4 text-emerald-600" />
                              <span>Show UPI QR Code</span>
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
                              className="py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              <Banknote className="w-4 h-4" />
                              <span>Confirm Cash Collected (₹{ord.total_amount})</span>
                            </button>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-white rounded-xl border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-900">
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
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer disabled:opacity-50 mt-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Handover Parcel & Complete Delivery ✓</span>
                        </button>
                      </div>
                    )}

                    {/* COMPLETED STATUS */}
                    {isDelivered && (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-bold">
                        <span>✓ Successfully Delivered to Customer</span>
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
      {/* RIDER UPI COLLECTION QR MODAL */}
      {/* ===================================================================== */}
      {selectedOrderForQr && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center border border-gray-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-gray-900 text-sm">Rider Collection UPI QR</h3>
              </div>
              <button
                onClick={() => setSelectedOrderForQr(null)}
                className="text-gray-400 hover:text-gray-700 p-1 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 block">Collect from Customer</span>
              <div className="text-3xl font-black text-gray-900 mt-0.5">₹{selectedOrderForQr.total_amount}</div>
              <p className="text-xs text-gray-500 mt-1 font-mono">Order #{selectedOrderForQr.id}</p>
            </div>

            {/* Scannable Dynamic NPCI QR */}
            <div className="p-3 bg-gray-50 rounded-2xl border-2 border-emerald-500/40 inline-block shadow-inner">
              <div className="w-56 h-56 relative bg-white p-1 rounded-xl">
                <Image
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(`upi://pay?pa=mdfresh@upi&pn=MD%20Fresh%20Delivery&am=${selectedOrderForQr.total_amount}&cu=INR&tn=${encodeURIComponent('Payment for ' + selectedOrderForQr.id)}&tr=${selectedOrderForQr.id}`)}`}
                  alt="Rider Payment QR"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-[10px] font-black text-emerald-800 mt-1 block">
                Ask customer to scan with PhonePe / GPay / Paytm
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
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirm UPI Payment Received</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrderForQr(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
