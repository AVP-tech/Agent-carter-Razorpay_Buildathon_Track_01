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
        // "Espresso & Copper" brand palette
        rzp: {
          navy:    "#2A1710", // deep espresso brown-black
          blue:    "#C2622D", // primary brand copper
          accent:  "#E08A3C", // warm amber accent
          light:   "#F3D9BE", // light copper tint
          ice:     "#FBF3EA", // warm ivory tint
        },
        // Dark mode accent set (espresso-bar aesthetic)
        hackathon: {
          midnight: "#170F0A", // near-black warm espresso backdrop
          slate: "#241811",
          cyan: "#F2994A",   // warm copper glow (kept key name for compatibility)
          violet: "#B5651D",
          blue: "#E08A3C",
        },
        surface: {
          0:   "#FFFFFF",
          50:  "#FBF7F2",
          100: "#F5EDE3",
          200: "#E7D8C7",
          300: "#D3BC9E",
          400: "#A98A66",
          500: "#7C6047",
          600: "#5B4433",
          700: "#402F24",
          800: "#291C14",
          900: "#170F0A",
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
        "blue":    "0 4px 14px rgba(194,98,45,0.28)",
      },
    },
  },
  plugins: [],
};
export default config;
