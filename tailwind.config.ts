import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

// Todas as cores vêm de tokens semânticos (CSS variables) definidos em globals.css.
// Trocar um token muda o site inteiro, nos dois temas.
const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: v("bg-primary"), 2: v("bg-secondary") },
        card: v("surface-card"),
        fg: { DEFAULT: v("text-primary"), 2: v("text-secondary") },
        brand: { DEFAULT: v("brand-primary"), 2: v("brand-secondary"), deep: v("brand-deep") },
        pink: v("accent-pink"),
        purple: v("accent-purple"),
        purple2: v("accent-purple-strong"),
        onpurple: v("text-on-purple"),
        yellow: v("accent-yellow"),
        line: v("border-default"),
        onaccent: v("text-on-accent"),
        danger: v("danger"),
        ok: v("success"),
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem", xl3: "1.75rem" },
      boxShadow: {
        soft: "var(--shadow-default)",
        pop: "var(--shadow-pop)",
      },
      keyframes: {
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        drift: { "0%": { transform: "translateX(0)" }, "50%": { transform: "translateX(18px)" }, "100%": { transform: "translateX(0)" } },
        twinkle: { "0%,100%": { opacity: "0.35", transform: "scale(0.9)" }, "50%": { opacity: "1", transform: "scale(1.1)" } },
        beat: { "0%,100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.12)" } },
        spinner: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        floaty: "floaty 5s ease-in-out infinite",
        drift: "drift 14s ease-in-out infinite",
        twinkle: "twinkle 3s ease-in-out infinite",
        beat: "beat 2.4s ease-in-out infinite",
        spinner: "spinner 0.8s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
