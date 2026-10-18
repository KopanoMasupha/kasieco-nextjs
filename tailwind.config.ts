import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#FBF7F1",
          100: "#F1ECE4",
          200: "#EAE0CE",
          300: "#DCCBAE",
        },
        ink: "#171310",
        ember: {
          DEFAULT: "#E85D2B",
          dark: "#C4471C",
        },
        leaf: "#2F6D4F",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1rem",
        xl3: "1.5rem",
      },
    },
  },
  plugins: [],
};
export default config;
