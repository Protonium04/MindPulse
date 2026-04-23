/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dce6ff',
          200: '#b9ceff',
          300: '#85a7ff',
          400: '#4d7bff',
          500: '#2a5bf4',
          600: '#1a3de8',
          700: '#162fd4',
          800: '#1827ac',
          900: '#1a2788',
        },
        sage: {
          50:  '#f2f7f4',
          100: '#e0ede6',
          200: '#c2dbce',
          300: '#97c0aa',
          400: '#659e82',
          500: '#438063',
          600: '#31664e',
          700: '#285240',
          800: '#224235',
          900: '#1c372c',
        },
        rose: {
          950: '#2d0a14',
        },
      },
      animation: {
        'fade-up':    'fadeUp 0.5s ease forwards',
        'fade-in':    'fadeIn 0.3s ease forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'wave':       'wave 1.4s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:     { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:     { from: { opacity: 0 }, to: { opacity: 1 } },
        pulseSoft:  { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
        wave:       { '0%,100%': { transform: 'scaleY(0.5)' }, '50%': { transform: 'scaleY(1.4)' } },
      },
    },
  },
  plugins: [],
}
