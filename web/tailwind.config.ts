import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "dark-bg": "#1a1a1a",
        "light-blue": "#6B9DCB",
        "accent-blue": "#5A8BB8",
        "light-gray": "#f5f5f5",
        "border-gray": "#e0e0e0",
        "cream": "#f8f5f0",
      },
    },
  },
  plugins: [],
};

export default config;
