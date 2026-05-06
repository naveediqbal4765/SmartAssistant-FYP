/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
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