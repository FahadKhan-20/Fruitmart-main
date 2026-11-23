'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface CategorySidebarProps {
  categories: { id: string; name: string; image?: string; comingSoon?: boolean }[];
  selectedCategory: string;
  onSelectCategory: (name: string) => void;
}

export default function CategorySidebar({ categories, selectedCategory, onSelectCategory }: CategorySidebarProps) {
  return (
    <div className="flex flex-col gap-2">
      {categories.map((category) => {
        const isSelected = selectedCategory === category.name;

        return (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.name)}
            aria-pressed={isSelected}
            className={`relative flex items-center gap-3 p-3 text-left transition-colors duration-200 rounded-2xl group ${
              isSelected ? '' : 'hover:bg-white/60'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="activeCategory"
                className="absolute inset-0 bg-green-50 rounded-2xl border border-green-200"
                initial={false}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            
            <div className={`relative z-10 w-12 h-12 rounded-xl overflow-hidden shadow-sm transition-transform group-hover:scale-105 ${isSelected ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}>
              <Image
                src={category.image || 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=400&fit=crop'}
                alt={category.name}
                fill
                className="object-cover"
              />
            </div>
            
            <span className={`relative z-10 text-sm font-bold transition-colors ${isSelected ? 'text-green-800' : 'text-gray-600 group-hover:text-gray-900'}`}>
              {category.name}
            </span>
            {category.comingSoon && (
              <span className="relative z-10 ml-auto text-[10px] font-black uppercase tracking-wide text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                Soon
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
