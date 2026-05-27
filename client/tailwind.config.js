/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1C382A',
          secondary: '#355744',
          muted: '#5F7668',
          subtle: '#789183',
          surface: '#A9C6B2',
          card: '#BAE4C7'
        }
      },
      fontSize: {
        'base': '1.125rem',
        'xl': '1.35rem',
        '2xl': '1.75rem',
        '3xl': '2.25rem',
      }
    },
  },
  plugins: [],
}