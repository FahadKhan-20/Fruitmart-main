import { supabase, isSupabaseConfigured } from '../supabase';
import { Product } from '@/types/product';
import { products as localProducts, getProductsByCategory as getLocalProductsByCategory } from '@/lib/products';

/**
 * Normalizes categories to standard Fruits, Vegetables or Dairy
 */
const normalizeCategory = (cat: string): 'Fruits' | 'Vegetables' | 'Dairy' => {
  if (!cat) return 'Fruits';
  const c = cat.toLowerCase();
  if (c.includes('veg')) return 'Vegetables';
  if (c.includes('dairy') || c.includes('milk')) return 'Dairy';
  return 'Fruits';
};

/**
 * Maps the database snake_case fields back to the local camelCase Product interface
 */
const mapDbToProduct = (dbProduct: any): Product => {
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    category: normalizeCategory(dbProduct.category),
    price: Number(dbProduct.price),
    originalPrice: dbProduct.original_price ? Number(dbProduct.original_price) : undefined,
    unit: dbProduct.unit || 'kg',
    stock: Number(dbProduct.stock ?? 0),
    status: dbProduct.status || (Number(dbProduct.stock) > 0 ? 'In Stock' : 'Out of Stock'),
    image: dbProduct.image || '/images/products/apples.jpg',
    description: dbProduct.description || `${dbProduct.name} - Fresh and farm-picked directly for you.`,
    rating: dbProduct.rating ? Number(dbProduct.rating) : 4.8,
    reviews: dbProduct.reviews ? Number(dbProduct.reviews) : 24,
  };
};


/**
 * Fetches all products from Supabase
 */
export const fetchProducts = async (): Promise<Product[]> => {
  if (!isSupabaseConfigured) {
    return localProducts;
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.error('Error fetching products:', error);
      return localProducts;
    }

    return data.map(mapDbToProduct);
  } catch (err) {
    console.error('Supabase query error, using local products:', err);
    return localProducts;
  }
};

/**
 * Fetches products by category from Supabase
 */
export const fetchProductsByCategory = async (category: string): Promise<Product[]> => {
  if (!isSupabaseConfigured) {
    return getLocalProductsByCategory(category);
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .ilike('category', category)
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.error(`Error fetching products for category ${category}:`, error);
      return getLocalProductsByCategory(category);
    }

    return data.map(mapDbToProduct);
  } catch (err) {
    console.error('Supabase query error, using local products:', err);
    return getLocalProductsByCategory(category);
  }
};

/**
 * Searches products by name from Supabase
 */
export const searchProducts = async (query: string): Promise<Product[]> => {
  if (!isSupabaseConfigured) {
    const q = query.toLowerCase();
    return localProducts.filter(p => p.name.toLowerCase().includes(q));
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.error(`Error searching products for ${query}:`, error);
      const q = query.toLowerCase();
      return localProducts.filter(p => p.name.toLowerCase().includes(q));
    }

    return data.map(mapDbToProduct);
  } catch (err) {
    console.error('Supabase query error, using local products:', err);
    const q = query.toLowerCase();
    return localProducts.filter(p => p.name.toLowerCase().includes(q));
  }
};
