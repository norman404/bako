import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: "#181825",   // mocha mantle
          raised: "#1e1e2e",    // mocha base
          elevated: "#313244",  // mocha surface0
        },
        hairline: {
          DEFAULT: "rgba(205,214,244,0.07)",
          strong: "rgba(205,214,244,0.12)",
        },
        ink: {
          DEFAULT: "#cdd6f4",
          muted: "rgba(205,214,244,0.60)",
          dim: "rgba(205,214,244,0.38)",
        },
        champagne: {
          DEFAULT: "#cba6f7",  // mocha mauve
          dim: "#9273c4",
        },
        danger: "#f38ba8",     // mocha red

        background: "#181825",
        foreground: "#cdd6f4",
        card: "#1e1e2e",
        "card-foreground": "#cdd6f4",
        popover: "#1e1e2e",
        "popover-foreground": "#cdd6f4",
        primary: "#cba6f7",
        "primary-foreground": "#181825",
        secondary: "#313244",
        "secondary-foreground": "#cdd6f4",
        muted: "#313244",
        "muted-foreground": "rgba(205,214,244,0.60)",
        accent: "#313244",
        "accent-foreground": "#cdd6f4",
        destructive: "#f38ba8",
        "destructive-foreground": "#181825",
        border: "rgba(205,214,244,0.07)",
        input: "rgba(205,214,244,0.12)",
        ring: "#cba6f7",
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
