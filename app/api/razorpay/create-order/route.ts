import { NextResponse } from 'next/server';
import { getRazorpayInstance, getRazorpayKeyId, isRazorpayConfigured } from '@/lib/razorpay';

export async function POST(req: Request) {
  try {
    const { amount, currency = 'INR', receipt = `rcpt_${Date.now()}` } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 });
    }

    const amountInPaise = Math.round(amount * 100);
    const keyId = getRazorpayKeyId();

    // 1. Attempt official live Razorpay order creation
    if (isRazorpayConfigured()) {
      try {
        const razorpay = getRazorpayInstance();
        const order = await razorpay.orders.create({
          amount: amountInPaise,
          currency: currency.toUpperCase(),
          receipt: receipt.slice(0, 40),
          notes: {
            merchant: 'MD FRESH Grocery',
            type: '10-Minute Instant Delivery',
          },
        });

        return NextResponse.json({
          success: true,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: keyId,
          isOfficialRazorpayOrder: true,
        });
      } catch (razorpayErr: any) {
        console.warn('Razorpay live order call note:', razorpayErr?.message || razorpayErr);
      }
    }

    // 2. Fallback client-side / test order token
    const testOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return NextResponse.json({
      success: true,
      orderId: testOrderId,
      amount: amountInPaise,
      currency: currency.toUpperCase(),
      keyId: keyId,
      isOfficialRazorpayOrder: false,
    });
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create Razorpay order' }, { status: 500 });
  }
}
