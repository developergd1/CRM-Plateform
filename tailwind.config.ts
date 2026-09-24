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
          teal: "#0E8388",
          tealDark: "#0B666A",
          tealLight: "#E6F7F8",
          orange: "#F97316",
          orangeDark: "#EA580C",
          orangeLight: "#FFEDD5",
          gold: "#F97316", // mapped to energetic orange
          goldDark: "#EA580C",
          goldLight: "#FFEDD5",
          navy: "#0A0F1D",
          navyLight: "#161E31",
          slate: "#334155",
          crimson: "#EA580C", // mapped to orange
          emerald: "#0E8388", // mapped to fresh teal
          amber: "#F97316",   // mapped to orange
          indigo: "#0E8388",  // mapped to teal
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        dropdown: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        glow: "0 0 15px rgba(249, 115, 22, 0.35)",
        tealGlow: "0 0 15px rgba(14, 131, 136, 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
