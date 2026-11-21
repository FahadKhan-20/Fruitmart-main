import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    const order = data[0];
    if (typeof order.items === 'string') {
      try {
        order.items = JSON.parse(order.items);
      } catch (e) {}
    }

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Error fetching order by ID:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (body.status) updateData.status = body.status;
    if (body.payment_status) updateData.payment_status = body.payment_status;
    if (body.assigned_branch_id) updateData.assigned_branch_id = body.assigned_branch_id;
    if (body.assigned_branch_name) updateData.assigned_branch_name = body.assigned_branch_name;
    if (body.branch_distance_km !== undefined) updateData.branch_distance_km = body.branch_distance_km;

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, order: data ? data[0] : null });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
