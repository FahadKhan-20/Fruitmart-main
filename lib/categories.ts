// Store sections shown in the sidebar, mobile chips and the products page.
// A section with no products (Dairy, for now) shows a "coming soon" state.
export interface StoreCategory {
  id: string;
  name: 'Fruits' | 'Vegetables' | 'Dairy';
  image: string;
  comingSoon?: boolean;
}

export const STORE_CATEGORIES: StoreCategory[] = [
  { id: '1', name: 'Fruits', image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=400&fit=crop' },
  { id: '2', name: 'Vegetables', image: '/images/categories/vegetables.jpg' },
  { id: '3', name: 'Dairy', image: '/images/categories/dairy.svg', comingSoon: true },
];
