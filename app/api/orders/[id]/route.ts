import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  DOORSTEP_PAID_STATUSES,
  DOORSTEP_PENDING,
  OrderInputError,
  readJson,
  staffRole,
} from '@/lib/orders';
import { AWAITING_PAYMENT, PAID, PAYMENT_NOT_RECEIVED, PAYMENT_TO_VERIFY } from '@/lib/upiQr';

const ORDER_STATUSES = ['received', 'approved', 'preparing', 'dispatched', 'arrived', 'delivered', 'cancelled'];
// Riders only handle the delivery leg.
const RIDER_STATUSES = ['dispatched', 'arrived', 'delivered'];
const FULFILMENT_STATUSES = ['approved', 'preparing', 'dispatched', 'arrived', 'delivered'];
const PREPAID_UPI_PENDING = [AWAITING_PAYMENT, PAYMENT_TO_VERIFY, PAYMENT_NOT_RECEIVED];

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

// Staff only (shop manager or delivery partner).
//   Shop manager: any delivery status; confirms prepaid UPI ("Paid" / "Payment not received");
//                 records doorstep collection.
//   Rider:        dispatched / arrived / delivered, rider details, doorstep collection.
// Nobody can mark an order Paid unless it is waiting for that kind of payment.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = staffRole(req);
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await readJson(req);

    const { data: existing, error: findError } = await supabase.from('orders').select('*').eq('id', id);
    if (findError) throw findError;
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    const current = existing[0];
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.status !== undefined) {
      const allowed = role === 'admin' ? ORDER_STATUSES : RIDER_STATUSES;
      if (!allowed.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      if (current.status === 'cancelled' || (current.status === 'delivered' && body.status !== 'delivered')) {
        return NextResponse.json({ error: `Order is already ${current.status}` }, { status: 409 });
      }
      updateData.status = body.status;
      if (body.status === 'arrived') updateData.arrival_time = new Date().toISOString();
    }

    if (role === 'admin') {
      if (body.assigned_branch_id) updateData.assigned_branch_id = String(body.assigned_branch_id);
      if (body.assigned_branch_name) updateData.assigned_branch_name = String(body.assigned_branch_name);
      if (body.branch_distance_km !== undefined) updateData.branch_distance_km = Number(body.branch_distance_km);
    }
    if (body.rider_name) updateData.rider_name = String(body.rider_name).slice(0, 80);
    if (body.rider_phone) updateData.rider_phone = String(body.rider_phone).replace(/[^\d+ ]/g, '').slice(0, 16);

    let nextPaymentStatus: string = current.payment_status;
    if (body.payment_status !== undefined) {
      const wanted = String(body.payment_status);
      if (current.payment_status === DOORSTEP_PENDING && DOORSTEP_PAID_STATUSES.includes(wanted)) {
        // Money collected at the door.
        updateData.payment_collected_by = String(body.payment_collected_by || body.rider_name || role).slice(0, 80);
      } else if (
        role === 'admin' &&
        PREPAID_UPI_PENDING.includes(current.payment_status) &&
        [PAID, PAYMENT_NOT_RECEIVED].includes(wanted)
      ) {
        // Shop checked its UPI app for a prepaid order.
      } else if (wanted === current.payment_status) {
        // No change (e.g. rider re-sends the status it already has).
      } else {
        return NextResponse.json(
          { error: `Cannot change payment from "${current.payment_status}" to "${wanted}"` },
          { status: 409 }
        );
      }
      nextPaymentStatus = wanted;
      updateData.payment_status = wanted;
    }

    // Do not pack or send a prepaid UPI order whose payment the shop has not seen.
    if (
      updateData.status &&
      FULFILMENT_STATUSES.includes(updateData.status as string) &&
      PREPAID_UPI_PENDING.includes(nextPaymentStatus)
    ) {
      return NextResponse.json(
        { error: 'Confirm the UPI payment (Mark as paid) before approving this order' },
        { status: 409 }
      );
    }

    // A doorstep order cannot be closed as delivered while its money is still uncollected.
    if (updateData.status === 'delivered' && nextPaymentStatus === DOORSTEP_PENDING) {
      return NextResponse.json(
        { error: 'Record the cash or UPI collected at the door before marking delivered' },
        { status: 409 }
      );
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
