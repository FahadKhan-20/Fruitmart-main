import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import { byId, DEFAULT_ADDRESS, DELIVERY_FEE, FREE_DELIVERY_AT, type PayId, type SlotId } from './data';

export interface Order {
  id: string;
  placedAt: number;
  items: Record<string, number>;
  toPay: number;
  pay: PayId;
  slot: SlotId;
}

export interface State {
  phone: string | null; // logged in when set
  cart: Record<string, number>;
  favs: Record<string, boolean>;
  address: string;
  order: Order | null;
}

type Action =
  | { type: 'login'; phone: string }
  | { type: 'add'; id: string; qty?: number }
  | { type: 'dec'; id: string }
  | { type: 'fav'; id: string }
  | { type: 'address'; address: string }
  | { type: 'place'; order: Order };

const KEY = 'mdfresh-app-v1';
const initial: State = { phone: null, cart: {}, favs: {}, address: DEFAULT_ADDRESS, order: null };

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initial, ...JSON.parse(raw) };
  } catch { /* storage unavailable: start fresh */ }
  return initial;
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'login': return { ...s, phone: a.phone };
    case 'add': return { ...s, cart: { ...s.cart, [a.id]: (s.cart[a.id] || 0) + (a.qty ?? 1) } };
    case 'dec': {
      const cart = { ...s.cart };
      if ((cart[a.id] || 0) <= 1) delete cart[a.id]; else cart[a.id]--;
      return { ...s, cart };
    }
    case 'fav': return { ...s, favs: { ...s.favs, [a.id]: !s.favs[a.id] } };
    case 'address': return { ...s, address: a.address };
    case 'place': return { ...s, order: a.order, cart: {} };
  }
}

const Ctx = createContext<{ s: State; d: (a: Action) => void } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, d] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }, [s]);
  return <Ctx.Provider value={{ s, d }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}

/** Totals for a cart (or a placed order's items). */
export function totals(cart: Record<string, number>) {
  const lines = Object.entries(cart).flatMap(([id, qty]) => {
    const p = byId(id);
    return p ? [{ p, qty, line: p.price * qty, mrpLine: (p.mrp || p.price) * qty }] : [];
  });
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const total = lines.reduce((a, l) => a + l.line, 0);
  const mrpTotal = lines.reduce((a, l) => a + l.mrpLine, 0);
  const free = total >= FREE_DELIVERY_AT;
  const delivery = count === 0 || free ? 0 : DELIVERY_FEE;
  return {
    lines, count, total, mrpTotal, free, delivery,
    savings: mrpTotal - total,
    toPay: total + delivery,
    countLabel: `${count} item${count === 1 ? '' : 's'}`,
    deliveryLabel: delivery ? `₹${delivery}` : 'Free',
  };
}
