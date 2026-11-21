import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { markOrderPaid } from '@/lib/upiQr';

// Razorpay calls this URL when a QR code receives a payment.
// Dashboard: Settings -> Webhooks -> add URL, select event "qr_code.credited",
// and set the same secret as RAZORPAY_WEBHOOK_SECRET.
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
  }

  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const event = JSON.parse(raw);
    if (event.event === 'qr_code.credited') {
      const payment = event.payload?.payment?.entity;
      const orderId = event.payload?.qr_code?.entity?.notes?.order_id;
      if (payment && orderId && payment.status === 'captured') {
        await markOrderPaid(orderId, payment.id, Number(payment.amount));
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Razorpay webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
