import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: "#0a0a0b",
          raised: "#111113",
          elevated: "#17171a",
        },
        hairline: {
          DEFAULT: "rgba(255,255,255,0.06)",
          strong: "rgba(255,255,255,0.10)",
        },
        ink: {
          DEFAULT: "#f4f1ea",
          muted: "rgba(244,241,234,0.60)",
          dim: "rgba(244,241,234,0.38)",
        },
        champagne: {
          DEFAULT: "#e8d5a8",
          dim: "#a89775",
        },
        danger: "#bc8456",

        background: "#0a0a0b",
        foreground: "#f4f1ea",
        card: "#111113",
        "card-foreground": "#f4f1ea",
        popover: "#111113",
        "popover-foreground": "#f4f1ea",
        primary: "#e8d5a8",
        "primary-foreground": "#0a0a0b",
        secondary: "#17171a",
        "secondary-foreground": "#f4f1ea",
        muted: "#17171a",
        "muted-foreground": "rgba(244,241,234,0.60)",
        accent: "#17171a",
        "accent-foreground": "#f4f1ea",
        destructive: "#bc8456",
        "destructive-foreground": "#f4f1ea",
        border: "rgba(255,255,255,0.06)",
        input: "rgba(255,255,255,0.10)",
        ring: "#e8d5a8",
      },
      fontFamily: {
        sans: ['"Satoshi"', "Segoe UI", "system-ui", "sans-serif"],
        display: ['"Satoshi"', "Segoe UI", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        sharp: "2px",
        card: "8px",
        modal: "16px",
      },
    },
  },
  plugins: [],
} satisfies Config;
