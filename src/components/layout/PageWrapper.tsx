"use client";

import { motion } from "framer-motion";

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="pt-20 pb-16 px-4 md:px-8 lg:px-12 max-w-7xl mx-auto"
    >
      {children}
    </motion.div>
  );
}
