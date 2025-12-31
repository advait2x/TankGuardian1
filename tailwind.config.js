/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0D7377',
          light: '#14919B',
          dark: '#095B5E',
        },
        secondary: {
          DEFAULT: '#FF6B35',
          light: '#FF8B5E',
          dark: '#E55A27',
        },
        accent: {
          mint: '#4ECDC4',
          pink: '#FFB6C1',
        },
        warning: '#FFA726',
        danger: '#E57373',
        surface: {
          DEFAULT: 'rgba(255, 255, 255, 0.7)',
          light: 'rgba(255, 255, 255, 0.85)',
        },
        background: {
          light: '#E8F4F8',
          DEFAULT: '#D4EBF0',
        },
        text: {
          primary: '#2C3E50',
          dark: '#1A252F',
        },
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        manrope: ['Manrope', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'card': '16px',
        'modal': '24px',
        'button': '8px',
      },
    },
  },
  plugins: [],
};
