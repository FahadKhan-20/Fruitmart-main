import { img, offPct, type Product } from './data';
import { useStore } from './store';
import { useNav } from './App';
import { Heart } from './icons';

/** Grid card used on Home ("Popular this week") and Shop. */
export default function ProductCard({ p, showFav = true }: { p: Product; showFav?: boolean }) {
  const { s, d } = useStore();
  const { go } = useNav();
  const qty = s.cart[p.id] || 0;
  return (
    <article className="pcard">
      <div className="pic">
        <button onClick={() => go({ name: 'product', id: p.id })} aria-label={p.name}>
          <span role="img" className="ph" style={{ backgroundImage: `url(${img(p.id)})` }} />
        </button>
        {showFav && (
          <button className="fav" onClick={() => d({ type: 'fav', id: p.id })} aria-label="Save">
            <Heart filled={!!s.favs[p.id]} />
          </button>
        )}
        {showFav && p.mrp && <span className="deal">{offPct(p)}% off</span>}
      </div>
      <div className="meta">
        <span className="name">{p.name}</span>
        <span className="unit">{p.unit}</span>
        <div className="row">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span className="price">₹{p.price}</span>
            {showFav && p.mrp && <span className="mrp">₹{p.mrp}</span>}
          </div>
          <button className={`add ${qty ? 'in' : ''}`} onClick={() => d({ type: 'add', id: p.id })} aria-label={`Add ${p.name}`}>
            {qty ? qty : '+'}
          </button>
        </div>
      </div>
    </article>
  );
}
