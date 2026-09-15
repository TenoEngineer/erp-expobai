/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agro: {
          dark: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          green: {
            900: '#0F291E',
            800: '#1B4332',
            700: '#2D6A4F',
            600: '#40916C',
            500: '#52B788',
            100: '#D8F3DC',
          },
          gold: {
            700: '#B45309',
            600: '#D97706',
            500: '#F59E0B',
            400: '#FBBF24',
            100: '#FEF3C7',
          },
          orange: {
            700: '#C2410C',
            600: '#EA580C',
            500: '#F97316',
            100: '#FFEDD5',
          }
        }
      }
    },
  },
  plugins: [],
}
