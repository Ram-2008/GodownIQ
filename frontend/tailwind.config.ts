import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6f4",
          100: "#d7ebe4",
          200: "#b0d7c9",
          300: "#82bda8",
          400: "#559f87",
          500: "#39826d",
          600: "#2a6857",
          700: "#245448",
          800: "#20443b",
          900: "#1c3932",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
