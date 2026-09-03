'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import PageWrapper from '@/components/layout/PageWrapper';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24
    }
  },
};

export default function Home() {
  return (
    <PageWrapper>
      <main className="min-h-screen pt-20 pb-16 px-4 md:px-8">
        <div className="max-w-6xl mx-auto space-y-16">

          {/* Section 1: Hero */}
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-start pt-6"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 bg-blue-50 border border-blue-200 text-blue-600 dark:bg-cyan-900/30 dark:border-cyan-700/40 dark:text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-cyan-400 animate-pulse" />
              AgentCarter • The Autonomous Commerce Layer
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-6xl font-bold leading-tight tracking-tight"
            >
              <span className="text-slate-900 dark:text-white block">Turn AI Intent Into</span>
              <span className="text-rzp-blue dark:text-cyan-400 block mt-1">Instant, Bounded Revenue.</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-slate-500 dark:text-slate-400 text-lg md:text-xl mt-6 max-w-2xl leading-relaxed"
            >
              AgentCarter makes merchants sellable to autonomous AI buyers — maximizing revenue with margin-safe dynamic upsells, strictly bounded limits, and immutable audit trails on Razorpay.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex items-center gap-4 mt-8 flex-wrap"
            >
              <Link href="/chat">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-primary"
                >
                  Launch Agent Carter →
                </motion.button>
              </Link>
              <Link href="/audit">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-secondary"
                >
                  View Audit Ledger
                </motion.button>
              </Link>
            </motion.div>
          </motion.section>

          {/* Section 2: How It Works — Animated Pipeline */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-4"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">How Agent Carter Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { step: "01", icon: "🔍", title: "You Ask", desc: "Search for any product — socks, drones, laptops, anything.", color: "border-l-cyan-500" },
                { step: "02", icon: "🧠", title: "AI Finds It", desc: "Infinite AI catalog generates real products with live pricing instantly.", color: "border-l-violet-500" },
                { step: "03", icon: "💳", title: "Secure Checkout", desc: "Razorpay-powered bounded checkout with margin guardrails.", color: "border-l-emerald-500" },
                { step: "04", icon: "🚀", title: "Smart Upsell", desc: "Post-payment AI suggests complementary products to boost revenue.", color: "border-l-amber-400" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                  className={`metric-card border-l-[3px] ${item.color} group`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Step {item.step}</span>
                  </div>
                  <div className="metric-value text-lg">{item.title}</div>
                  <div className="metric-label text-xs mt-1">{item.desc}</div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Section 3: Three Feature Cards */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            <div className="card-hover p-6 flex flex-col items-start h-full">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg mb-5 bg-blue-50 text-blue-600 dark:bg-cyan-900/30 dark:text-cyan-400">
                R
              </div>
              <h3 className="text-slate-900 dark:text-white font-semibold text-base mb-2">Revenue Growth Engine</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow">
                Intelligently negotiate prices and offer personalized bundles to maximize conversion while adhering to operational limits.
              </p>
              <div className="badge-success">Margin Protected</div>
            </div>

            <div className="card-hover p-6 flex flex-col items-start h-full">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg mb-5 bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                B
              </div>
              <h3 className="text-slate-900 dark:text-white font-semibold text-base mb-2">Bounded Checkout</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow">
                Enforce strict guardrails on maximum discounts and transaction volumes to ensure financial safety and compliance.
              </p>
              <div className="badge-info">Gated Actions</div>
            </div>

            <div className="card-hover p-6 flex flex-col items-start h-full">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg mb-5 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                A
              </div>
              <h3 className="text-slate-900 dark:text-white font-semibold text-base mb-2">Audit Transparency</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow">
                Maintain an immutable trace of all agent decisions and logic branching for full oversight and diagnostic capability.
              </p>
              <div className="badge-navy">Immutable</div>
            </div>
          </motion.section>

          {/* Section 4: Quick Links */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-3"
          >
            <h2 className="text-sm uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">Quick Actions</h2>
            <div className="flex gap-3 flex-wrap">
              <Link href="/catalog" className="card-hover px-4 py-3 flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-rzp-blue dark:hover:text-cyan-400 transition-colors">
                <span className="w-2 h-2 rounded-full bg-blue-300 dark:bg-cyan-500"></span>
                Browse Catalog
              </Link>
              <Link href="/chat" className="card-hover px-4 py-3 flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-rzp-blue dark:hover:text-cyan-400 transition-colors">
                <span className="w-2 h-2 rounded-full bg-blue-300 dark:bg-cyan-500"></span>
                Talk to Agent
              </Link>
              <Link href="/audit" className="card-hover px-4 py-3 flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-rzp-blue dark:hover:text-cyan-400 transition-colors">
                <span className="w-2 h-2 rounded-full bg-blue-300 dark:bg-cyan-500"></span>
                Audit Logs
              </Link>
            </div>
          </motion.section>

        </div>
      </main>
    </PageWrapper>
  );
}
