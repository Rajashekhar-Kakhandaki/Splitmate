/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        cover: {
          DEFAULT: "#14251C",
          light: "#1D3327",
        },
        paper: "#F5EFDE",
        ink: "#23201A",
        gold: "#B08D57",
        owe: "#A23B3B",
        owed: "#2F6F5E",
        // Dark mode palette
        dark: {
          bg: "#0F1A14",
          surface: "#1A2820",
          card: "#1F3228",
          border: "#2D4438",
          ink: "#E8E0CC",
          "ink-muted": "#8A9E8E",
        },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
      backgroundImage: {
        "ledger-lines":
          "repeating-linear-gradient(to bottom, transparent, transparent 34px, rgba(35,32,26,0.08) 35px)",
        "ledger-lines-dark":
          "repeating-linear-gradient(to bottom, transparent, transparent 34px, rgba(232,224,204,0.05) 35px)",
      },
    },
  },
  plugins: [],
};
