import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { useStore, totals } from './store';
import type { Chip } from './data';
import Splash from './Splash';
import { TabBasket, TabHome, TabSaved, TabShop } from './icons';
import Login from './screens/Login';
import Home from './screens/Home';
import Shop from './screens/Shop';
import Product from './screens/Product';
import Saved from './screens/Saved';
import Basket from './screens/Basket';
import Checkout from './screens/Checkout';
import Booked from './screens/Booked';
import Tracking from './screens/Tracking';

export type Tab = 'home' | 'shop' | 'saved' | 'basket';
export type Route =
  | { name: Tab }
  | { name: 'product'; id: string }
  | { name: 'checkout' }
  | { name: 'booked' }
  | { name: 'tracking' };

interface Nav {
  route: Route;
  go: (r: Route) => void;
  back: () => void;
  tab: (t: Tab) => void;
  /** Replace the whole stack, e.g. after placing an order. */
  reset: (r: Route[]) => void;
  chip: Chip;
  setChip: (c: Chip) => void;
  toast: (msg: string) => void;
  splashing: boolean;
}

const NavCtx = createContext<Nav | null>(null);
export const useNav = () => {
  const v = useContext(NavCtx);
  if (!v) throw new Error('useNav outside App');
  return v;
};

const isTab = (r: Route): r is { name: Tab } => ['home', 'shop', 'saved', 'basket'].includes(r.name);
// Screens with a dark top edge (green header or photo) get light status-bar icons.
const darkTop = (r: Route | 'login') => r === 'login' || (typeof r !== 'string' && (r.name === 'home' || r.name === 'product'));

export default function App() {
  const { s } = useStore();
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const [chip, setChip] = useState<Chip>('all');
  const [toastMsg, setToastMsg] = useState<{ msg: string; k: number } | null>(null);
  const [splashing, setSplashing] = useState(true);
  const route = stack[stack.length - 1];
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const go = useCallback((r: Route) => setStack((st) => [...st, r]), []);
  const back = useCallback(() => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st)), []);
  const tab = useCallback((t: Tab) => setStack([{ name: t }]), []);
  const reset = useCallback((r: Route[]) => setStack(r), []);
  const toast = useCallback((msg: string) => setToastMsg({ msg, k: Date.now() }), []);
  const endSplash = useCallback(() => setSplashing(false), []);

  // Android hardware back: pop the stack, then go Home, then leave the app.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const h = CapApp.addListener('backButton', () => {
      const st = stackRef.current;
      if (st.length > 1) back();
      else if (st[0].name !== 'home') tab('home');
      else CapApp.exitApp();
    });
    return () => { h.then((x) => x.remove()); };
  }, [back, tab]);

  const loggedIn = !!s.phone;
  const barKey = splashing ? 'splash' : loggedIn ? route.name : 'login';
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const dark = barKey !== 'splash' && darkTop(loggedIn ? route : 'login');
    SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
  }, [barKey, loggedIn, route]);

  const nav: Nav = { route, go, back, tab, reset, chip, setChip, toast, splashing };
  const count = totals(s.cart).count;

  let screen;
  if (!loggedIn) screen = <Login />;
  else switch (route.name) {
    case 'home': screen = <Home />; break;
    case 'shop': screen = <Shop />; break;
    case 'saved': screen = <Saved />; break;
    case 'basket': screen = <Basket />; break;
    case 'product': screen = <Product id={route.id} />; break;
    case 'checkout': screen = <Checkout />; break;
    case 'booked': screen = <Booked />; break;
    case 'tracking': screen = <Tracking />; break;
  }

  const tabs: { id: Tab; label: string; Icon: typeof TabHome }[] = [
    { id: 'home', label: 'Home', Icon: TabHome },
    { id: 'shop', label: 'Shop', Icon: TabShop },
    { id: 'saved', label: 'Saved', Icon: TabSaved },
    { id: 'basket', label: 'Basket', Icon: TabBasket },
  ];

  return (
    <NavCtx.Provider value={nav}>
      <div className="app">
        <div key={loggedIn ? stack.length + ':' + JSON.stringify(route) : 'login'} className={`screen ${isTab(route) ? 'fade' : 'enter'}`}>
          {screen}
        </div>
        {loggedIn && isTab(route) && (
          <nav className="nav">
            {tabs.map(({ id, label, Icon }) => (
              <button key={id} className={route.name === id ? 'on' : ''} onClick={() => tab(id)}>
                <Icon active={route.name === id} />
                {label}
                {id === 'basket' && count > 0 && <span className="badge">{count}</span>}
              </button>
            ))}
          </nav>
        )}
        {toastMsg && <div key={toastMsg.k} className="toast" onAnimationEnd={() => setToastMsg(null)}>{toastMsg.msg}</div>}
      </div>
      {splashing && <Splash onDone={endSplash} />}
    </NavCtx.Provider>
  );
}
