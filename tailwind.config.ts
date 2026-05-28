import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kiss: {
          DEFAULT: "#d946ef",
          glow: "#f0abfc",
          deep: "#a21caf",
        },
        marry: {
          DEFAULT: "#ffb547",
          glow: "#ffd28a",
          deep: "#b8761a",
        },
        kill: {
          DEFAULT: "#ff3a3a",
          glow: "#ff7a7a",
          deep: "#a30000",
        },
        ink: {
          DEFAULT: "#0a0a0f",
          soft: "#13131c",
          line: "#23232f",
        },
      },
      fontFamily: {
        display:          ["var(--font-display)", "Syne", "system-ui", "sans-serif"],
        sans:             ["var(--font-sans)", "Space Grotesk", "system-ui", "sans-serif"],
        mono:             ["ui-monospace", "SFMono-Regular", "monospace"],
        marker:           ["var(--font-display)", "Syne", "system-ui", "sans-serif"],
        hand:             ["var(--font-sans)", "Space Grotesk", "system-ui", "sans-serif"],
        "permanent-marker": ["var(--font-permanent-marker)", "Permanent Marker", "cursive"],
        caveat:           ["var(--font-caveat)", "Caveat", "cursive"],
        kalam:            ["var(--font-kalam)", "Kalam", "cursive"],
        "indie-flower":   ["var(--font-indie-flower)", "Indie Flower", "cursive"],
        "rock-salt":      ["var(--font-rock-salt)", "Rock Salt", "cursive"],
      },
      animation: {
        "pulse-glow": "pulseGlow 2.4s ease-in-out infinite",
        "marquee": "marquee 40s linear infinite",
        "rise": "rise 0.4s ease-out",
        "shake": "shake 0.5s ease-in-out",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.85", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-4px)" },
          "40%, 80%": { transform: "translateX(4px)" },
        },
      },
      backgroundImage: {
        "grain": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
