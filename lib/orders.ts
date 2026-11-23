import crypto from 'node:crypto';
import { fetchProducts } from '@/lib/services/productService';
import { computeTotals, isValidIndianPhone, MAX_QTY_PER_ITEM, normalizeIndianPhone } from '@/lib/pricing';
import { getRazorpayInstance, getRazorpayKeySecret } from '@/lib/razorpay';

export const COD_PENDING = 'Pending (Cash on Delivery)';
// Pay on delivery (cash or UPI to the rider at the door).
export const DOORSTEP_PENDING = 'Pending (Pay at Doorstep)';
// What a rider (or the shop) may record when money is collected at the door.
export const DOORSTEP_PAID_STATUSES = [
  'Paid (Cash Collected by Rider)',
  'Paid (UPI Collected by Rider)',
  'Paid (Handover Cash/UPI)',
];

export class OrderInputError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface PricedLine {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  image?: string;
}

// Re-price the cart from the product catalogue. Prices and names sent by the
// browser are ignored; only product id and quantity are trusted.
export async function priceCart(rawItems: unknown) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new OrderInputError('Cart is empty');
  }

  const catalogue = await fetchProducts();
  const byId = new Map(catalogue.map((p) => [String(p.id), p]));
  const merged = new Map<string, number>();

  for (const raw of rawItems) {
    const id = String((raw as any)?.id ?? '');
    const quantity = Number((raw as any)?.quantity);
    if (!id || !Number.isInteger(quantity) || quantity < 1) {
      throw new OrderInputError('Invalid cart item');
    }
    merged.set(id, (merged.get(id) || 0) + quantity);
  }

  const lines: PricedLine[] = [];
  for (const [id, quantity] of merged) {
    const product = byId.get(id);
    if (!product) throw new OrderInputError('A product in your cart is no longer available');
    if (quantity > MAX_QTY_PER_ITEM) {
      throw new OrderInputError(`Maximum ${MAX_QTY_PER_ITEM} of ${product.name} per order`);
    }
    if (typeof product.stock === 'number' && product.stock <= 0) {
      throw new OrderInputError(`${product.name} is out of stock`);
    }
    lines.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity,
      unit: product.unit,
      image: product.image,
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  return { lines, ...computeTotals(subtotal) };
}

export function parseCustomer(body: any) {
  const phone = normalizeIndianPhone(String(body?.customer_phone ?? ''));
  if (!isValidIndianPhone(phone)) {
    throw new OrderInputError('Enter a valid 10-digit mobile number');
  }
  const houseFlatNo = String(body?.house_flat_no ?? '').trim();
  if (!houseFlatNo) {
    throw new OrderInputError('House / Flat number is required');
  }
  const clip = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  const lat = Number(body?.latitude);
  const lng = Number(body?.longitude);

  return {
    name: clip(body?.customer_name, 80) || 'Valued Customer',
    phone: `+91 ${phone}`,
    houseFlatNo: houseFlatNo.slice(0, 120),
    landmark: clip(body?.landmark, 120),
    address: clip(body?.delivery_address, 300) || 'Bengaluru, Karnataka',
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    notes: clip(body?.delivery_notes, 200),
  };
}

export function newOrderId() {
  return `MD-${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`.toUpperCase();
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

// Check a Razorpay Checkout result: the signature must be valid and the Razorpay
// order must be for exactly the amount the server computed.
export async function verifyRazorpayCheckout(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
  expectedPaise: number
) {
  const secret = process.env.RAZORPAY_KEY_SECRET ? getRazorpayKeySecret() : '';
  if (!secret) throw new OrderInputError('Online payments are not configured', 503);

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  if (!safeEqual(expected, String(signature))) {
    throw new OrderInputError('Payment signature is invalid');
  }

  const rzpOrder: any = await getRazorpayInstance().orders.fetch(razorpayOrderId);
  if (Number(rzpOrder?.amount) !== expectedPaise) {
    throw new OrderInputError('Paid amount does not match the order total');
  }
}

// Shop-manager endpoints need `Authorization: Bearer <ADMIN_API_TOKEN>`.
// With no token configured, they are closed.
export function isAdminRequest(req: Request) {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return false;
  const header = req.headers.get('authorization') || '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  return given.length > 0 && safeEqual(given, token);
}

// Delivery partners send `Authorization: Bearer <RIDER_ACCESS_CODE>`. They may only move
// orders through delivery and record money collected at the door. With no code configured
// (or one shorter than 6 characters), rider access is closed.
export function isRiderRequest(req: Request) {
  const code = process.env.RIDER_ACCESS_CODE || '';
  if (code.length < 6) return false;
  const header = req.headers.get('authorization') || '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  return given.length > 0 && safeEqual(given, code);
}

export function staffRole(req: Request): 'admin' | 'rider' | null {
  if (isAdminRequest(req)) return 'admin';
  if (isRiderRequest(req)) return 'rider';
  return null;
}

export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new OrderInputError('Request body must be valid JSON');
  }
}
