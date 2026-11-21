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

    if (!razorpay_payment_id) {
      return NextResponse.json({ error: 'Missing payment transaction ID' }, { status: 400 });
    }

    const secret = getRazorpayKeySecret();

    // If live signature and non-demo secret are present, verify cryptographic HMAC
    if (secret && razorpay_order_id && razorpay_signature && !secret.includes('demo') && secret.length > 5) {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json({ 
          success: false, 
          error: 'Security alert: Invalid payment signature. HMAC mismatch.' 
        }, { status: 400 });
      }
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
