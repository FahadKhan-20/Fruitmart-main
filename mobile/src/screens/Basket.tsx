import { useNav } from '../App';
import { FREE_DELIVERY_AT, img } from '../data';
import { totals, useStore } from '../store';

export default function Basket() {
  const { s, d } = useStore();
  const { go, tab } = useNav();
  const t = totals(s.cart);
  const pct = Math.min(100, Math.round((t.total / FREE_DELIVERY_AT) * 100));

  return (
    <>
      <div className="scroll" style={{ paddingBottom: 'calc(var(--nav) + 90px)' }}>
        <div className="title-row"><span className="display">Basket</span><span className="muted" style={{ fontSize: 14 }}>{t.countLabel}</span></div>
        <div className="card" style={{ margin: '0 16px 12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{t.free ? 'Free delivery unlocked' : `Add ₹${FREE_DELIVERY_AT - t.total} more for free delivery`}</span>
          <div style={{ height: 6, borderRadius: 6, background: 'var(--line)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--green)', borderRadius: 6, transition: 'width .3s' }} />
          </div>
        </div>
        {t.count === 0 && (
          <div style={{ margin: '30px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>Your basket is empty</span>
            <span className="muted" style={{ fontSize: 14 }}>Add something fresh to get started.</span>
            <button className="btn ghost" onClick={() => tab('shop')} style={{ marginTop: 14, width: 'auto', padding: '0 28px', height: 48 }}>Browse the shop</button>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px' }}>
          {t.lines.map(({ p, qty, line }) => (
            <div key={p.id} className="card" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => go({ name: 'product', id: p.id })} style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
                <span role="img" className="ph" style={{ backgroundImage: `url(${img(p.id)})` }} />
              </button>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                <span className="muted" style={{ fontSize: 12 }}>{p.unit}</span>
                <span style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>₹{line}</span>
              </div>
              <div className="qty">
                <button onClick={() => d({ type: 'dec', id: p.id })} aria-label="Less">−</button>
                <span>{qty}</span>
                <button onClick={() => d({ type: 'add', id: p.id })} aria-label="More">+</button>
              </div>
            </div>
          ))}
        </div>
        {t.count > 0 && (
          <div className="card rows" style={{ margin: '16px 16px 0' }}>
            <div><span className="muted">Item total</span><span>₹{t.mrpTotal}</span></div>
            {t.savings > 0 && <div style={{ color: 'var(--green)', fontWeight: 600 }}><span>You save</span><span>−₹{t.savings}</span></div>}
            <div><span className="muted">Delivery</span><span>{t.deliveryLabel}</span></div>
            <div className="total"><span>To pay</span><span>₹{t.toPay}</span></div>
          </div>
        )}
      </div>
      {t.count > 0 && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 'calc(var(--nav) + 12px)' }}>
          <button className="btn" onClick={() => go({ name: 'checkout' })} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', boxShadow: '0 6px 20px rgba(35,41,31,0.18)' }}>
            <span>Checkout</span><span>₹{t.toPay}</span>
          </button>
        </div>
      )}
    </>
  );
}
