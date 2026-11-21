import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { findNearestBranch } from '@/lib/branches';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const branch = searchParams.get('branch');

    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (branch && branch !== 'all') {
      query = query.eq('assigned_branch_id', branch);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const customerLat = body.latitude || null;
    const customerLng = body.longitude || null;
    const deliveryAddress = body.delivery_address || body.deliveryAddress || 'Bengaluru, Karnataka';

    // Auto-calculate nearest branch routing
    let branchId = body.assigned_branch_id || body.assignedBranchId || null;
    let branchName = body.assigned_branch_name || body.assignedBranchName || null;
    let branchDistance = body.branch_distance_km != null ? Number(body.branch_distance_km) : null;

    if (!branchId || !branchName) {
      const routing = findNearestBranch(customerLat, customerLng, deliveryAddress);
      branchId = routing.branch.id;
      branchName = routing.branch.name;
      branchDistance = routing.distanceKm;
    }

    const orderPayload = {
      id: body.id || `MD-${Date.now().toString().slice(-6)}`,
      customer_name: body.customer_name || body.customerName || 'Customer',
      customer_phone: body.customer_phone || body.customerPhone || '+91 9876543210',
      delivery_address: deliveryAddress,
      latitude: customerLat,
      longitude: customerLng,
      assigned_branch_id: branchId,
      assigned_branch_name: branchName,
      branch_distance_km: branchDistance,
      items: typeof body.items === 'string' ? body.items : JSON.stringify(body.items || []),
      subtotal: Number(body.subtotal || body.totalAmount || 0),
      delivery_fee: Number(body.delivery_fee ?? body.deliveryFee ?? 0),
      handling_fee: Number(body.handling_fee ?? body.handlingFee ?? 2),
      total_amount: Number(body.total_amount ?? body.totalAmount ?? 0),
      payment_method: body.payment_method || body.paymentMethod || 'Online',
      payment_status: body.payment_status || body.paymentStatus || (body.payment_method?.includes('Cash') ? 'Pending (COD)' : 'Paid'),
      stripe_payment_id: body.stripe_payment_id || null,
      razorpay_order_id: body.razorpay_order_id || null,
      razorpay_payment_id: body.razorpay_payment_id || null,
      razorpay_signature: body.razorpay_signature || null,
      status: 'received',
      delivery_notes: body.delivery_notes || body.deliveryNotes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('orders').insert([orderPayload]);
    if (error) throw error;

    return NextResponse.json({ success: true, order: data ? data[0] : orderPayload });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
