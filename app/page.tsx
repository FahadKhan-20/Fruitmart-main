'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Milk } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import CategorySidebar from '@/components/CategorySidebar';
import Banners from '@/components/Banners';
import Navbar from '@/components/Navbar';
import { useAppStore } from '@/store/useAppStore';
import { useCartStore } from '@/store/cartStore';
import { Product } from '@/types/product';
import { STORE_CATEGORIES } from '@/lib/categories';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Fruits');
  const { searchQuery, setSearchQuery } = useAppStore();
  const syncProducts = useCartStore((s) => s.syncProducts);
  const cartHydrated = useCartStore((s) => s.hasHydrated);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch products and auto-refresh every 5 seconds
  useEffect(() => {
    let isMounted = true;

    const getAllProducts = async (isInitialFetch = false) => {
      const { fetchProducts } = await import('@/lib/services/productService');
      const data = await fetchProducts();
      if (!isMounted) return;
      setAllProducts(data);
      if (isInitialFetch) setIsLoading(false);
    };

    getAllProducts(true);
    const intervalId = setInterval(() => getAllProducts(false), 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Keep cart prices and stock in step with the live catalogue.
  useEffect(() => {
    if (cartHydrated && allProducts.length > 0) syncProducts(allProducts);
  }, [allProducts, cartHydrated, syncProducts]);

  const selectCategory = (name: string) => {
    setSelectedCategory(name);
    setSearchQuery(''); // clear search when clicking category
  };

  // Filter locally for instant tab switching
  const query = searchQuery.trim().toLowerCase();
  const products = allProducts.filter((product) => {
    if (query) {
      return (
        product.name?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      );
    }
    return (product.category || '').toLowerCase() === selectedCategory.toLowerCase();
  });

  const activeCategory = STORE_CATEGORIES.find((c) => c.name === selectedCategory);
  const isComingSoon = !query && Boolean(activeCategory?.comingSoon) && products.length === 0;
  // Changing this key re-runs the grid's enter animation.
  const viewKey = query ? `search:${query}` : `cat:${selectedCategory}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-amber-50/50 flex flex-col">
      <Navbar />
      <main className="flex-1 relative z-10">
        <div className="container px-4 py-8 mx-auto md:px-6">
          <div className="flex flex-col gap-8 md:flex-row">

            {/* Sidebar (Desktop) */}
            <aside className="hidden md:block w-64 shrink-0">
              <div className="sticky top-28 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <h2 className="mb-4 text-sm font-black text-green-900 uppercase tracking-widest opacity-80">
                  Categories
                </h2>
                <CategorySidebar
                  categories={STORE_CATEGORIES}
                  selectedCategory={query ? '' : selectedCategory}
                  onSelectCategory={selectCategory}
                />
              </div>
            </aside>

            {/* Mobile Categories (Horizontal Scroll) */}
            <div className="md:hidden overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
              <div className="flex gap-3 w-max" role="tablist" aria-label="Categories">
                {STORE_CATEGORIES.map((category) => {
                  const isActive = !query && selectedCategory === category.name;
                  return (
                    <button
                      key={category.id}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => selectCategory(category.name)}
                      className={`relative px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap shadow-sm border transition-colors duration-200 ${
                        isActive
                          ? 'text-white border-green-600'
                          : 'bg-white/60 backdrop-blur-md text-gray-700 border-white/80 hover:bg-white/90'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="mobile-category-pill"
                          className="absolute inset-0 rounded-2xl bg-green-600"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        />
                      )}
                      <span className="relative z-10">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {!query && <Banners />}

              <div className="mb-6 flex items-center justify-between gap-3">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.h1
                    key={viewKey}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } }}
                    exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
                    className="text-3xl font-black text-gray-900 tracking-tight min-w-0 truncate"
                  >
                    {query ? `Search Results for "${searchQuery.trim()}"` : selectedCategory}
                  </motion.h1>
                </AnimatePresence>
                <span className="shrink-0 px-3 py-1 bg-white/60 backdrop-blur-md border border-white/60 text-sm font-bold text-green-800 rounded-full shadow-sm">
                  {isComingSoon ? 'Coming soon' : `${products.length} ${products.length === 1 ? 'item' : 'items'}`}
                </span>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-20 flex justify-center items-center"
                  >
                    <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" aria-label="Loading products"></div>
                  </motion.div>
                ) : isComingSoon ? (
                  <motion.div
                    key={viewKey}
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_OUT } }}
                    exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
                    className="py-16 px-6 text-center bg-white/50 backdrop-blur-md rounded-3xl border border-white/70 shadow-sm"
                  >
                    <motion.div
                      initial={{ rotate: -8, scale: 0.8 }}
                      animate={{ rotate: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 16, delay: 0.1 } }}
                      className="mx-auto mb-5 w-20 h-20 rounded-3xl bg-sky-100 text-sky-700 flex items-center justify-center shadow-sm"
                    >
                      <Milk className="w-10 h-10" aria-hidden="true" />
                    </motion.div>
                    <h2 className="text-xl font-black text-gray-900">Dairy is coming soon</h2>
                    <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                      Fresh milk, curd, paneer and butter from local dairies will be here shortly.
                      Meanwhile, browse our farm-fresh fruits and vegetables.
                    </p>
                    <button
                      type="button"
                      onClick={() => selectCategory('Fruits')}
                      className="mt-6 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-sm font-bold shadow-sm transition-colors cursor-pointer"
                    >
                      Shop Fruits
                    </button>
                  </motion.div>
                ) : products.length > 0 ? (
                  <motion.div
                    key={viewKey}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } }}
                    exit={{ opacity: 0, y: -8, transition: { duration: 0.14 } }}
                    className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:gap-6"
                  >
                    {products.map((product, index) => (
                      <ProductCard key={product.id} product={product} index={index} />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key={`empty:${viewKey}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="py-20 text-center bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm"
                  >
                    <p className="text-lg font-bold text-gray-500">No products found.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </main>

      {/* Floating Sticky Cart Bar (Blinkit Style) */}
      <FloatingCartBar />
    </div>
  );
}

function FloatingCartBar() {
  const { getTotalItems, getTotalPrice } = useCartStore();
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const { setCartDrawerOpen } = useAppStore();

  const count = hasHydrated ? getTotalItems() : 0;
  const total = getTotalPrice();

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="floating-cart"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 z-30 md:hidden"
        >
          <button
            onClick={() => setCartDrawerOpen(true)}
            className="w-full p-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-2xl shadow-xl flex items-center justify-between font-black active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center" aria-hidden="true">
                🛒
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs text-green-100 font-bold uppercase tracking-wider">
                  {count} {count === 1 ? 'Item' : 'Items'}
                </div>
                <div className="text-base font-black">₹{total}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-white/20 px-4 py-2 rounded-xl text-sm font-bold">
              <span>View Cart</span>
              <span aria-hidden="true">→</span>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
