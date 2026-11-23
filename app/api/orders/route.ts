import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { findNearestBranch } from '@/lib/branches';
import { AWAITING_PAYMENT, PAID, uniqueUpiAmount, upiMode } from '@/lib/upiQr';
import {
  DOORSTEP_PENDING,
  OrderInputError,
  staffRole,
  newOrderId,
  parseCustomer,
  priceCart,
  readJson,
  verifyRazorpayCheckout,
} from '@/lib/orders';

// Staff only (shop manager or delivery partner): lists orders with customer details.
// Riders get only active and delivered orders, never payment secrets.
export async function GET(req: Request) {
  const role = staffRole(req);
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const branch = searchParams.get('branch');

    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (status && status !== 'all') query = query.eq('status', status);
    if (branch && branch !== 'all') query = query.eq('assigned_branch_id', branch);

    const { data, error } = await query;
    if (error) throw error;
    let rows = data || [];
    if (role === 'rider') {
      rows = rows
        .filter((o: any) => o.status !== 'cancelled')
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ razorpay_signature, razorpay_payment_id, razorpay_order_id, stripe_payment_id, ...o }: any) => o);
    }
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Could not load orders' }, { status: 500 });
  }
}

// Customer checkout. The server prices the cart and decides the payment status:
//   payment: 'cod' | 'upi_doorstep' -> Pending (Pay at Doorstep); the rider collects
//                                      cash or UPI at the door and records it
//   payment: 'upi_qr'   -> Awaiting Payment (confirmed later by /api/payments/upi-qr)
//   payment: 'razorpay' -> Paid, only after the Razorpay signature and amount check
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const customer = parseCustomer(body);
    const priced = await priceCart(body.items);
    const payment = String(body.payment || '');

    let totalAmount = priced.total;
    let paymentMethod: string;
    let paymentStatus: string;
    let razorpayOrderId: string | null = null;
    let razorpayPaymentId: string | null = null;
    let razorpaySignature: string | null = null;

    if (payment === 'cod') {
      paymentMethod = 'Cash on Delivery (Pay to Rider)';
      paymentStatus = DOORSTEP_PENDING;
    } else if (payment === 'upi_doorstep') {
      paymentMethod = 'UPI QR on Delivery (Pay to Rider)';
      paymentStatus = DOORSTEP_PENDING;
    } else if (payment === 'upi_qr') {
      if (upiMode() === 'direct') {
        paymentMethod = 'UPI QR (Direct)';
        totalAmount = await uniqueUpiAmount(priced.total);
      } else {
        paymentMethod = 'UPI QR (Razorpay)';
      }
      paymentStatus = AWAITING_PAYMENT;
    } else if (payment === 'razorpay') {
      razorpayOrderId = String(body.razorpay_order_id || '');
      razorpayPaymentId = String(body.razorpay_payment_id || '');
      razorpaySignature = String(body.razorpay_signature || '');
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        throw new OrderInputError('Missing payment details');
      }
      await verifyRazorpayCheckout(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        Math.round(priced.total * 100)
      );
      // One Razorpay payment can pay for one order only. A retried request returns the
      // order already saved. Rows are matched here as well, because the local dev DB
      // ignores filters on this column.
      const { data: used, error: usedError } = await supabase
        .from('orders')
        .select('*')
        .eq('razorpay_order_id', razorpayOrderId);
      if (usedError) throw usedError;
      const existing = (used || []).find((o: any) => o.razorpay_order_id === razorpayOrderId);
      if (existing) {
        return NextResponse.json({
          success: true,
          order: {
            id: existing.id,
            items: typeof existing.items === 'string' ? JSON.parse(existing.items) : existing.items,
            subtotal: existing.subtotal,
            delivery_fee: existing.delivery_fee,
            handling_fee: existing.handling_fee,
            total_amount: existing.total_amount,
            payment_method: existing.payment_method,
            payment_status: existing.payment_status,
            delivery_address: existing.delivery_address,
          },
        });
      }
      paymentMethod = `Razorpay (${String(body.method_label || 'Online').slice(0, 40)})`;
      paymentStatus = PAID;
    } else {
      throw new OrderInputError('Unknown payment method');
    }

    const deliveryAddress = [
      `Flat/House: ${customer.houseFlatNo}`,
      customer.landmark ? `Landmark: ${customer.landmark}` : '',
      customer.address,
    ]
      .filter(Boolean)
      .join(', ');
    const routing = findNearestBranch(customer.latitude, customer.longitude, deliveryAddress);
    const now = new Date().toISOString();

    const orderPayload = {
      id: newOrderId(),
      customer_name: customer.name,
      customer_phone: customer.phone,
      delivery_address: deliveryAddress,
      latitude: customer.latitude,
      longitude: customer.longitude,
      assigned_branch_id: routing.branch.id,
      assigned_branch_name: routing.branch.name,
      branch_distance_km: routing.distanceKm,
      items: JSON.stringify(priced.lines),
      subtotal: priced.subtotal,
      delivery_fee: priced.deliveryFee,
      handling_fee: priced.handlingFee,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      stripe_payment_id: null,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      status: 'received',
      delivery_notes: customer.notes,
      created_at: now,
      updated_at: now,
    };

    const { error } = await supabase.from('orders').insert([orderPayload]);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      order: {
        id: orderPayload.id,
        items: priced.lines,
        subtotal: priced.subtotal,
        delivery_fee: priced.deliveryFee,
        handling_fee: priced.handlingFee,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        delivery_address: deliveryAddress,
      },
    });
  } catch (error: any) {
    if (error instanceof OrderInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Could not place order. Please try again.' }, { status: 500 });
  }
}
