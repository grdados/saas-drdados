import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f4f5",
          100: "#e4e4e7",
          200: "#d4d4d8",
          300: "#a1a1aa",
          400: "#71717a",
          500: "#52525b",
          600: "#3f3f46",
          700: "#27272a",
          800: "#1e1e20",
          900: "#161618"
        },
        accent: {
          50: "#fdf6eb",
          100: "#fbe9cc",
          200: "#f7d29b",
          300: "#f2bc6b",
          400: "#e9a944",
          500: "#df9830",
          600: "#c88427",
          700: "#a56d22",
          800: "#84581f",
          900: "#66451b"
        }
      },
      boxShadow: {
        panel: "0 24px 80px rgba(12, 12, 14, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
