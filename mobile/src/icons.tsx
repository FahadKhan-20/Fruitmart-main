const HEART = 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z';

export const Heart = ({ filled, size = 16 }: { filled: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#3F5232' : 'none'} stroke="#3F5232" strokeWidth="2"><path d={HEART} /></svg>
);

export const Back = () => (
  <svg width="11" height="18" viewBox="0 0 12 20" fill="none"><path d="M10 2 2 10l8 8" stroke="#23291F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const Search = ({ color = '#23291F', size = 22, w = 1.8 }: { color?: string; size?: number; w?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);

export const Check = ({ size = 30, w = 3 }: { size?: number; w?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
);

type TabIconProps = { active: boolean };
const c = (a: boolean) => (a ? '#3F5232' : '#8A8E80');

export const TabHome = ({ active }: TabIconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#3F5232' : 'none'} stroke={c(active)} strokeWidth="1.7"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></svg>
);
export const TabShop = ({ active }: TabIconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#3F5232' : 'none'} stroke={c(active)} strokeWidth="1.7"><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" fill="none" /></svg>
);
export const TabSaved = ({ active }: TabIconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? '#3F5232' : 'none'} stroke={c(active)} strokeWidth="1.7"><path d={HEART} /></svg>
);
export const TabBasket = ({ active }: TabIconProps) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c(active)} strokeWidth="1.7"><path d="M3 5h2l2 11h11l2-8H6" /><circle cx="9" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></svg>
);
