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
          50: "#edf4ff",
          100: "#dce9ff",
          200: "#bfd5ff",
          300: "#8cb5ff",
          400: "#5b91ff",
          500: "#386ef5",
          600: "#274fcf",
          700: "#1e3e9f",
          800: "#1a326f",
          900: "#132448"
        }
      },
      boxShadow: {
        panel: "0 20px 60px rgba(18, 36, 72, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
