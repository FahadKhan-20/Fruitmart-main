import { useState } from 'react';
import { useNav } from '../App';
import { PAYS, SLOTS, type PayId, type SlotId } from '../data';
import { totals, useStore } from '../store';
import { Back } from '../icons';
import { Radio } from './Shop';

export default function Checkout() {
  const { s, d } = useStore();
  const { back, reset } = useNav();
  const [slot, setSlot] = useState<SlotId>('now');
  const [pay, setPay] = useState<PayId>('upi');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(s.address);
  const t = totals(s.cart);

  const place = () => {
    if (t.count === 0) return;
    const id = `MDF-${String(Math.floor(10000 + Math.random() * 90000))}`;
    d({ type: 'place', order: { id, placedAt: Date.now(), items: { ...s.cart }, toPay: t.toPay, pay, slot } });
    reset([{ name: 'home' }, { name: 'booked' }]);
  };

  return (
    <>
      <div className="scroll" style={{ paddingBottom: 'calc(110px + var(--sb))' }}>
        <div className="bar"><button className="icon-btn" onClick={back} aria-label="Back"><Back /></button><span className="t">Checkout</span></div>
        <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="label">DELIVER TO</span>
            <div className="card" style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3F5232" strokeWidth="2"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
              </span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Home</span>
                <span className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>{s.address}</span>
              </span>
              <button onClick={() => { setDraft(s.address); setEditing(true); }} style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Change</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="label">DELIVERY TIME</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {SLOTS.map((x) => (
                <button key={x.id} onClick={() => setSlot(x.id)}
                  style={{ borderRadius: 16, border: `1.5px solid ${slot === x.id ? 'var(--green)' : 'var(--line)'}`, background: slot === x.id ? '#EEF0E6' : 'var(--paper)', padding: 14, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{x.label}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{x.sub}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="label">PAYMENT</span>
            <div className="card" style={{ padding: '0 16px' }}>
              {PAYS.map((x, i) => (
                <button key={x.id} onClick={() => setPay(x.id)}
                  style={{ width: '100%', borderBottom: i < PAYS.length - 1 ? '1px solid var(--line2)' : 'none', padding: '16px 0', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{x.label}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{x.sub}</span>
                  </span>
                  <Radio on={pay === x.id} />
                </button>
              ))}
            </div>
          </div>
          <div className="card rows">
            <div><span className="muted">{t.countLabel}</span><span>₹{t.total}</span></div>
            <div><span className="muted">Delivery</span><span>{t.deliveryLabel}</span></div>
            <div className="total"><span>To pay</span><span>₹{t.toPay}</span></div>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 16px calc(14px + var(--sb))', background: 'var(--cream)', borderTop: '1px solid var(--line)' }}>
        <button className="btn" disabled={t.count === 0} onClick={place}>Place order · ₹{t.toPay}</button>
      </div>
      {editing && (
        <div className="sheet-bg" onClick={() => setEditing(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <span style={{ fontSize: 19, fontWeight: 700 }}>Delivery address</span>
            <textarea className="field" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus style={{ resize: 'none', lineHeight: 1.45 }} />
            <button className="btn" disabled={draft.trim().length < 8} onClick={() => { d({ type: 'address', address: draft.trim() }); setEditing(false); }}>Save address</button>
          </div>
        </div>
      )}
    </>
  );
}
