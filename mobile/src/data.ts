export type Category = 'fruits' | 'veg';

export interface Product {
  id: string;
  cat: Category;
  name: string;
  unit: string;
  price: number;
  mrp?: number;
  desc: string;
}

export const img = (id: string) => `images/${id}.jpg`;

export const PRODUCTS: Product[] = [
  { id: 'banana', cat: 'fruits', name: 'Bananas', unit: '1 dozen', price: 50, desc: 'Bright yellow bananas, perfectly ripe. High in potassium and natural sugars.' },
  { id: 'mango', cat: 'fruits', name: 'Mangoes', unit: '1 kg', price: 150, mrp: 180, desc: 'Golden mangoes, the king of fruits. Seasonal specialty with sweet, juicy flesh.' },
  { id: 'orange', cat: 'fruits', name: 'Oranges', unit: '1 kg', price: 80, desc: 'Juicy, sweet oranges packed with vitamin C. Great for fresh juice or eating whole.' },
  { id: 'grapes', cat: 'fruits', name: 'Green Grapes', unit: '1 kg', price: 150, desc: 'Crisp, seedless green grapes. Sweet and refreshing.' },
  { id: 'apple', cat: 'fruits', name: 'Apples', unit: '1 kg', price: 180, mrp: 200, desc: 'Crunchy, sweet-tart apples.' },
  { id: 'pomegranate', cat: 'fruits', name: 'Pomegranate', unit: '1 kg', price: 160, desc: 'Deep red, juicy arils.' },
  { id: 'papaya', cat: 'fruits', name: 'Papaya', unit: '1 piece', price: 60, desc: 'Soft, ripe and ready to eat.' },
  { id: 'watermelon', cat: 'fruits', name: 'Watermelon', unit: '1 piece', price: 70, mrp: 90, desc: 'Sweet and hydrating.' },
  { id: 'broccoli', cat: 'veg', name: 'Broccoli', unit: '1 piece', price: 55, mrp: 70, desc: 'Fresh, green broccoli crowns. Nutrient-dense superfood.' },
  { id: 'capsicum', cat: 'veg', name: 'Capsicum', unit: '1 kg', price: 45, desc: 'Colourful bell peppers. Sweet and crunchy. Great for salads and cooking.' },
  { id: 'carrot', cat: 'veg', name: 'Carrot', unit: '1 kg', price: 45, mrp: 55, desc: 'Bright orange carrots, sweet and crunchy. High in beta-carotene.' },
  { id: 'cauliflower', cat: 'veg', name: 'Cauliflower', unit: '1 piece', price: 40, desc: 'Fresh cauliflower head, white and dense. Low carb.' },
  { id: 'tomato', cat: 'veg', name: 'Tomato', unit: '1 kg', price: 30, desc: 'Firm, ripe and red.' },
  { id: 'onion', cat: 'veg', name: 'Red Onion', unit: '1 kg', price: 35, desc: 'Everyday cooking staple.' },
  { id: 'potato', cat: 'veg', name: 'Potato', unit: '1 kg', price: 32, desc: 'Good for frying and curries.' },
  { id: 'spinach', cat: 'veg', name: 'Spinach', unit: '1 bunch', price: 25, mrp: 30, desc: 'Tender leaves, washed.' },
];

export const byId = (id: string) => PRODUCTS.find((p) => p.id === id);

export const STORAGE: Record<Category, string> = {
  fruits: 'Keep at room temperature until ripe, then refrigerate for up to 4 days. Wash just before eating.',
  veg: 'Refrigerate in the crisper drawer and use within 3 to 5 days. Rinse well before cooking.',
};

export type Chip = 'all' | 'fruits' | 'veg' | 'offers';
export const CHIPS: { id: Chip; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'fruits', label: 'Fruits' },
  { id: 'veg', label: 'Vegetables' },
  { id: 'offers', label: 'On offer' },
];

export const POPULAR = ['banana', 'mango', 'carrot', 'tomato'];

export type PayId = 'upi' | 'card' | 'cod';
export const PAYS: { id: PayId; label: string; sub: string }[] = [
  { id: 'upi', label: 'UPI', sub: 'GPay, PhonePe, Paytm' },
  { id: 'card', label: 'Credit or debit card', sub: 'Visa •••• 4821' },
  { id: 'cod', label: 'Cash on delivery', sub: 'Pay when it arrives' },
];

export type SlotId = 'now' | 'later';
export const SLOTS: { id: SlotId; label: string; sub: string }[] = [
  { id: 'now', label: 'Now', sub: 'In 25 minutes' },
  { id: 'later', label: 'Schedule', sub: 'Today, 6–8 PM' },
];

export const FREE_DELIVERY_AT = 299;
export const DELIVERY_FEE = 25;
export const DEFAULT_ADDRESS = 'No. 14, 3rd Cross, Annasandrapalya, Bengaluru 560017';

export const offPct = (p: Product) => (p.mrp ? Math.round((1 - p.price / p.mrp) * 100) : 0);
