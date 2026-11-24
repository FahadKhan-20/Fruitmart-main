import { useEffect, useState } from 'react';
import { useNav } from '../App';
import { img, PAYS } from '../data';
import { totals, useStore } from '../store';
import { Back, Check } from '../icons';

// Standalone build: progress is simulated from the time the order was placed.
const STEPS = [
  { label: 'Order booked', at: 0 },
  { label: 'Packed', at: 5 },
  { label: 'Out for delivery', at: 9 },
  { label: 'Delivered', at: 25 },
];
const MIN = 60_000;
const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export default function Tracking() {
  const { s } = useStore();
  const { back, toast } = useNav();
  const [now, setNow] = useState(Date.now());
  const [showItems, setShowItems] = useState(false);
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(i);
  }, []);

  const o = s.order;
  if (!o) return null;
  const t = totals(o.items);
  const scheduled = o.slot === 'later';
  const mins = (now - o.placedAt) / MIN;
  const reached = scheduled ? 0 : STEPS.filter((x) => mins >= x.at).length - 1; // index of the latest step reached
  const done = reached === STEPS.length - 1;
  const left = Math.max(1, Math.ceil(25 - mins));
  const pct = scheduled ? 8 : Math.min(100, Math.round((mins / 25) * 100));
  const heading = scheduled ? 'SCHEDULED' : ['ORDER BOOKED', 'PACKED', 'OUT FOR DELIVERY', 'DELIVERED'][reached];
  const big = scheduled ? '6–8 PM' : done ? 'Delivered' : `${left} min`;
  const sub = scheduled ? 'We’ll start packing closer to your slot' : done ? 'Enjoy your fresh produce!' : reached >= 2 ? 'Your order has left the store' : 'We’re getting your order ready';

  return (
    <div className="scroll" style={{ paddingBottom: 'calc(30px + var(--sb))' }}>
      <div className="bar"><button className="icon-btn" onClick={back} aria-label="Back"><Back /></button><span className="t">Order #{o.id}</span></div>
      <div style={{ margin: '12px 16px 0', borderRadius: 24, background: 'var(--green)', color: '#fff', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#C9D1BE', fontWeight: 600, letterSpacing: '0.06em' }}>{heading}</span>
        <span className="display" style={{ fontSize: 40 }}>{big}</span>
        <span style={{ fontSize: 14, color: 'var(--sage)' }}>{sub}</span>
        <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.18)', marginTop: 12, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--amber)', borderRadius: 6, transition: 'width .6s' }} />
        </div>
      </div>
      <div className="card" style={{ margin: '14px 16px 0', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--sage)', color: 'var(--green)', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>RK</span>
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Ravi Kumar</span>
          <span className="muted" style={{ fontSize: 12 }}>Your delivery partner</span>
        </span>
        <button onClick={() => toast('Calling your rider isn’t connected in this demo yet')} aria-label="Call" style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
        </button>
      </div>
      <div className="card" style={{ margin: '14px 16px 0', padding: '18px 16px 6px' }}>
        {STEPS.map((st, i) => {
          const isDone = i < reached || (i === reached && done);
          const current = i === reached && !done;
          const last = i === STEPS.length - 1;
          const time = i <= reached ? clock(o.placedAt + st.at * MIN) : null;
          return (
            <div key={st.label} style={{ display: 'flex', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 22 }}>
                <span style={{ width: 22, height: 22, borderRadius: 999, background: isDone ? 'var(--green)' : current ? 'var(--amber)' : '#D6D0C2', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: current ? '0 0 0 5px rgba(233,162,59,0.2)' : undefined }}>
                  {isDone && <Check size={12} w={3.5} />}
                </span>
                {!last && <span style={{ flex: 1, width: 2, minHeight: 30, background: i < reached ? 'var(--green)' : '#E1DBCD' }} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 18 }}>
                <span style={{ fontSize: 15, fontWeight: current ? 700 : 600, color: i > reached ? 'var(--faint)' : 'var(--ink)' }}>{st.label}</span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {time ? (current && i === 2 ? `On the way · ${time}` : time) : last ? (scheduled ? 'Today, 6–8 PM' : `Expected by ${clock(o.placedAt + 25 * MIN)}`) : 'Pending'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="card" style={{ margin: '14px 16px 0', padding: '14px 16px' }}>
        <button onClick={() => setShowItems(!showItems)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{t.countLabel} · ₹{o.toPay}</span>
            <span className="muted" style={{ fontSize: 12 }}>{PAYS.find((p) => p.id === o.pay)?.label}</span>
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{showItems ? 'Hide items' : 'View items'}</span>
        </button>
        {showItems && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {t.lines.map(({ p, qty, line }) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}><span role="img" className="ph" style={{ backgroundImage: `url(${img(p.id)})` }} /></span>
                <span style={{ flex: 1 }}>{p.name} <span className="muted">× {qty}</span></span>
                <span style={{ fontWeight: 600 }}>₹{line}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
