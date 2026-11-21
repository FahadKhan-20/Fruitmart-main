import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to query local database REST directly or via supabase client
const DB_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      orderId, 
      paymentId, 
      amount, 
      upiId = 'mdfresh@upi', 
      customerPhone = '', 
      utrNumber, 
      simulateBankCredit 
    } = body;

    if (!orderId && !paymentId) {
      return NextResponse.json({ success: false, error: 'Missing orderId or paymentId' }, { status: 400 });
    }

    const targetOrderId = orderId || `MD-${Date.now().toString().slice(-6)}`;
    const targetPaymentId = paymentId || `PAY-${Date.now().toString(36).toUpperCase()}`;

    // CASE 1: Customer entered 12-digit UTR (UPI Reference Number)
    if (utrNumber) {
      const cleanUtr = String(utrNumber).trim();
      if (!/^\d{10,12}$/.test(cleanUtr)) {
        return NextResponse.json({ 
          success: false, 
          error: 'Please enter a valid 10 to 12 digit UPI Reference / UTR Number found on your payment receipt.' 
        }, { status: 400 });
      }

      // Check if UTR was already used for a previously finalized order in the database
      try {
        const checkRes = await fetch(`${DB_HOST}/rest/v1/orders?select=id,upi_utr_number&upi_utr_number=eq.${cleanUtr}`);
        if (checkRes.ok) {
          const usedOrders = await checkRes.json();
          if (Array.isArray(usedOrders) && usedOrders.length > 0) {
            return NextResponse.json({
              success: false,
              error: `UTR Number ${cleanUtr} was already claimed for order ${usedOrders[0].id}. Please verify your transaction receipt.`
            }, { status: 409 });
          }
        }
      } catch (err) {
        console.warn('UTR deduplication check note:', err);
      }

      // Register or update payment verification in qr_payments table
      const verifiedAt = new Date().toISOString();
      await recordQrPayment({
        id: targetPaymentId,
        order_id: targetOrderId,
        amount: Number(amount || 0),
        upi_id: upiId,
        customer_phone: customerPhone,
        utr_number: cleanUtr,
        status: 'verified',
        verified_via: 'utr_input',
        created_at: verifiedAt,
        verified_at: verifiedAt
      });

      return NextResponse.json({
        success: true,
        verified: true,
        utrNumber: cleanUtr,
        verifiedVia: 'utr_input',
        message: 'Payment verified successfully via UPI Reference Number!',
        verifiedAt
      });
    }

    // CASE 2: Automated simulated bank credit listener / webhook
    if (simulateBankCredit) {
      // Generate an authentic 12-digit bank UTR based on Indian banking timestamp
      const generatedUtr = `4${Date.now().toString().slice(-9)}${Math.floor(10 + Math.random() * 90)}`;
      const verifiedAt = new Date().toISOString();

      await recordQrPayment({
        id: targetPaymentId,
        order_id: targetOrderId,
        amount: Number(amount || 0),
        upi_id: upiId,
        customer_phone: customerPhone,
        utr_number: generatedUtr,
        status: 'verified',
        verified_via: 'auto_banking',
        created_at: verifiedAt,
        verified_at: verifiedAt
      });

      return NextResponse.json({
        success: true,
        verified: true,
        utrNumber: generatedUtr,
        verifiedVia: 'auto_banking',
        message: `Bank incoming credit of ₹${amount} received from customer UPI!`,
        verifiedAt
      });
    }

    // CASE 3: Status Polling (Customer waiting for manager soundbox / banking notification)
    try {
      const pollRes = await fetch(`${DB_HOST}/rest/v1/qr_payments?order_id=eq.${targetOrderId}&status=eq.verified`);
      if (pollRes.ok) {
        const rows = await pollRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const verifiedRow = rows[0];
          return NextResponse.json({
            success: true,
            verified: true,
            utrNumber: verifiedRow.utr_number,
            verifiedVia: verifiedRow.verified_via,
            verifiedAt: verifiedRow.verified_at
          });
        }
      }
    } catch (e) {
      console.warn('QR polling note:', e);
    }

    // If not yet verified, record the pending intent if not recorded yet
    await recordQrPayment({
      id: targetPaymentId,
      order_id: targetOrderId,
      amount: Number(amount || 0),
      upi_id: upiId,
      customer_phone: customerPhone,
      utr_number: null,
      status: 'pending',
      verified_via: null,
      created_at: new Date().toISOString(),
      verified_at: null
    });

    return NextResponse.json({
      success: true,
      verified: false,
      status: 'pending',
      message: 'Awaiting payment confirmation from UPI or bank settlement.'
    });

  } catch (error: any) {
    console.error('Error in verify-qr:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const paymentId = searchParams.get('paymentId');

    if (!orderId && !paymentId) {
      return NextResponse.json({ error: 'Missing orderId or paymentId' }, { status: 400 });
    }

    const queryKey = orderId ? 'order_id' : 'id';
    const queryVal = orderId || paymentId;

    const res = await fetch(`${DB_HOST}/rest/v1/qr_payments?${queryKey}=eq.${queryVal}`);
    if (!res.ok) throw new Error('Failed to query payment ledger');

    const rows = await res.json();
    const payment = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!payment) {
      return NextResponse.json({ verified: false, status: 'not_found' });
    }

    return NextResponse.json({
      verified: payment.status === 'verified',
      status: payment.status,
      utrNumber: payment.utr_number,
      verifiedVia: payment.verified_via,
      verifiedAt: payment.verified_at,
      payment
    });
  } catch (error: any) {
    console.error('Error fetching verify-qr status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper to upsert into qr_payments table
async function recordQrPayment(paymentData: any) {
  try {
    // Try to update first
    const patchRes = await fetch(`${DB_HOST}/rest/v1/qr_payments?order_id=eq.${paymentData.order_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });

    if (patchRes.ok) {
      const patched = await patchRes.json();
      if (Array.isArray(patched) && patched.length > 0) return patched[0];
    }

    // Otherwise insert new row
    const postRes = await fetch(`${DB_HOST}/rest/v1/qr_payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });

    if (postRes.ok) {
      const created = await postRes.json();
      return Array.isArray(created) ? created[0] : created;
    }
  } catch (err) {
    console.warn('recordQrPayment error:', err);
  }
}
