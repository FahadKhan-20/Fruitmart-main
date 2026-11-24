import { useNav } from '../App';
import { img, PAYS } from '../data';
import { totals, useStore } from '../store';
import { Check } from '../icons';

export default function Booked() {
  const { s } = useStore();
  const { go, tab } = useNav();
  const o = s.order;
  if (!o) return null;
  const t = totals(o.items);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 'calc(var(--st) + 70px) 22px calc(24px + var(--sb))', gap: 22, overflowY: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
        <div className="pop" style={{ width: 88, height: 88, borderRadius: 999, background: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check /></div>
        </div>
        <span className="display" style={{ fontSize: 30, lineHeight: 1.1 }}>Order booked</span>
        <span className="muted" style={{ fontSize: 15, lineHeight: 1.5 }}>
          Thanks! We’re packing your order.<br />
          {o.slot === 'now' ? 'Arriving in about 25 minutes.' : 'Arriving today, 6–8 PM.'}
        </span>
      </div>
      <div className="card rows">
        <div style={{ padding: '12px 0' }}><span className="muted">Order ID</span><span style={{ fontWeight: 600 }}>#{o.id}</span></div>
        <div style={{ padding: '12px 0' }}><span className="muted">Items</span><span style={{ fontWeight: 600 }}>{t.countLabel}</span></div>
        <div style={{ padding: '12px 0' }}><span className="muted">Payment</span><span style={{ fontWeight: 600 }}>{PAYS.find((p) => p.id === o.pay)?.label}</span></div>
        <div style={{ padding: '12px 0' }}><span className="muted">{o.pay === 'cod' ? 'To pay on delivery' : 'Paid'}</span><span style={{ fontWeight: 700 }}>₹{o.toPay}</span></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', paddingLeft: 10 }}>
        {t.lines.slice(0, 5).map(({ p }) => (
          <div key={p.id} style={{ width: 48, height: 48, borderRadius: 999, overflow: 'hidden', border: '3px solid var(--cream)', marginLeft: -10 }}>
            <span role="img" className="ph" style={{ backgroundImage: `url(${img(p.id)})` }} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn" onClick={() => go({ name: 'tracking' })}>Track order</button>
        <button className="btn ghost" onClick={() => tab('shop')}>Continue shopping</button>
      </div>
    </div>
  );
}
