import { useNav } from '../App';
import { useStore } from '../store';
import { byId, img, POPULAR } from '../data';
import type { Chip } from '../data';
import ProductCard from '../ProductCard';
import { Search } from '../icons';

const CATS: { label: string; image: string; chip: Chip }[] = [
  { label: 'Fruits', image: img('orange'), chip: 'fruits' },
  { label: 'Vegetables', image: img('broccoli'), chip: 'veg' },
  { label: 'Offers', image: img('watermelon'), chip: 'offers' },
  { label: 'All items', image: img('tomato'), chip: 'all' },
];

export default function Home() {
  const { tab, go, setChip, splashing, toast } = useNav();
  const { s } = useStore();
  const live = s.order && Date.now() - s.order.placedAt < 30 * 60_000 ? s.order : null;
  const shop = (c: Chip, focus = false) => {
    setChip(c);
    sessionStorage.setItem('md-shop-search', focus ? '1' : '');
    tab('shop');
  };

  return (
    <div className="scroll" style={{ paddingBottom: 'calc(var(--nav) + 18px)' }}>
      <div style={{ background: 'var(--green)', padding: 'calc(var(--st) + 14px) 18px 70px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          data-brand-logo
          style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--sage)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 15, flexShrink: 0, visibility: splashing ? 'hidden' : 'visible' }}
        >MD</div>
        <button onClick={() => shop('all', true)} style={{ flex: 1, minWidth: 0, height: 40, borderRadius: 999, background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
          <Search color="#DDE3D3" size={16} w={2.2} />
          <span style={{ fontSize: 14, color: '#C9D1BE', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Search fruits, vegetables…</span>
        </button>
        <button onClick={() => toast('No new notifications')} aria-label="Notifications" style={{ position: 'relative', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>
          <span style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 9, background: 'var(--amber)' }} />
        </button>
      </div>

      <div style={{ margin: '-56px 16px 0', position: 'relative', height: 250, borderRadius: 26, overflow: 'hidden', background: '#E6E0D2' }}>
        <img src="images/hero.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '70% 50%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(244,240,232,0.97) 0%,rgba(244,240,232,0.85) 42%,rgba(244,240,232,0) 72%)' }} />
        <div style={{ position: 'absolute', left: 20, top: 22, bottom: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', maxWidth: 190 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="display" style={{ fontSize: 30, lineHeight: 1.05 }}>Farm Fresh Delivered</span>
            <span style={{ fontSize: 13, color: '#4E5446', lineHeight: 1.35 }}>20% off your first fresh produce order</span>
          </div>
          <button onClick={() => shop('all')} aria-label="Shop now" style={{ width: 48, height: 48, borderRadius: 999, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>

      {live && (
        <button onClick={() => go({ name: 'tracking' })} className="card" style={{ margin: '16px 16px 0', width: 'calc(100% - 32px)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
          <span style={{ width: 10, height: 10, borderRadius: 99, background: 'var(--amber)', boxShadow: '0 0 0 5px rgba(233,162,59,0.2)', flexShrink: 0 }} />
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Order #{live.id} is on its way</span>
            <span className="muted" style={{ fontSize: 12 }}>Tap to track</span>
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Track ›</span>
        </button>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: '22px 16px 0' }}>
        {CATS.map((c) => (
          <button key={c.label} onClick={() => shop(c.chip)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 64, height: 64, borderRadius: 999, overflow: 'hidden', display: 'block', boxShadow: '0 0 0 3px #FFFFFF' }}>
              <span role="img" className="ph" style={{ backgroundImage: `url(${c.image})` }} />
            </span>
            <span style={{ fontSize: 13 }}>{c.label}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '24px 16px 10px' }}>
        <span style={{ fontSize: 19, fontWeight: 600 }}>Popular this week</span>
        <button onClick={() => shop('all')} style={{ fontSize: 13, color: 'var(--muted)', padding: '6px 0' }}>See all ›</button>
      </div>
      <div className="grid">
        {POPULAR.map((id) => byId(id)).map((p) => p && <ProductCard key={p.id} p={p} showFav={false} />)}
      </div>
    </div>
  );
}
