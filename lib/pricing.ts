// Single source of truth for order fees. Used by the cart drawer, checkout and the
// server, so the price a customer sees is the price the server charges.

export const FREE_DELIVERY_THRESHOLD = 399;
export const DELIVERY_FEE = 25;
export const HANDLING_FEE = 2;
export const MAX_QTY_PER_ITEM = 50;

export interface OrderTotals {
  subtotal: number;
  deliveryFee: number;
  handlingFee: number;
  total: number;
}

export function computeTotals(subtotal: number): OrderTotals {
  if (subtotal <= 0) {
    return { subtotal: 0, deliveryFee: 0, handlingFee: 0, total: 0 };
  }
  const deliveryFee = subtotal > FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const handlingFee = HANDLING_FEE;
  return { subtotal, deliveryFee, handlingFee, total: subtotal + deliveryFee + handlingFee };
}

// Normalise anything a user types or pastes ("+91 98765 43210", "098765-43210")
// into at most 10 digits.
export function normalizeIndianPhone(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length > 10 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function isValidIndianPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}
