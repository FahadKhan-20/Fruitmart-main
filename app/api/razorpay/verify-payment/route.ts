import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getRazorpayKeySecret } from '@/lib/razorpay';

export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ success: false, error: 'Missing payment ID, order ID or signature' }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET ? getRazorpayKeySecret() : '';
    if (!secret) {
      return NextResponse.json({ success: false, error: 'Razorpay secret not configured' }, { status: 503 });
    }

    // Always verify the HMAC signature. Never accept a payment without it.
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const genBuf = Buffer.from(generatedSignature);
    const sigBuf = Buffer.from(String(razorpay_signature));
    if (genBuf.length !== sigBuf.length || !crypto.timingSafeEqual(genBuf, sigBuf)) {
      return NextResponse.json({
        success: false,
        error: 'Security alert: Invalid payment signature. HMAC mismatch.'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      verified: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Razorpay verification error:', error);
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 });
  }
}
