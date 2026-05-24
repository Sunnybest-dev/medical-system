/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff',
          300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7',
          600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87',
        },
        medical: {
          green: '#10b981', yellow: '#f59e0b', red: '#ef4444',
          purple: '#9333ea', teal: '#14b8a6',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
