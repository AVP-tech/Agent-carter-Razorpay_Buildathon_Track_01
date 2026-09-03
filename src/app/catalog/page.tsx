'use client';

import React, { useState, useEffect } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

type Product = {
  id: string;
  sku: string;
  title: string;
  description: string;
  category: string;
  price: number;
  costPrice: number;
  inventoryCount: number;
  tags: string[];
  imageUrl?: string;
};

const CATEGORIES = ['All', 'Espresso Machines', 'Coffee Beans', 'Coffee Accessories', 'Syrups & Flavors', 'Maintenance', 'Industrial Equipment'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const response = await fetch('/api/agent/catalog');
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error('Error fetching catalog:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      product.title.toLowerCase().includes(searchLower) ||
      product.description.toLowerCase().includes(searchLower) ||
      product.sku.toLowerCase().includes(searchLower);
    return matchesCategory && matchesSearch;
  });

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(paise / 100);
  };

  return (
    <PageWrapper>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Product Catalog</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage and view all available products and inventory</p>
        </div>

        <div className="card p-3 flex flex-wrap items-center gap-3 mb-6">
          <input
            type="text"
            placeholder="Search products by title, description or SKU..."
            className="rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] outline-none transition-colors bg-slate-100 border border-slate-200 text-slate-900 focus:border-rzp-blue dark:bg-white/5 dark:border-white/10 dark:text-white dark:focus:border-cyan-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
                  selectedCategory === category
                    ? 'bg-rzp-blue dark:bg-cyan-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-slate-100 dark:bg-white/5 animate-pulse rounded-xl h-64"></div>
            ))}
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5"
          >
            <AnimatePresence>
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  variants={itemVariants}
                  layout
                  className="card card-hover p-5 flex flex-col"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="badge-info">{product.category}</span>
                    {product.inventoryCount > 0 ? (
                      <span className="badge-success">In Stock ({product.inventoryCount})</span>
                    ) : (
                      <span className="badge-error">Out of Stock</span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-3">{product.title}</h3>
                  <div className="mt-3 overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5 aspect-[4/3]">
                    <img
                      src={product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop&q=80'}
                      alt={product.title}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 flex-1">{product.description}</p>

                  {/* Price & Action */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-white/10">
                    <div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 block">Price</span>
                      <span className="text-xl font-bold text-rzp-navy dark:text-cyan-400">
                        {formatCurrency(product.price)}
                      </span>
                    </div>
                    <Link
                      href={`/chat`}
                      className="px-3.5 py-1.5 bg-rzp-blue hover:bg-rzp-accent dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors duration-150 shadow-sm"
                    >
                      Buy with Agent →
                    </Link>
                  </div>

                  {product.tags && product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {product.tags.map((tag, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="text-[11px] font-mono mt-3 text-slate-400 dark:text-slate-500">
                    SKU: {product.sku}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">
                No products found matching your filters.
              </div>
            )}
          </motion.div>
        )}
      </div>
    </PageWrapper>
  );
}
