/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        polar: {
          950: '#040812',
          900: '#0a0f1e',
          850: '#0d1527',
          800: '#111827',
          700: '#1f2937',
          600: '#374151',
          accent: '#0ea5e9',
          warn: '#f59e0b',
          danger: '#ef4444',
          ok: '#22c55e',
        }
      }
    }
  },
  plugins: []
}
