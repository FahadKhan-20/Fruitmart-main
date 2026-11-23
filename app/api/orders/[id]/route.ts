import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAdminRequest, readJson, OrderInputError } from '@/lib/orders';

const ORDER_STATUSES = ['received', 'approved', 'preparing', 'dispatched', 'delivered', 'cancelled'];

// Public order tracker. Order IDs are random, so the ID works as the access key.
// Payment secrets are never returned.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabase.from('orders').select('*').eq('id', id);
    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { razorpay_signature, razorpay_payment_id, razorpay_order_id, stripe_payment_id, ...order } = data[0];
    if (typeof order.items === 'string') {
      try {
        order.items = JSON.parse(order.items);
      } catch {
        order.items = [];
      }
    }
    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Error fetching order by ID:', error);
    return NextResponse.json({ error: 'Could not load order' }, { status: 500 });
  }
}

// Shop-manager only: move an order through its delivery stages.
// Payment status is not editable here; only Razorpay confirmation sets it.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await readJson(req);

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status !== undefined) {
      if (!ORDER_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = body.status;
    }
    if (body.assigned_branch_id) updateData.assigned_branch_id = String(body.assigned_branch_id);
    if (body.assigned_branch_name) updateData.assigned_branch_name = String(body.assigned_branch_name);
    if (body.branch_distance_km !== undefined) updateData.branch_distance_km = Number(body.branch_distance_km);

    const { data: existing, error: findError } = await supabase.from('orders').select('id').eq('id', id);
    if (findError) throw findError;
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { error } = await supabase.from('orders').update(updateData).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof OrderInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Could not update order' }, { status: 500 });
  }
}
