import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

/**
 * Design tokens dibuat sebagai CSS variables (lihat globals.css) supaya:
 *  - tema bisa diubah dari menu Setting tanpa mengubah kode,
 *  - dark mode cukup override variable yang sama,
 *  - semua komponen memakai token yang sama (pola "sarang laba-laba").
 * Warna ditulis sebagai channel RGB (mis. "10 132 255") agar <alpha-value> jalan.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        "primary-readable": "rgb(var(--primary-readable) / <alpha-value>)",
        "primary-foreground": "rgb(var(--primary-foreground) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        role: "rgb(var(--role) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      borderRadius: {
        ios: "1.25rem",
        "ios-lg": "1.75rem",
        card: "1.375rem", // 22px — radius standar kartu konten (media/anggota/pesan/artikel)
        glass: "1.75rem", // 28px — radius standar pill kaca (top bar / tab bar / sheet)
      },
      boxShadow: {
        ios: "0 8px 30px rgb(0 0 0 / 0.08)",
        "ios-sm": "0 2px 10px rgb(0 0 0 / 0.06)",
        // Kartu putih di atas bg abu iOS: pemisahan datang dari warna permukaan,
        // shadow tinggal "nafas" halus (ala kartu iOS Settings/App Store).
        soft: "0 1px 2px rgb(16 16 20 / 0.03), 0 8px 24px -10px rgb(16 16 20 / 0.06)",
        elevated: "0 2px 5px rgb(16 16 20 / 0.05), 0 14px 34px -10px rgb(16 16 20 / 0.11)",
      },
      backdropBlur: {
        ios: "20px",
      },
    },
  },
  plugins: [typography],
};

export default config;
