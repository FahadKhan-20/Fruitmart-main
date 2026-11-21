import { supabase } from '@/lib/supabase';
import { getRazorpayInstance } from '@/lib/razorpay';

export const AWAITING_PAYMENT = 'Awaiting Payment';
export const PAID = 'Paid';

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
