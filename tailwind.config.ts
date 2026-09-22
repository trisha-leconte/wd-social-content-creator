import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        living: "#1E6F4C",
        people: "#A0650F",
        idea: "#2B4A7D",
        build: "#6B3A67",
      },
    },
  },
  plugins: [],
} satisfies Config;
