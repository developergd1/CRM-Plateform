import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        growth: {
          gold: "#F5A623",
          goldDark: "#D98207",
          goldLight: "#FEF3C7",
          teal: "#0E8388",
          tealDark: "#0B666A",
          tealLight: "#CCECEE",
          navy: "#0F172A",
          navyLight: "#1E293B",
          slate: "#334155",
          crimson: "#E63946",
          emerald: "#10B981",
          amber: "#F59E0B",
          indigo: "#6366F1",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        dropdown: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        glow: "0 0 15px rgba(245, 166, 35, 0.35)",
        tealGlow: "0 0 15px rgba(14, 131, 136, 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
