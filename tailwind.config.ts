import type { Config } from "tailwindcss"
const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "#0c0028",
        foreground: "#ffffff",
        primary: "#ff3bac",
        secondary: "#1a1a2e",
        accent: "#e539ff",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        bebas: ["var(--font-bebas-neue)"],
        heading: ["Bebas Neue", "sans-serif"],
      },
      dropShadow: {
        neon: "0 0 10px rgba(255, 59, 172, 0.8)",
      },
      animation: {
        "neon-pulse": "neon 1.5s ease-in-out infinite alternate",
      },
      keyframes: {
        neon: {
          from: {
            textShadow:
              "0 0 5px rgba(255, 255, 255, 0.8), 0 0 10px rgba(255, 59, 172, 0.8), 0 0 15px rgba(255, 59, 172, 0.6), 0 0 20px rgba(255, 59, 172, 0.4), 0 0 25px rgba(255, 59, 172, 0.3)",
          },
          to: {
            textShadow:
              "0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 59, 172, 0.8), 0 0 30px rgba(255, 59, 172, 0.6), 0 0 40px rgba(255, 59, 172, 0.4), 0 0 50px rgba(255, 59, 172, 0.3)",
          },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
