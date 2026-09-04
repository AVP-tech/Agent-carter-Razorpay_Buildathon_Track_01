'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
};

const CATEGORIES = ['All', 'Coffee Appliances', 'Coffee Beans', 'Coffee Accessories', 'Cold Brew', 'Syrups & Flavors', 'Maintenance', 'Industrial Equipment'];

const CATEGORY_ICON: Record<string, string> = {
  'Coffee Appliances': '☕',
  'Coffee Beans': '🫘',
  'Coffee Accessories': '⚙️',
  'Cold Brew': '🧊',
  'Syrups & Flavors': '🍯',
  Maintenance: '🧽',
  'Industrial Equipment': '🏭',
};

// Mirrors the exact affinity rule in src/agent/tools/upsellTool.ts -- same
// pairing logic Agent Carter uses to auto-upsell after a purchase, surfaced
// here too so the cross-sell strategy is visible while just browsing.
// Mirrors CATEGORY_AFFINITY in src/agent/tools/upsellTool.ts -- kept in sync
// so this hint always reflects what the agent will actually recommend.
const PAIRS_WITH: Record<string, string[]> = {
  'Coffee Appliances': ['Coffee Beans', 'Coffee Accessories', 'Maintenance'],
  'Coffee Beans': ['Coffee Accessories', 'Syrups & Flavors'],
  'Coffee Accessories': ['Coffee Beans', 'Coffee Appliances'],
  'Syrups & Flavors': ['Coffee Beans'],
  'Maintenance': ['Coffee Accessories'],
  'Cold Brew': ['Syrups & Flavors', 'Coffee Accessories'],
  'Industrial Equipment': ['Coffee Beans', 'Maintenance'],
};

type SortKey = 'relevance' | 'price-asc' | 'price-desc' | 'name-asc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'price-asc', label: 'Price: Low to High' },
  { key: 'price-desc', label: 'Price: High to Low' },
  { key: 'name-asc', label: 'Name: A to Z' },
];

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
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('relevance');

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

  const filteredProducts = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    let list = products.filter((product) => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesStock = !inStockOnly || product.inventoryCount > 0;
      const matchesSearch =
        product.title.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower) ||
        product.tags?.some((t) => t.toLowerCase().includes(searchLower));
      return matchesCategory && matchesStock && matchesSearch;
    });

    list = [...list];
    if (sortKey === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sortKey === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sortKey === 'name-asc') list.sort((a, b) => a.title.localeCompare(b.title));

    return list;
  }, [products, searchQuery, selectedCategory, inStockOnly, sortKey]);

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(paise / 100);
  };

  return (
    <PageWrapper>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Product Catalog</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Agent-readable inventory — the same catalog Agent Carter searches when a shopper asks.</p>
          </div>
          {!loading && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
              {filteredProducts.length} of {products.length} products
            </span>
          )}
        </div>

        <div className="card p-3 flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Search products by title, description, tag or SKU..."
            className="rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] outline-none transition-colors bg-slate-100 border border-slate-200 text-slate-900 focus:border-rzp-blue dark:bg-white/5 dark:border-white/10 dark:text-white dark:focus:border-orange-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg px-3 py-2 text-sm outline-none transition-colors bg-slate-100 border border-slate-200 text-slate-700 focus:border-rzp-blue dark:bg-white/5 dark:border-white/10 dark:text-slate-200 dark:focus:border-orange-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => setInStockOnly((v) => !v)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
              inStockOnly
                ? 'bg-rzp-blue dark:bg-orange-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10'
            }`}
          >
            {inStockOnly ? '✓ In Stock Only' : 'In Stock Only'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
                selectedCategory === category
                  ? 'bg-rzp-blue dark:bg-orange-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10'
              }`}
            >
              {category}
            </button>
          ))}
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
              {filteredProducts.map((product) => {
                const margin = product.costPrice > 0 ? Math.round(((product.price - product.costPrice) / product.price) * 100) : null;
                return (
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

                  <div className="flex items-center gap-3 mt-3">
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center text-xl shrink-0 bg-orange-50 dark:bg-orange-900/20">
                      {CATEGORY_ICON[product.category] || '📦'}
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-snug">{product.title}</h3>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-3 flex-1">{product.description}</p>

                  {/* Price & Action */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-white/10">
                    <div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 block">Price (incl. GST)</span>
                      <span className="text-xl font-bold text-rzp-navy dark:text-orange-400">
                        {formatCurrency(Math.round(product.price * 1.18))}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
                        {formatCurrency(product.price)} + 18% GST
                      </span>
                    </div>
                    <Link
                      href={`/chat`}
                      className="px-3.5 py-1.5 bg-rzp-blue hover:bg-rzp-accent dark:bg-orange-600 dark:hover:bg-orange-500 text-white text-xs font-semibold rounded-lg transition-colors duration-150 shadow-sm"
                    >
                      Buy with Agent →
                    </Link>
                  </div>

                  {PAIRS_WITH[product.category] && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Pairs well with</span>
                      <span>{PAIRS_WITH[product.category].join(' · ')}</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-semibold">Agent bundles at 12% off</span>
                    </div>
                  )}

                  {product.tags && product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {product.tags.map((tag, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      SKU: {product.sku}
                    </div>
                    {margin !== null && (
                      <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400" title="Margin protected by guardrail engine">
                        {margin}% margin
                      </div>
                    )}
                  </div>
                </motion.div>
              );})}
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
