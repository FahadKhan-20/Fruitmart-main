import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getRazorpayInstance, isRazorpayConfigured } from '@/lib/razorpay';
import { AWAITING_PAYMENT, PAID, QR_TTL_SECONDS, getOrder, syncQrPayment } from '@/lib/upiQr';

// POST { orderId } -> create a new single-use, fixed-amount UPI QR for this order.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const orderId = body?.orderId ? String(body.orderId) : '';
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }
    if (!isRazorpayConfigured() || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: 'Razorpay keys are not configured. Set NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.' },
        { status: 503 }
      );
    }

    const order = await getOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.payment_status === PAID) {
      return NextResponse.json({ error: 'Order is already paid' }, { status: 409 });
    }
    if (order.payment_status !== AWAITING_PAYMENT) {
      return NextResponse.json({ error: 'This order is not waiting for a UPI payment' }, { status: 409 });
    }

    // Amount comes from the stored order, not from the browser.
    const amountPaise = Math.round(Number(order.total_amount) * 100);
    if (!amountPaise || amountPaise <= 0) {
      return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 });
    }

    const closeBy = Math.floor(Date.now() / 1000) + QR_TTL_SECONDS;
    const razorpay = getRazorpayInstance();
    const qr: any = await razorpay.qrCode.create({
      type: 'upi_qr',
      name: 'MD Fresh Store',
      usage: 'single_use',
      fixed_amount: true,
      payment_amount: amountPaise,
      description: `Order ${orderId}`,
      close_by: closeBy,
      notes: { order_id: orderId },
    } as any);

    const { error } = await supabase
      .from('orders')
      .update({ razorpay_order_id: qr.id, payment_status: AWAITING_PAYMENT, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      qrId: qr.id,
      imageUrl: qr.image_url,
      // Raw UPI intent behind the QR. Lets a phone open PhonePe / Google Pay directly
      // for the same single-use, fixed-amount QR, so server-side confirmation still applies.
      upiIntent:
        typeof qr.image_content === 'string' && qr.image_content.startsWith('upi://')
          ? qr.image_content
          : null,
      amount: amountPaise / 100,
      closeBy,
    });
  } catch (error: any) {
    console.error('UPI QR creation error:', error);
    const detail = error?.error?.description || error?.message || '';
    const message = /auth/i.test(detail)
      ? 'UPI QR is unavailable right now. Please pay by Cash on Delivery or try again later.'
      : detail || 'Failed to create UPI QR';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// GET ?orderId=... -> current payment status. Checks Razorpay when not yet paid.
export async function GET(req: Request) {
  try {
    const orderId = new URL(req.url).searchParams.get('orderId');
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const order = await getOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let paid = order.payment_status === PAID;
    if (!paid && order.razorpay_order_id?.startsWith('qr_')) {
      paid = await syncQrPayment(orderId, order.razorpay_order_id);
    }

    return NextResponse.json({ orderId, paid, paymentStatus: paid ? PAID : order.payment_status });
  } catch (error: any) {
    console.error('UPI QR status error:', error);
    return NextResponse.json({ error: error?.message || 'Status check failed' }, { status: 500 });
  }
}
