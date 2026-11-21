import { NextResponse } from 'next/server';

const DB_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') || '50';

    const res = await fetch(`${DB_HOST}/rest/v1/qr_payments?order=created_at.desc`);
    if (!res.ok) {
      return NextResponse.json([]);
    }

    const rows = await res.json();
    return NextResponse.json(rows || []);
  } catch (error: any) {
    console.error('Error fetching qr-ledger:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Manager Soundbox / Store Terminal confirmation
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, paymentId } = body;

    if (!orderId && !paymentId) {
      return NextResponse.json({ error: 'Missing orderId or paymentId' }, { status: 400 });
    }

    const targetKey = orderId ? 'order_id' : 'id';
    const targetVal = orderId || paymentId;

    const generatedUtr = `SB${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`;
    const verifiedAt = new Date().toISOString();

    const patchRes = await fetch(`${DB_HOST}/rest/v1/qr_payments?${targetKey}=eq.${targetVal}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'verified',
        utr_number: generatedUtr,
        verified_via: 'manager_soundbox',
        verified_at: verifiedAt
      })
    });

    if (!patchRes.ok) {
      throw new Error('Failed to update payment status in database ledger');
    }

    const updated = await patchRes.json();
    return NextResponse.json({
      success: true,
      verified: true,
      utrNumber: generatedUtr,
      verifiedVia: 'manager_soundbox',
      payment: Array.isArray(updated) && updated.length > 0 ? updated[0] : null
    });
  } catch (error: any) {
    console.error('Error in qr-ledger POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
