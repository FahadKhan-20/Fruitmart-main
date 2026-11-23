import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabase';
import { getRazorpayInstance, isRazorpayConfigured } from '@/lib/razorpay';
import {
  AWAITING_PAYMENT,
  PAID,
  PAYMENT_TO_VERIFY,
  QR_TTL_SECONDS,
  buildUpiIntent,
  getOrder,
  getShopUpi,
  syncQrPayment,
  upiMode,
} from '@/lib/upiQr';

// POST { orderId } -> a new QR for this order only (its own amount and order reference).
//   direct mode:   QR for the shop's own UPI ID; the shop confirms payment in admin.
//   razorpay mode: single-use, fixed-amount Razorpay QR, confirmed automatically.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const orderId = body?.orderId ? String(body.orderId) : '';
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
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

    if (upiMode() === 'direct') {
      const shop = getShopUpi();
      if (!shop) {
        return NextResponse.json({ error: 'Shop UPI ID is not configured' }, { status: 503 });
      }
      const upiIntent = buildUpiIntent(shop.vpa, shop.name, amountPaise / 100, orderId);
      const imageUrl = await QRCode.toDataURL(upiIntent, { width: 320, margin: 1, errorCorrectionLevel: 'M' });
      return NextResponse.json({
        success: true,
        mode: 'direct',
        imageUrl,
        upiIntent,
        payee: shop.name,
        amount: amountPaise / 100,
        closeBy,
      });
    }

    if (!isRazorpayConfigured() || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: 'UPI payments are not configured. Set SHOP_UPI_ID, or the Razorpay keys.' },
        { status: 503 }
      );
    }

    const qr: any = await getRazorpayInstance().qrCode.create({
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
      mode: 'razorpay',
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

// PATCH { orderId } -> customer says "I've paid" (direct mode). The order waits for the
// shop to confirm in admin; it is never marked Paid from here.
export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const orderId = body?.orderId ? String(body.orderId) : '';
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }
    const order = await getOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.payment_status === AWAITING_PAYMENT) {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: PAYMENT_TO_VERIFY, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
      return NextResponse.json({ success: true, paymentStatus: PAYMENT_TO_VERIFY });
    }
    if (order.payment_status === PAYMENT_TO_VERIFY || order.payment_status === PAID) {
      return NextResponse.json({ success: true, paymentStatus: order.payment_status });
    }
    return NextResponse.json({ error: 'This order is not waiting for a UPI payment' }, { status: 409 });
  } catch (error: any) {
    console.error('UPI claim error:', error);
    return NextResponse.json({ error: 'Could not update payment status' }, { status: 500 });
  }
}

// GET ?orderId=... -> current payment status. In Razorpay mode, asks Razorpay when not yet paid.
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
    if (!paid && upiMode() === 'razorpay' && order.razorpay_order_id?.startsWith('qr_')) {
      paid = await syncQrPayment(orderId, order.razorpay_order_id);
    }

    return NextResponse.json({ orderId, paid, paymentStatus: paid ? PAID : order.payment_status });
  } catch (error: any) {
    console.error('UPI QR status error:', error);
    return NextResponse.json({ error: error?.message || 'Status check failed' }, { status: 500 });
  }
}
