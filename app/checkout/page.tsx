'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { useAppStore } from '@/store/useAppStore';
import { 
  MapPin, 
  ChevronLeft, 
  ShieldCheck, 
  Smartphone, 
  QrCode, 
  Banknote, 
  Check, 
  Sparkles, 
  AlertCircle, 
  Navigation, 
  Loader2, 
  Store,
  Bike,
  Clock
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { findNearestBranch } from '@/lib/branches';

type PaymentMode = 'upi_doorstep' | 'cash_doorstep';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { 
    location, 
    fullAddress, 
    latitude, 
    longitude, 
    nearestBranch,
    branchDistanceKm,
    deliveryEtaMinutes,
    setLocationModalOpen, 
    user, 
    addOrder 
  } = useAppStore();

  // Pay on Delivery mode: UPI QR to Rider or Cash to Rider
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi_doorstep');
  
  // Customer details
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone?.replace(/\D/g, '').slice(-10) || '');
  const [houseFlatNo, setHouseFlatNo] = useState('');
  const [landmark, setLandmark] = useState('');

  // Delivery instructions
  const [deliveryNote, setDeliveryNote] = useState<string[]>(['Leave at door']);

  const [isProcessing, setIsProcessing] = useState(false);
  const [orderError, setOrderError] = useState('');

  const total = getTotalPrice();
  const deliveryFee = total > 399 ? 0 : (total > 0 ? 25 : 0);
  const handlingFee = total > 0 ? 2 : 0;
  const finalTotal = total + deliveryFee + handlingFee;

  useEffect(() => {
    if (user?.name && !customerName) setCustomerName(user.name);
    if (user?.phone && !customerPhone) setCustomerPhone(user.phone.replace(/\D/g, '').slice(-10));
  }, [user]);

  const toggleInstruction = (instruction: string) => {
    setDeliveryNote((prev) =>
      prev.includes(instruction)
        ? prev.filter((i) => i !== instruction)
        : [...prev, instruction]
    );
  };

  // ============================================================================
  // PLACE ORDER (NO ADVANCE ONLINE PAYMENT REQUIRED)
  // ============================================================================
  const handlePlaceOrder = async () => {
    setOrderError('');

    if (items.length === 0) {
      setOrderError('Your cart is empty. Please add items before placing an order.');
      return;
    }

    if (!customerPhone || customerPhone.length < 10) {
      setOrderError('Please enter a valid 10-digit mobile number so the delivery partner can contact you.');
      return;
    }

    setIsProcessing(true);

    try {
      const orderIdToUse = `MD-${Date.now().toString().slice(-6)}`;
      const fullDeliveryAddr = `${houseFlatNo ? 'Flat/House: ' + houseFlatNo + ', ' : ''}${landmark ? 'Landmark: ' + landmark + ', ' : ''}${fullAddress || location || 'Bengaluru, Karnataka'}`;

      // Automatically route to the geographically nearest branch using GPS coordinates / address
      const routing = findNearestBranch(latitude, longitude, fullDeliveryAddr);
      const branchToAssign = nearestBranch || routing.branch;
      const branchDistanceToAssign = branchDistanceKm ?? routing.distanceKm;

      const paymentMethodLabel = paymentMode === 'upi_doorstep' 
        ? 'UPI QR on Delivery (Pay to Rider)' 
        : 'Cash on Delivery (Pay to Rider)';

      const orderPayload = {
        id: orderIdToUse,
        customer_name: customerName || 'Valued Customer',
        customer_phone: customerPhone ? `+91 ${customerPhone}` : '+91 9876543210',
        delivery_address: fullDeliveryAddr,
        latitude: latitude || 12.9352,
        longitude: longitude || 77.6245,
        assigned_branch_id: branchToAssign.id,
        assigned_branch_name: branchToAssign.name,
        branch_distance_km: branchDistanceToAssign,
        items: items.map((i) => ({
          id: i.product.id,
          name: i.product.name,
          price: i.product.price,
          quantity: i.quantity,
          unit: i.product.unit,
          image: i.product.image,
        })),
        subtotal: total,
        delivery_fee: deliveryFee,
        handling_fee: handlingFee,
        total_amount: finalTotal,
        payment_method: paymentMethodLabel,
        payment_status: 'Pending (Pay at Doorstep)',
        status: 'received',
        delivery_notes: deliveryNote.join(', '),
      };

      // 1. Post to SQLite database API
      const saveRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (!saveRes.ok) {
        const saveErr = await saveRes.json();
        console.warn('API order save note:', saveErr);
      }

      // 2. Save in local Zustand store
      addOrder({
        id: orderIdToUse,
        createdAt: new Date().toISOString(),
        items: orderPayload.items,
        totalAmount: finalTotal,
        deliveryFee,
        paymentMethod: paymentMethodLabel,
        status: 'Order Placed',
        deliveryAddress: fullDeliveryAddr,
      });

      // 3. Clear cart & redirect to live order tracker
      clearCart();
      router.push(`/success?orderId=${orderIdToUse}`);
    } catch (err: any) {
      console.error('Place order error:', err);
      setOrderError(err.message || 'Could not place order. Please check connection and retry.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-amber-50/50 flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-gray-950 bg-white/80 px-3.5 py-1.5 rounded-xl border border-gray-200 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Store
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-full text-xs font-black border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Pay on Delivery Verified</span>
          </span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Checkout</h1>
            <p className="text-xs text-gray-500 mt-1">Confirm address • Instant dispatch • Pay when delivery partner arrives</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-green-700" />
            10-15 Min Delivery
          </span>
        </div>

        {orderError && (
          <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center justify-between gap-3 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{orderError}</span>
            </div>
            <button
              onClick={() => setOrderError('')}
              className="text-red-500 hover:text-red-800 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Delivery Details & Doorstep Payment Mode */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Delivery Address & GPS Card */}
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-gray-900 leading-tight" suppressHydrationWarning>
                        {location || 'Annasandrapalya, Bengaluru'}
                      </h2>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-emerald-600" />
                        GPS Verified
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2" suppressHydrationWarning>
                      {fullAddress || location || 'Annasandrapalya Main Rd, HAL Post, Bengaluru, Karnataka 560017'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLocationModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-black text-green-700 bg-green-50 hover:bg-green-100 rounded-xl transition border border-green-200 shrink-0 cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Nearest Fulfillment Hub Routing Indicator */}
              <div className="mb-4 p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase text-emerald-700 tracking-wider flex items-center gap-1.5">
                      <span>Fulfilling from Nearest Branch</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="text-xs font-black text-gray-900 leading-tight truncate">
                      {nearestBranch?.name || findNearestBranch(latitude, longitude, fullAddress || location).branch.name}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {nearestBranch?.address || findNearestBranch(latitude, longitude, fullAddress || location).branch.address}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 rounded-lg text-xs font-black shadow-xs">
                    {branchDistanceKm ?? findNearestBranch(latitude, longitude, fullAddress || location).distanceKm} km away
                  </span>
                  <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                    ~{deliveryEtaMinutes ?? findNearestBranch(latitude, longitude, fullAddress || location).etaMinutes} Mins ETA
                  </div>
                </div>
              </div>

              {/* Exact Flat/House & Landmark */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 mb-4">
                <div>
                  <label className="block text-[11px] font-black uppercase text-gray-600 mb-1">
                    House / Flat / Floor No. *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 302, 3rd Floor"
                    value={houseFlatNo}
                    onChange={(e) => setHouseFlatNo(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-gray-600 mb-1">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Near Metro Station"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Customer Contact Details */}
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-100 mb-4">
                <div>
                  <label className="block text-[11px] font-black uppercase text-gray-600 mb-1">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-gray-600 mb-1">
                    Delivery Phone Number *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-bold text-gray-500">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="10 digit number"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Partner Instructions */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2">
                  Delivery Partner Instructions
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Leave at door', 'Do not ring bell', 'Avoid calling', 'Leave with guard'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleInstruction(opt)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        deliveryNote.includes(opt)
                          ? 'bg-green-600 text-white border-green-600 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {deliveryNote.includes(opt) && '✓ '} {opt}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* DOORSTEP PAYMENT SETTLEMENT SELECTOR */}
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <div>
                <h2 className="text-lg font-black text-gray-900">Payment on Delivery (Doorstep)</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  No online pre-payment required. Pay when our delivery partner reaches your doorstep!
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                
                {/* OPTION 1: UPI QR TO RIDER */}
                <div
                  onClick={() => setPaymentMode('upi_doorstep')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    paymentMode === 'upi_doorstep'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMode === 'upi_doorstep' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'
                    }`}>
                      {paymentMode === 'upi_doorstep' && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-black text-gray-900">UPI QR to Delivery Partner</div>
                    <div className="text-[11px] text-emerald-700 font-bold mt-0.5">PhonePe • GPay • Paytm • BHIM</div>
                    <p className="text-[11px] text-gray-500 mt-1">Rider displays custom collection QR code on arrival. Pay in 5 seconds.</p>
                  </div>
                </div>

                {/* OPTION 2: CASH ON DELIVERY */}
                <div
                  onClick={() => setPaymentMode('cash_doorstep')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    paymentMode === 'cash_doorstep'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-xs">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMode === 'cash_doorstep' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'
                    }`}>
                      {paymentMode === 'cash_doorstep' && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-black text-gray-900">Cash on Delivery (COD)</div>
                    <div className="text-[11px] text-gray-700 font-bold mt-0.5">Exact Cash or Change</div>
                    <p className="text-[11px] text-gray-500 mt-1">Hand cash directly to our delivery partner upon receiving your parcel.</p>
                  </div>
                </div>

              </div>

              {/* Informational Assurance Card */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <Bike className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950">
                  <span className="font-bold block">10-Minute Farm-Fresh Instant Dispatch</span>
                  <span className="text-emerald-800">
                    Once you tap Place Order, the shop manager immediately approves and packs your produce. When the rider arrives at your doorstep, you will receive an instant arrival notification.
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Order Summary & Instant Place Order Button */}
          <div className="lg:col-span-5 sticky top-24">
            <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 space-y-6">
              
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-lg font-black text-gray-900">Bill Details</h3>
                <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md">
                  MD FRESH Invoice
                </span>
              </div>

              <div className="space-y-3 text-xs font-medium text-gray-600">
                <div className="flex justify-between">
                  <span>Item Total ({items.length} items)</span>
                  <span className="font-bold text-gray-900">₹{total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span>Delivery Partner Fee</span>
                    {deliveryFee === 0 && (
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.2 rounded">
                        Free &gt;₹399
                      </span>
                    )}
                  </div>
                  {deliveryFee === 0 ? (
                    <span className="font-bold text-green-600">FREE</span>
                  ) : (
                    <span className="font-bold text-gray-900">₹{deliveryFee}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span>Handling & Platform Fee</span>
                  <span className="font-bold text-gray-900">₹{handlingFee}</span>
                </div>

                <div className="pt-3 border-t-2 border-dashed border-gray-200">
                  <div className="flex justify-between items-baseline text-base font-black text-gray-900">
                    <span>Grand Total</span>
                    <span className="text-2xl text-green-700 font-black">₹{finalTotal}</span>
                  </div>
                </div>
              </div>

              {/* 1-CLICK INSTANT PLACE ORDER BUTTON */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={handlePlaceOrder}
                className="w-full py-4 px-6 rounded-2xl font-black text-base text-gray-950 bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 hover:from-emerald-500 hover:to-green-500 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-between cursor-pointer disabled:opacity-50"
              >
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-950">
                    {paymentMode === 'upi_doorstep' ? 'Pay via UPI to Rider' : 'Cash on Delivery'}
                  </span>
                  <span className="text-lg">₹{finalTotal}</span>
                </div>
                <div className="flex items-center gap-1.5 font-black text-sm">
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Placing Order...</span>
                    </>
                  ) : (
                    <span>Place 10-Min Order →</span>
                  )}
                </div>
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 font-semibold pt-1">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span>Zero Advance Risk • Pay upon Arrival</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
