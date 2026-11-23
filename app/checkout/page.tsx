'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ExternalLink,
  Store
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { findNearestBranch } from '@/lib/branches';
import {
  computeTotals,
  FREE_DELIVERY_THRESHOLD,
  isValidIndianPhone,
  normalizeIndianPhone,
} from '@/lib/pricing';

type PaymentTab = 'upi' | 'upi_doorstep' | 'cod';
type UpiModal = 'none' | 'phonepe' | 'gpay' | 'paytm' | 'bhim' | 'upi_qr';

// Payment tab content slides in from the side of the tab that was picked.
const tabContentVariants = {
  enter: (dir: number) => ({ x: dir * 28, opacity: 0, filter: 'blur(2px)' }),
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: (dir: number) => ({
    x: dir * -28,
    opacity: 0,
    filter: 'blur(2px)',
    transition: { duration: 0.14, ease: [0.4, 0, 1, 1] as const },
  }),
};

const PAYMENT_TABS: { id: PaymentTab; label: string; icon: typeof Smartphone }[] = [
  { id: 'upi', label: 'Pay now (UPI)', icon: Smartphone },
  { id: 'upi_doorstep', label: 'UPI on delivery', icon: QrCode },
  { id: 'cod', label: 'Cash on delivery', icon: Banknote },
];

// Order of the server's response to POST /api/orders.
interface PlacedOrder {
  id: string;
  items: { id: number | string; name: string; price: number; quantity: number; unit: string; image?: string }[];
  delivery_fee: number;
  total_amount: number;
  payment_method: string;
  delivery_address: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart, hasHydrated } = useCartStore();
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

  const [activePaymentTab, setActivePaymentTab] = useState<PaymentTab>('upi');
  // +1 when moving to a tab on the right, -1 to the left. Drives the slide direction.
  const [tabDirection, setTabDirection] = useState(1);
  const selectPaymentTab = (tab: PaymentTab) => {
    const from = PAYMENT_TABS.findIndex((t) => t.id === activePaymentTab);
    const to = PAYMENT_TABS.findIndex((t) => t.id === tab);
    setTabDirection(to >= from ? 1 : -1);
    setActivePaymentTab(tab);
  };
  
  // Customer details
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(normalizeIndianPhone(user?.phone || ''));
  const [houseFlatNo, setHouseFlatNo] = useState('');
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const [landmark, setLandmark] = useState('');

  // UPI State
  const [selectedUpiApp, setSelectedUpiApp] = useState<'phonepe' | 'gpay' | 'paytm' | 'bhim' | 'custom'>('phonepe');

  // Selected Bank & Wallet

  // Delivery instructions
  const [deliveryNote, setDeliveryNote] = useState<string[]>(['Leave at door']);

  // Gateway & Razorpay state
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // UPI modal (QR + app links). The value is the app the customer picked.
  const [showDirectAppModal, setShowDirectAppModal] = useState<UpiModal>('none');

  // Per-order dynamic Razorpay UPI QR (new QR for every order, confirmed server-side)
  const [upiQr, setUpiQr] = useState<{
    orderId: string;
    mode: 'direct' | 'razorpay';
    payee: string | null;
    imageUrl: string;
    upiIntent: string | null;
    amount: number;
    closeBy: number;
  } | null>(null);
  const [upiQrLoading, setUpiQrLoading] = useState(false);
  const [upiQrError, setUpiQrError] = useState('');
  const [upiQrExpired, setUpiQrExpired] = useState(false);
  const [upiQrSecondsLeft, setUpiQrSecondsLeft] = useState(0);
  const [isClaimingPaid, setIsClaimingPaid] = useState(false);
  // Unpaid order created for the UPI QR. Reused while the cart is unchanged, even when
  // QR creation failed, so retries never create duplicate orders.
  const [qrOrder, setQrOrder] = useState<{ cartKey: string; order: PlacedOrder } | null>(null);

  const { subtotal: total, deliveryFee, handlingFee, total: finalTotal } = computeTotals(getTotalPrice());
  const cartKey = items.map((i) => `${i.product.id}x${i.quantity}`).join(',');
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);
  const phoneValid = isValidIndianPhone(customerPhone);
  const flatValid = houseFlatNo.trim().length > 0;

  useEffect(() => {
    if (user?.name && !customerName) setCustomerName(user.name);
    if (user?.phone && !customerPhone) setCustomerPhone(normalizeIndianPhone(user.phone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggleInstruction = (instruction: string) => {
    setDeliveryNote((prev) =>
      prev.includes(instruction)
        ? prev.filter((i) => i !== instruction)
        : [...prev, instruction]
    );
  };

  // Shared checks for every payment path. Returns an error message or ''.
  const validateDetails = () => {
    setShowFieldErrors(true);
    if (!flatValid) return 'Please enter your House / Flat number so the rider can find you.';
    if (!phoneValid) return 'Please enter a valid 10-digit mobile number for order delivery & rider dispatch.';
    return '';
  };

  const cartLines = () => items.map((i) => ({ id: i.product.id, quantity: i.quantity }));

  // Create the order on the server. The server prices the cart and sets the payment status.
  const placeOrder = async (payment: 'cod' | 'upi_doorstep' | 'upi_qr', extra: Record<string, string> = {}) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cartLines(),
        payment,
        customer_name: customerName,
        customer_phone: customerPhone,
        house_flat_no: houseFlatNo,
        landmark,
        delivery_address: fullAddress || location || 'Bengaluru, Karnataka',
        latitude,
        longitude,
        delivery_notes: deliveryNote.join(', '),
        ...extra,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || 'Could not place order. Please try again.');
    return data.order as PlacedOrder;
  };

  // Save in local store, clear cart, go to live order tracker.
  const completeOrderLocally = (order: PlacedOrder) => {
    addOrder({
      id: order.id,
      createdAt: new Date().toISOString(),
      items: order.items,
      totalAmount: order.total_amount,
      deliveryFee: order.delivery_fee,
      paymentMethod: order.payment_method,
      status: 'Order Placed',
      deliveryAddress: order.delivery_address,
    });
    clearCart();
    setShowDirectAppModal('none');
    router.push(`/success?orderId=${encodeURIComponent(order.id)}`);
  };

  // ============================================================================
  // PAYMENT LAUNCHER
  // ============================================================================
  const handleInitiatePayment = async () => {
    setPaymentError('');
    const invalid = validateDetails();
    if (invalid) {
      setPaymentError(invalid);
      return;
    }

    // 1. Pay on delivery (cash or UPI to the rider at the door)
    if (activePaymentTab === 'cod' || activePaymentTab === 'upi_doorstep') {
      setIsVerifyingPayment(true);
      try {
        completeOrderLocally(await placeOrder(activePaymentTab));
      } catch (err: any) {
        setPaymentError(err.message);
        setIsVerifyingPayment(false);
      }
      return;
    }

    // 2. Pay now: UPI QR made for this order.
    setShowDirectAppModal(selectedUpiApp === 'custom' ? 'upi_qr' : selectedUpiApp);
  };

  // Create (or reuse) the unpaid order, then a new single-use QR for it.
  const startUpiQrPayment = async (forceNew = false) => {
    setUpiQrError('');
    const invalid = validateDetails();
    if (invalid) {
      setUpiQrError(invalid);
      return;
    }
    // Reuse the current QR when it is still valid for the same cart.
    if (!forceNew && upiQr && qrOrder?.cartKey === cartKey && upiQr.closeBy * 1000 > Date.now()) {
      return;
    }

    setUpiQrLoading(true);
    setUpiQrExpired(false);
    setUpiQr(null);
    try {
      let order = qrOrder?.cartKey === cartKey ? qrOrder.order : null;
      if (!order) {
        order = await placeOrder('upi_qr');
        setQrOrder({ cartKey, order });
      }

      const qrRes = await fetch('/api/payments/upi-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const qrData = await qrRes.json().catch(() => ({}));
      if (!qrRes.ok || !qrData.success) {
        throw new Error(qrData.error || 'Could not generate UPI QR');
      }

      setUpiQr({
        orderId: order.id,
        mode: qrData.mode === 'direct' ? 'direct' : 'razorpay',
        payee: qrData.payee || null,
        imageUrl: qrData.imageUrl,
        upiIntent: qrData.upiIntent || null,
        amount: qrData.amount,
        closeBy: qrData.closeBy,
      });
      setUpiQrSecondsLeft(Math.max(0, qrData.closeBy - Math.floor(Date.now() / 1000)));
    } catch (err: any) {
      setUpiQrError(err.message || 'Could not generate UPI QR');
    } finally {
      setUpiQrLoading(false);
    }
  };

  const isUpiModal = showDirectAppModal !== 'none';

  // Direct UPI: customer taps "I've paid". The shop confirms the money in admin before
  // the order is packed, so this never marks the order Paid by itself.
  const claimUpiPaid = async () => {
    if (!upiQr || !qrOrder) return;
    setIsClaimingPaid(true);
    setUpiQrError('');
    try {
      const res = await fetch('/api/payments/upi-qr', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: upiQr.orderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not update payment status');
      const order = qrOrder.order;
      setUpiQr(null);
      setQrOrder(null);
      completeOrderLocally({ ...order, payment_method: 'UPI (Direct)' });
    } catch (err: any) {
      setUpiQrError(err.message);
    } finally {
      setIsClaimingPaid(false);
    }
  };

  // Build an app-specific link from the QR's UPI intent. Android can also use plain upi://
  // (shows an app chooser); iOS needs the app's own scheme.
  const upiAppLink = (app: 'phonepe' | 'gpay' | 'paytm' | 'any') => {
    if (!upiQr?.upiIntent) return undefined;
    const query = upiQr.upiIntent.split('?')[1] || '';
    if (app === 'phonepe') return `phonepe://pay?${query}`;
    if (app === 'gpay') return `tez://upi/pay?${query}`;
    if (app === 'paytm') return `paytmmp://pay?${query}`;
    return upiQr.upiIntent;
  };

  // Generate the QR as soon as the UPI modal opens.
  useEffect(() => {
    if (isUpiModal) startUpiQrPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUpiModal]);

  // Poll the server every 3 s. Server confirms with Razorpay (or webhook already did).
  useEffect(() => {
    if (!isUpiModal || !upiQr || upiQrExpired || !qrOrder) return;
    let stopped = false;
    const paidOrder = qrOrder.order;

    const tick = async () => {
      const secondsLeft = Math.max(0, upiQr.closeBy - Math.floor(Date.now() / 1000));
      setUpiQrSecondsLeft(secondsLeft);
      try {
        const res = await fetch(`/api/payments/upi-qr?orderId=${encodeURIComponent(upiQr.orderId)}`);
        const data = await res.json();
        if (stopped) return;
        if (data.paid) {
          stopped = true;
          setUpiQr(null);
          setQrOrder(null);
          completeOrderLocally({ ...paidOrder, payment_method: 'UPI QR (Razorpay)' });
          return;
        }
      } catch (e) {
        console.warn('UPI status check failed, retrying:', e);
      }
      if (secondsLeft === 0) setUpiQrExpired(true);
    };

    tick();
    const timer = setInterval(tick, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUpiModal, upiQr, upiQrExpired, qrOrder]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" aria-label="Loading cart" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mb-4 text-3xl">
            🛒
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-500 max-w-sm mb-6 text-sm">
            Add farm-fresh fruits, vegetables and groceries to checkout!
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold transition shadow-md cursor-pointer"
          >
            Start Shopping
          </button>
        </div>
      </div>
    );
  }

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

        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Checkout</h1>
            <p className="text-xs text-gray-500 mt-1">Review address, select payment app & instant dispatch</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-green-700" />
            Instant 10-15 Min Delivery
          </span>
        </div>

        <AnimatePresence>
        {paymentError && (
          <motion.div
            key="payment-error"
            role="alert"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
          <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center justify-between gap-3 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{paymentError}</span>
            </div>
            <button
              onClick={() => setPaymentError('')}
              aria-label="Dismiss error"
              className="text-red-500 hover:text-red-800 text-xs font-bold"
            >
              ✕
            </button>
          </div>
          </motion.div>
        )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Delivery Details & Payment Selection */}
          <div className="lg:col-span-7 space-y-6 min-w-0">
            
            {/* Delivery Address & GPS Card */}
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h2 className="text-base font-black text-gray-900 leading-tight" suppressHydrationWarning>
                        {location || 'Indiranagar, Bengaluru'}
                      </h2>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-emerald-600" />
                        GPS Verified
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2" suppressHydrationWarning>
                      {fullAddress || location || 'Koramangala 4th Block, Bengaluru, Karnataka 560034'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100 mb-4">
                <div>
                  <label htmlFor="house-flat" className="block text-[11px] font-black uppercase text-gray-600 mb-1">
                    House / Flat / Floor No. *
                  </label>
                  <input
                    id="house-flat"
                    type="text"
                    required
                    maxLength={120}
                    autoComplete="address-line1"
                    placeholder="e.g. Flat 302, 3rd Floor"
                    value={houseFlatNo}
                    onChange={(e) => setHouseFlatNo(e.target.value)}
                    aria-invalid={showFieldErrors && !flatValid}
                    className={`w-full px-3 py-2 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white ${
                      showFieldErrors && !flatValid ? 'border-red-400' : 'border-gray-200'
                    }`}
                  />
                  {showFieldErrors && !flatValid && (
                    <p className="mt-1 text-[11px] font-bold text-red-600">Required for delivery</p>
                  )}
                </div>
                <div>
                  <label htmlFor="landmark" className="block text-[11px] font-black uppercase text-gray-600 mb-1">
                    Landmark (Optional)
                  </label>
                  <input
                    id="landmark"
                    maxLength={120}
                    type="text"
                    placeholder="e.g. Near Metro Station"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Customer Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-gray-100 mb-4">
                <div>
                  <label htmlFor="recipient-name" className="block text-[11px] font-black uppercase text-gray-600 mb-1">
                    Recipient Name
                  </label>
                  <input
                    id="recipient-name"
                    maxLength={80}
                    autoComplete="name"
                    type="text"
                    placeholder="Enter your name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="delivery-phone" className="block text-[11px] font-black uppercase text-gray-600 mb-1">
                    Delivery Phone Number *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-bold text-gray-500">+91</span>
                    <input
                      id="delivery-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      required
                      placeholder="10 digit number"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(normalizeIndianPhone(e.target.value))}
                      aria-invalid={showFieldErrors && !phoneValid}
                      className={`w-full pl-10 pr-3 py-2 bg-gray-50 border rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white ${
                        showFieldErrors && !phoneValid ? 'border-red-400' : 'border-gray-200'
                      }`}
                    />
                  </div>
                  {showFieldErrors && !phoneValid && (
                    <p className="mt-1 text-[11px] font-bold text-red-600">Enter a valid 10-digit mobile number</p>
                  )}
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

            {/* PAYMENT MODE SELECTOR */}
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-black text-gray-900">How would you like to pay?</h2>
                  <p className="text-xs text-gray-500">Pay now by UPI, or pay the delivery partner at your door</p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Secure UPI</span>
                </div>
              </div>

              {/* Payment Tab Navigation */}
              <div role="tablist" aria-label="Payment method" className="grid grid-cols-3 gap-1 p-1 bg-gray-100/80 rounded-2xl mb-6">
                {PAYMENT_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activePaymentTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => selectPaymentTab(tab.id)}
                      className={`relative min-w-0 flex flex-col items-center justify-center py-2.5 px-1 rounded-xl font-bold text-xs cursor-pointer transition-colors duration-200 ${
                        isActive ? 'text-gray-950' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="payment-tab-pill"
                          className="absolute inset-0 rounded-xl bg-white shadow-sm border border-gray-200/50"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        />
                      )}
                      <motion.span
                        className="relative z-10 flex flex-col items-center min-w-0 max-w-full"
                        animate={{ scale: isActive ? 1.04 : 1 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                      >
                        <Icon className={`w-4 h-4 mb-1 transition-colors duration-200 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="max-w-full text-[10px] leading-tight text-center">{tab.label}</span>
                      </motion.span>
                    </button>
                  );
                })}
              </div>

              <div className="relative overflow-hidden">
              <AnimatePresence mode="wait" initial={false} custom={tabDirection}>
              <motion.div
                key={activePaymentTab}
                role="tabpanel"
                custom={tabDirection}
                variants={tabContentVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
              {/* TAB 1: UPI APPS (PHONEPE, GPAY, PAYTM, BHIM) */}
              {activePaymentTab === 'upi' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-700">
                      Select UPI App (Opens PhonePe / GPay / Paytm directly):
                    </label>
                    <span className="text-[10px] text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded">
                      Zero Surcharge
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* PhonePe */}
                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('phonepe')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden ${
                        selectedUpiApp === 'phonepe'
                          ? 'border-purple-600 bg-purple-50/60 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center text-xs shadow-xs">
                          Pe
                        </div>
                        {selectedUpiApp === 'phonepe' && (
                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-black text-gray-900">PhonePe</div>
                      <span className="text-[10px] text-purple-700 font-bold">Direct App Launch</span>
                    </button>

                    {/* Google Pay */}
                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('gpay')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden ${
                        selectedUpiApp === 'gpay'
                          ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xs shadow-xs">
                          G
                        </div>
                        {selectedUpiApp === 'gpay' && (
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-black text-gray-900">Google Pay</div>
                      <span className="text-[10px] text-blue-700 font-bold">Tez / GPay</span>
                    </button>

                    {/* Paytm */}
                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('paytm')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden ${
                        selectedUpiApp === 'paytm'
                          ? 'border-cyan-600 bg-cyan-50/60 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-8 h-8 rounded-xl bg-[#002e6e] text-cyan-400 font-black flex items-center justify-center text-xs shadow-xs">
                          Pay
                        </div>
                        {selectedUpiApp === 'paytm' && (
                          <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-black text-gray-900">Paytm UPI</div>
                      <span className="text-[10px] text-cyan-800 font-bold">App & Wallet</span>
                    </button>

                    {/* BHIM / Other */}
                    <button
                      type="button"
                      onClick={() => setSelectedUpiApp('bhim')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden ${
                        selectedUpiApp === 'bhim'
                          ? 'border-green-600 bg-green-50/60 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-8 h-8 rounded-xl bg-green-600 text-white font-black flex items-center justify-center text-xs shadow-xs">
                          UPI
                        </div>
                        {selectedUpiApp === 'bhim' && (
                          <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-black text-gray-900">BHIM UPI</div>
                      <span className="text-[10px] text-green-700 font-bold">Universal UPI</span>
                    </button>
                  </div>

                  {/* QR Code Quick Scanner Bar */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-900">Scan Dynamic NPCI QR Code</div>
                      <div className="text-[11px] text-gray-500">Scan with any Indian UPI app to pay ₹{finalTotal}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDirectAppModal('upi_qr')}
                      className="px-3.5 py-2 bg-white text-gray-900 hover:bg-gray-100 rounded-xl text-xs font-black border border-gray-300 flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <QrCode className="w-4 h-4 text-green-600" />
                      <span>Show Instant QR</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: UPI ON DELIVERY */}
              {activePaymentTab === 'upi_doorstep' && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-emerald-700" />
                    <h3 className="text-sm font-black text-emerald-950">UPI QR on Delivery</h3>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                    Nothing to pay now. When your order arrives, the delivery partner shows a UPI QR for exactly ₹{finalTotal}. Scan it with PhonePe, Google Pay or any UPI app.
                  </p>
                </div>
              )}

              {/* TAB 3: CASH ON DELIVERY */}
              {activePaymentTab === 'cod' && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-emerald-700" />
                    <h3 className="text-sm font-black text-emerald-950">Cash on Delivery</h3>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                    Nothing to pay now. Keep ₹{finalTotal} ready for the delivery partner.
                  </p>
                </div>
              )}
              </motion.div>
              </AnimatePresence>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Order Summary & Place Order */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 min-w-0">
            <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 space-y-6">
              
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-lg font-black text-gray-900">Bill Details</h3>
                <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md">
                  MD FRESH Invoice
                </span>
              </div>

              <div className="space-y-3 text-xs font-medium text-gray-600">
                <div className="flex justify-between">
                  <span>Item Total ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                  <span className="font-bold text-gray-900">₹{total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span>Delivery Partner Fee</span>
                    {deliveryFee === 0 && (
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.2 rounded">
                        Free &gt;₹{FREE_DELIVERY_THRESHOLD}
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

              {/* Pay / Place Order Button */}
              <button
                type="button"
                disabled={isVerifyingPayment}
                onClick={handleInitiatePayment}
                className="w-full py-4 px-6 rounded-2xl font-black text-base text-gray-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-yellow-500 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-between cursor-pointer disabled:opacity-50"
              >
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-800">
                    {activePaymentTab === 'upi' ? `Pay via ${selectedUpiApp === 'gpay' ? 'Google Pay' : selectedUpiApp === 'bhim' ? 'BHIM UPI' : selectedUpiApp === 'phonepe' ? 'PhonePe' : selectedUpiApp === 'paytm' ? 'Paytm' : 'UPI'}` :
                     activePaymentTab === 'upi_doorstep' ? 'UPI on Delivery' : 'Cash on Delivery'}
                  </span>
                  <span className="text-lg">₹{finalTotal}</span>
                </div>
                <div className="flex items-center gap-1.5 font-black text-sm">
                  {isVerifyingPayment ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{activePaymentTab === 'upi' ? 'Connecting...' : 'Placing order...'}</span>
                    </>
                  ) : (
                    <span>{activePaymentTab === 'upi' ? 'Proceed to Pay →' : 'Place Order →'}</span>
                  )}
                </div>
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 font-semibold pt-1">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span>100% Secure • 256-bit SSL Bank Encryption</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ======================================================================== */}
      {/* DIRECT APP INTENT & SCANNABLE NPCI UPI MODAL */}
      {/* ======================================================================== */}
      <AnimatePresence>
      {isUpiModal && (
        <motion.div
          key="upi-modal"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDirectAppModal('none');
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upi-modal-title"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="bg-white rounded-3xl max-w-sm w-full p-6 text-center border border-gray-100 shadow-2xl max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 id="upi-modal-title" className="font-black text-gray-900 text-base">
                {showDirectAppModal === 'phonepe' ? 'PhonePe Payment' :
                 showDirectAppModal === 'gpay' ? 'Google Pay Payment' :
                 showDirectAppModal === 'paytm' ? 'Paytm UPI Payment' : 'Scan NPCI Dynamic QR'}
              </h3>
              <button
                onClick={() => setShowDirectAppModal('none')}
                aria-label="Close payment window"
                className="p-1 text-gray-400 hover:text-gray-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Pay <strong>₹{(upiQr?.amount ?? qrOrder?.order.total_amount ?? finalTotal).toFixed(2)}</strong> directly to {upiQr?.payee || 'MD Fresh Grocery'}
            </p>

            {/* UPI QR & App Trigger */}
            {isUpiModal && (
              <>
                <div className="p-3 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 inline-block mb-3">
                  <div className="w-52 h-52 relative bg-white p-1 rounded-xl flex items-center justify-center overflow-hidden">
                    {upiQrLoading && <Loader2 className="w-8 h-8 animate-spin text-green-600" />}
                    {!upiQrLoading && upiQr && !upiQrExpired && (
                      <motion.img
                        key={upiQr.imageUrl}
                        src={upiQr.imageUrl}
                        alt={`UPI QR for order ${upiQr.orderId}`}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full h-full object-contain"
                      />
                    )}
                    {!upiQrLoading && upiQrExpired && (
                      <span className="text-xs font-bold text-red-600">QR expired</span>
                    )}
                    {!upiQrLoading && upiQrError && (
                      <span className="text-xs font-bold text-red-600 px-2">{upiQrError}</span>
                    )}
                  </div>
                  {upiQr?.payee && !upiQrExpired && !upiQrLoading && (
                    <span className="text-[11px] font-bold text-gray-700 mt-1 block">
                      Paying {upiQr.payee}
                    </span>
                  )}
                  {upiQr && !upiQrExpired && !upiQrLoading && (
                    <span className="text-[10px] font-black text-green-700 mt-1 block">
                      Order {upiQr.orderId} • expires in {Math.floor(upiQrSecondsLeft / 60)}:{String(upiQrSecondsLeft % 60).padStart(2, '0')}
                    </span>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {upiQr?.upiIntent && !upiQrExpired && !upiQrLoading && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-gray-500">On this phone? Open your UPI app:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={upiAppLink('phonepe')}
                          className={`py-3 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 ${
                            showDirectAppModal === 'phonepe' ? 'ring-2 ring-purple-300' : ''
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          PhonePe
                        </a>
                        <a
                          href={upiAppLink('gpay')}
                          className={`py-3 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 ${
                            showDirectAppModal === 'gpay' ? 'ring-2 ring-blue-300' : ''
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Google Pay
                        </a>
                      </div>
                      <a
                        href={upiAppLink(showDirectAppModal === 'paytm' ? 'paytm' : 'any')}
                        className="block text-[11px] font-bold text-green-700 underline"
                      >
                        {showDirectAppModal === 'paytm' ? 'Open Paytm' : 'Other UPI app'}
                      </a>
                    </div>
                  )}

                  {upiQr && upiQr.mode === 'razorpay' && !upiQrExpired && !upiQrLoading && (
                    <div className="w-full py-3 bg-green-50 text-green-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scan with any UPI app. Waiting for payment…</span>
                    </div>
                  )}

                  {upiQr && upiQr.mode === 'direct' && !upiQrExpired && !upiQrLoading && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-gray-600 leading-snug">
                        Pay exactly <strong>₹{upiQr.amount.toFixed(2)}</strong>. The paise identify your order.
                        After paying, tap the button below. The shop confirms your payment before packing.
                      </p>
                      <button
                        type="button"
                        disabled={isClaimingPaid}
                        onClick={claimUpiPaid}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {isClaimingPaid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span>I&apos;ve paid ₹{upiQr.amount.toFixed(2)}</span>
                      </button>
                    </div>
                  )}

                  {(upiQrExpired || upiQrError) && !upiQrLoading && (
                    <button
                      type="button"
                      onClick={() => startUpiQrPayment(true)}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Generate New QR</span>
                    </button>
                  )}

                  {upiQrError && !upiQrLoading && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDirectAppModal('none');
                        selectPaymentTab('cod');
                      }}
                      className="w-full py-2.5 text-xs font-bold text-gray-700 hover:text-gray-950 underline cursor-pointer"
                    >
                      Pay by Cash on Delivery instead
                    </button>
                  )}
                </div>
              </>
            )}

          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
