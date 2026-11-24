import { useEffect, useRef, useState } from 'react';
import { useNav } from '../App';
import { CHIPS, PRODUCTS } from '../data';
import ProductCard from '../ProductCard';
import { Search } from '../icons';

type Sort = 'popular' | 'low' | 'high';
const SORTS: { id: Sort; label: string }[] = [
  { id: 'popular', label: 'Popular' },
  { id: 'low', label: 'Price: low to high' },
  { id: 'high', label: 'Price: high to low' },
];

export default function Shop() {
  const { chip, setChip } = useNav();
  const [searching, setSearching] = useState(() => sessionStorage.getItem('md-shop-search') === '1');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('popular');
  const [sortOpen, setSortOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sessionStorage.removeItem('md-shop-search');
    if (searching) setTimeout(() => inputRef.current?.focus(), 200);
  }, [searching]);

  let list = PRODUCTS;
  if (chip === 'fruits' || chip === 'veg') list = list.filter((p) => p.cat === chip);
  if (chip === 'offers') list = list.filter((p) => p.mrp);
  const needle = q.trim().toLowerCase();
  if (needle) list = list.filter((p) => p.name.toLowerCase().includes(needle));
  if (sort !== 'popular') list = [...list].sort((a, b) => (sort === 'low' ? a.price - b.price : b.price - a.price));

  return (
    <>
      <div className="scroll" style={{ padding: 'calc(var(--st) + 8px) 0 calc(var(--nav) + 18px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px 0', gap: 8, minHeight: 44 }}>
          {searching ? (
            <label style={{ flex: 1, height: 44, borderRadius: 999, background: 'var(--paper)', border: '1px solid #D6D0C2', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
              <Search size={18} />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fruits, vegetables…" enterKeyHint="search"
                style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', font: 'inherit', fontSize: 15, color: 'var(--ink)' }} />
            </label>
          ) : (
            <span className="display" style={{ fontSize: 32 }}>Shop</span>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="icon-btn" aria-label={searching ? 'Close search' : 'Search'} onClick={() => { setSearching(!searching); setQ(''); }}>
              {searching
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#23291F" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                : <Search />}
            </button>
            <button className="icon-btn" aria-label="Sort" onClick={() => setSortOpen(true)} style={{ background: sort !== 'popular' ? 'var(--sage)' : undefined }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#23291F" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '14px 18px 4px' }}>
          {CHIPS.map((c) => (
            <button key={c.id} className={`chip ${chip === c.id ? 'on' : ''}`} onClick={() => setChip(c.id)}>{c.label}</button>
          ))}
        </div>
        {list.length === 0 ? (
          <div style={{ margin: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>No matches</span>
            <span className="muted" style={{ fontSize: 14 }}>Try another name or category.</span>
          </div>
        ) : (
          <div className="grid" style={{ paddingTop: 12 }}>
            {list.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
      {sortOpen && (
        <div className="sheet-bg" onClick={() => setSortOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <span style={{ fontSize: 19, fontWeight: 700 }}>Sort by</span>
            <div className="card" style={{ padding: '0 16px' }}>
              {SORTS.map((o, i) => (
                <button key={o.id} onClick={() => { setSort(o.id); setSortOpen(false); }}
                  style={{ width: '100%', padding: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < SORTS.length - 1 ? '1px solid var(--line2)' : 'none', fontSize: 15, fontWeight: sort === o.id ? 700 : 500, textAlign: 'left' }}>
                  {o.label}
                  <Radio on={sort === o.id} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const Radio = ({ on }: { on: boolean }) => (
  <span style={{ width: 22, height: 22, borderRadius: 999, border: `2px solid ${on ? 'var(--green)' : '#C9C3B5'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    <span style={{ width: 10, height: 10, borderRadius: 999, background: on ? 'var(--green)' : 'transparent' }} />
  </span>
);
