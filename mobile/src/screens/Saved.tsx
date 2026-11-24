import { useNav } from '../App';
import { img, PRODUCTS } from '../data';
import { useStore } from '../store';
import { Heart } from '../icons';

export default function Saved() {
  const { s, d } = useStore();
  const { go } = useNav();
  const list = PRODUCTS.filter((p) => s.favs[p.id]);

  return (
    <div className="scroll" style={{ paddingBottom: 'calc(var(--nav) + 18px)' }}>
      <div className="title-row"><span className="display">Saved</span></div>
      {list.length === 0 && (
        <div style={{ margin: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>Nothing saved yet</span>
          <span className="muted" style={{ fontSize: 14 }}>Tap the heart on any product to keep it here.</span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px' }}>
        {list.map((p) => {
          const q = s.cart[p.id] || 0;
          return (
            <div key={p.id} className="card" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={() => go({ name: 'product', id: p.id })} style={{ width: 76, height: 76, borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}>
                <span role="img" className="ph" style={{ backgroundImage: `url(${img(p.id)})` }} />
              </button>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{p.name}</span>
                <span className="muted" style={{ fontSize: 13 }}>{p.unit}</span>
                <span style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>₹{p.price}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch' }}>
                <button onClick={() => d({ type: 'fav', id: p.id })} aria-label="Remove" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Heart filled size={18} />
                </button>
                <button onClick={() => d({ type: 'add', id: p.id })}
                  style={{ height: 34, padding: '0 14px', borderRadius: 999, background: q ? 'var(--amber)' : 'var(--green)', color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {q ? `${q} in basket` : 'Add'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
