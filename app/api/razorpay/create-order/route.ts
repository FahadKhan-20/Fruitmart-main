import { NextResponse } from 'next/server';
import { getRazorpayInstance, getRazorpayKeyId, isRazorpayConfigured } from '@/lib/razorpay';
import { OrderInputError, priceCart, readJson } from '@/lib/orders';

// POST { items: [{ id, quantity }] } -> Razorpay order for the server-computed total.
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const priced = await priceCart(body.items);

    if (!isRazorpayConfigured() || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Online payments are not configured' }, { status: 503 });
    }

    const order = await getRazorpayInstance().orders.create({
      amount: Math.round(priced.total * 100),
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { merchant: 'MD FRESH Grocery' },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getRazorpayKeyId(),
    });
  } catch (error: any) {
    if (error instanceof OrderInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Razorpay order creation error:', error?.error?.description || error?.message || error);
    return NextResponse.json({ error: 'Online payment is unavailable right now' }, { status: 502 });
  }
}
