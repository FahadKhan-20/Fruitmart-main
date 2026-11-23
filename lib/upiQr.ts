import { supabase } from '@/lib/supabase';
import { getRazorpayInstance } from '@/lib/razorpay';

export const AWAITING_PAYMENT = 'Awaiting Payment';
// Customer says they paid; the shop still has to see the money and confirm.
export const PAYMENT_TO_VERIFY = 'Payment to verify';
export const PAID = 'Paid';
export const PAYMENT_NOT_RECEIVED = 'Payment not received';

// Direct UPI mode: payments go straight to the shop's own UPI ID (no gateway).
// Each order still gets its own QR (own amount, own order reference). The shop confirms
// payment in the admin page, because plain UPI does not notify the website.
export function getShopUpi() {
  const vpa = (process.env.SHOP_UPI_ID || '').trim();
  if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(vpa)) return null;
  // Merchant UPI IDs (for example a bank's PayZapp/Vyapar QR) carry a merchant category code
  // (mc) and a fixed reference (tr) in their printed QR. Some banks reject a payment to a
  // merchant ID when these are missing or changed, so copy them from the shop's QR here.
  const mc = (process.env.SHOP_UPI_MC || '').trim();
  const tr = (process.env.SHOP_UPI_TR || '').trim();
  return {
    vpa,
    name: (process.env.SHOP_UPI_NAME || 'MD Fresh Store').trim().slice(0, 50),
    mc: /^\d{4}$/.test(mc) ? mc : null,
    tr: /^[a-zA-Z0-9.\-_]{1,35}$/.test(tr) ? tr : null,
  };
}

export function upiMode(): 'direct' | 'razorpay' {
  if (process.env.UPI_MODE === 'razorpay') return 'razorpay';
  return getShopUpi() ? 'direct' : 'razorpay';
}

// Add 1-99 paise so each open UPI order has a different amount. The shop can then match
// a payment to an order by amount alone, even when the payer's app drops the order note.
// Set UPI_UNIQUE_PAISE=false to turn this off.
export async function uniqueUpiAmount(baseTotal: number) {
  if (process.env.UPI_UNIQUE_PAISE === 'false') return baseTotal;
  const { data, error } = await supabase.from('orders').select('total_amount, payment_status');
  if (error) throw error;
  const openStatuses = [AWAITING_PAYMENT, PAYMENT_TO_VERIFY];
  const taken = new Set(
    (data || [])
      .filter((o: { payment_status: string }) => openStatuses.includes(o.payment_status))
      .map((o: { total_amount: number }) => Math.round(Number(o.total_amount) * 100))
  );
  const basePaise = Math.round(baseTotal * 100);
  const free: number[] = [];
  for (let p = 1; p <= 99; p++) if (!taken.has(basePaise + p)) free.push(p);
  if (free.length === 0) return baseTotal;
  const pick = free[Math.floor(Math.random() * free.length)];
  return (basePaise + pick) / 100;
}

export function buildUpiIntent(
  shop: { vpa: string; name: string; mc?: string | null; tr?: string | null },
  amount: number,
  orderId: string
) {
  // The UPI ID is already validated (letters, digits, . - _ and one @), so it is used as is:
  // some UPI apps do not decode %40 back to @. Other values are percent-encoded (%20 for spaces).
  // For a merchant ID the shop's own fixed reference is kept in tr; the order ID then travels
  // in the note (tn), and the unique paise amount still identifies the order.
  const enc = encodeURIComponent;
  const tr = shop.tr || orderId;
  return (
    `upi://pay?pa=${shop.vpa}&pn=${enc(shop.name)}` +
    (shop.mc ? `&mc=${shop.mc}` : '') +
    `&am=${amount.toFixed(2)}&cu=INR&tr=${enc(tr)}&tn=${enc(`Order ${orderId}`)}`
  );
}

// QR codes expire after this many seconds. Razorpay requires at least 2 minutes.
export const QR_TTL_SECONDS = 15 * 60;

export async function getOrder(orderId: string) {
  const { data, error } = await supabase.from('orders').select('*').eq('id', orderId);
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

// Mark an order paid after the amount is checked against the stored order total.
// Returns true when the order is (now) paid.
export async function markOrderPaid(orderId: string, paymentId: string, amountPaise: number) {
  const order = await getOrder(orderId);
  if (!order) return false;
  if (order.payment_status === PAID) return true;

  const expectedPaise = Math.round(Number(order.total_amount) * 100);
  if (amountPaise !== expectedPaise) {
    console.error(`UPI QR amount mismatch for ${orderId}: got ${amountPaise}, expected ${expectedPaise}`);
    return false;
  }

  const { error } = await supabase
    .from('orders')
    .update({ payment_status: PAID, razorpay_payment_id: paymentId, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
  return true;
}

// Ask Razorpay directly whether the QR code has a captured payment.
// This works without a public webhook URL, so it also works on localhost.
export async function syncQrPayment(orderId: string, qrId: string) {
  const razorpay = getRazorpayInstance();
  const result: any = await razorpay.qrCode.fetchAllPayments(qrId);
  const captured = (result?.items || []).find((p: any) => p.status === 'captured');
  if (!captured) return false;
  return markOrderPaid(orderId, captured.id, Number(captured.amount));
}
