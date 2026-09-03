"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Agent Chat", href: "/chat" },
  { label: "Catalog", href: "/catalog" },
  { label: "Audit Trail", href: "/audit" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('agentcarter-theme');
    if (saved === 'light') {
      setIsDark(false);
    } else {
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      localStorage.setItem('agentcarter-theme', 'light');
      setIsDark(false);
    } else {
      html.classList.add('dark');
      localStorage.setItem('agentcarter-theme', 'dark');
      setIsDark(true);
    }
  };

  // Don't show navbar on cinematic landing page
  if (pathname === '/') return null;

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b transition-colors duration-300 bg-white/90 border-slate-200 dark:bg-[#0c1322]/90 dark:border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rzp-navy flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Agent<span className="text-rzp-blue dark:text-cyan-400">Carter</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive
                    ? "text-rzp-blue dark:text-cyan-400 bg-blue-50 dark:bg-white/10"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-3 right-3 h-0.5 bg-rzp-blue dark:bg-cyan-400 rounded-full"
                    transition={{ type: "spring" as const, stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors duration-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Test Mode</span>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
