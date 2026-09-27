/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kawaii: {
          bg: '#FFFDF0',         // Soft Cream Yellow
          darkBg: '#1C1724',     // Dark Plum Background
          darkCard: '#2A2335',   // Dark Plum Card
          border: '#4A3E3D',     // Soft Dark Brown outline
          darkBorder: '#8A7398', // Soft Dark Purple outline
          pink: '#FFD6E8',       // Pastel Pink
          mint: '#D1F2E2',       // Soft Mint Green
          purple: '#E3D5FF',     // Pastel Lavender
          blue: '#D0F4DE',       // Soft Sky Blue
          peach: '#FFE6C7',      // Soft Peach/Orange
          yellow: '#FFF1C5',     // Pastel Butter Yellow
          rose: '#FFB7B2',       // Pastel Rose
          cardBg: '#FFFFFF',
        }
      },
      boxShadow: {
        'kawaii': '4px 4px 0px 0px #4A3E3D',
        'kawaii-dark': '4px 4px 0px 0px #8A7398',
        'kawaii-lg': '6px 6px 0px 0px #4A3E3D',
        'kawaii-sm': '2px 2px 0px 0px #4A3E3D',
        'kawaii-hover': '2px 2px 0px 0px #4A3E3D',
      },
      fontFamily: {
        kawaii: ['"Fredoka"', '"Nunito"', 'sans-serif'],
      },
      borderRadius: {
        'kawaii': '1.5rem',
        'kawaii-lg': '2rem',
      }
    },
  },
  plugins: [],
}
