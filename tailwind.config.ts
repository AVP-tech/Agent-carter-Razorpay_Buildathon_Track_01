import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Razorpay-inspired professional palette
        rzp: {
          navy:    "#072654",
          blue:    "#528FF0",
          accent:  "#1A73E8",
          light:   "#DBEAFE",
          ice:     "#EFF6FF",
        },
        // Dark Enterprise SaaS colors
        hackathon: {
          midnight: "#090F1A", // Deep midnight black/slate
          slate: "#131C2D",
          cyan: "#00E5FF", // Electric cyan
          violet: "#9D4EDD", // Subtle violet
          blue: "#3B82F6",
        },
        surface: {
          0:   "#FFFFFF",
          50:  "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#090F1A", // Using midnight here too
        },
        status: {
          success: "#059669",
          warning: "#D97706",
          error:   "#DC2626",
          info:    "#2563EB",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        "card":    "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-md": "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)",
        "card-lg": "0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)",
        "nav":     "0 1px 3px rgba(0,0,0,0.05)",
        "blue":    "0 4px 14px rgba(82,143,240,0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
