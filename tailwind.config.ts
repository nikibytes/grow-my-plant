import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        leaf: {
          DEFAULT: "#4caf50",
          dark: "#2e7d32",
          light: "#a5d6a7",
        },
        bark: "#6d4c41",
        sky: "#cdeafd",
      },
      fontFamily: {
        display: ["ui-rounded", "system-ui", "sans-serif"],
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { filter: "drop-shadow(0 0 2px rgba(255,235,59,0.6))" },
          "50%": { filter: "drop-shadow(0 0 10px rgba(255,235,59,0.95))" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
