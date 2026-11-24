import { useState } from 'react';
import { useNav } from '../App';
import { byId, img, STORAGE } from '../data';
import { useStore } from '../store';
import { Back, Heart } from '../icons';

export default function Product({ id }: { id: string }) {
  const { s, d } = useStore();
  const { back, toast } = useNav();
  const [pick, setPick] = useState(1);
  const [tabSel, setTabSel] = useState<'details' | 'storage'>('details');
  const p = byId(id);
  if (!p) return null;
  const inCart = s.cart[p.id] || 0;

  const add = () => {
    d({ type: 'add', id: p.id, qty: pick });
    toast(`${pick} × ${p.name} added to basket`);
    setPick(1);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--sage)', overflow: 'hidden' }}>
      <img src={img(p.id)} alt={p.name} style={{ position: 'absolute', left: 0, right: 0, top: 0, width: '100%', height: '54%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 140, background: 'linear-gradient(180deg,rgba(0,0,0,0.28),rgba(0,0,0,0))' }} />
      <div style={{ position: 'absolute', top: 'calc(var(--st) + 10px)', left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={back} aria-label="Back" className="icon-btn" style={{ background: 'rgba(251,249,244,0.9)' }}><Back /></button>
        <button onClick={() => d({ type: 'fav', id: p.id })} aria-label="Save" className="icon-btn" style={{ background: 'rgba(251,249,244,0.9)' }}>
          <Heart filled={!!s.favs[p.id]} size={20} />
        </button>
      </div>
      <div className="scroll" style={{ top: 'calc(54% - 40px)', background: 'var(--cream)', borderRadius: '30px 30px 0 0', padding: '26px 22px calc(30px + var(--sb))', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="display" style={{ fontSize: 26, lineHeight: 1.1 }}>{p.name}</span>
            <span className="muted" style={{ fontSize: 14 }}>{p.unit} · {p.cat === 'fruits' ? 'Fruits' : 'Vegetables'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 24, fontWeight: 600 }}>₹{p.price}</span>
            {p.mrp && <span style={{ fontSize: 13, color: 'var(--faint)', textDecoration: 'line-through' }}>₹{p.mrp}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ height: 54, display: 'flex', alignItems: 'center', borderRadius: 999, border: '1px solid #D6D0C2', flexShrink: 0 }}>
            <button onClick={() => setPick((n) => Math.max(1, n - 1))} aria-label="Less" style={{ width: 48, height: 52, fontSize: 20 }}>−</button>
            <span style={{ minWidth: 20, textAlign: 'center', fontSize: 17, fontWeight: 500 }}>{pick}</span>
            <button onClick={() => setPick((n) => n + 1)} aria-label="More" style={{ width: 48, height: 52, fontSize: 20 }}>+</button>
          </div>
          <button className="btn" onClick={add} style={{ height: 54, fontWeight: 500, fontSize: 15 }}>
            {inCart ? `Add to basket · ${inCart} in basket` : `Add to basket · ₹${p.price * pick}`}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 28, borderBottom: '1px solid #E1DBCD' }}>
          {(['details', 'storage'] as const).map((t) => (
            <button key={t} onClick={() => setTabSel(t)}
              style={{ padding: '0 0 10px', fontSize: 15, fontWeight: tabSel === t ? 600 : 400, color: tabSel === t ? 'var(--ink)' : 'var(--faint)', borderBottom: `2px solid ${tabSel === t ? 'var(--green)' : 'transparent'}`, marginBottom: -1 }}>
              {t === 'details' ? 'Details' : 'Storage'}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 15, color: '#4E5446', lineHeight: 1.5 }}>{tabSel === 'details' ? p.desc : STORAGE[p.cat]}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, background: 'var(--sand)' }}>
          <span style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3F5232" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
          </span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Arrives in 25 min</span>
            <span className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.address}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
