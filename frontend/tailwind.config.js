/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#69f0ae',
        secondary: '#4caf50',
        background: {
          DEFAULT: '#1E2132',
          dark: '#1a1f2c',
        },
        text: {
          primary: '#e0e0e0',
          secondary: '#9e9e9e',
        },
      },
      animation: {
        'gradient': 'gradient 15s ease infinite',
        'shimmer': 'shimmer 3s infinite',
        'float': 'float 20s infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(10%, 10%) scale(1.1)' },
          '50%': { transform: 'translate(5%, -5%) scale(0.9)' },
          '75%': { transform: 'translate(-10%, 5%) scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
} 