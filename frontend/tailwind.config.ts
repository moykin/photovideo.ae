import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm cream page / section backgrounds
        cream: {
          DEFAULT: '#fbf8f2',
          50: '#fdfcf8',
          100: '#fbf8f2',
          200: '#f7f3eb',
          300: '#f4ecda',
          400: '#efe6d2',
          500: '#e7e0d2',
        },
        // Sand — warm neutral borders & muted surfaces
        sand: {
          100: '#f4ecda',
          200: '#efe6d2',
          300: '#e7e0d2',
          400: '#e0d7c5',
          500: '#c9c0ae',
          600: '#a79e8c',
          700: '#8b8273',
        },
        // Gold / bronze accent
        gold: {
          DEFAULT: '#b68a3e',
          50: '#faf4e6',
          100: '#f3e6c8',
          200: '#e4d5b3',
          300: '#d8b978',
          400: '#c79a4f',
          500: '#b68a3e',
          600: '#8a6326',
          700: '#5a4a2a',
        },
        // Ink — headings / dark surfaces / text
        ink: {
          DEFAULT: '#221c15',
          900: '#1c1710',
          800: '#221c15',
          700: '#3a332a',
          600: '#5c5446',
          500: '#6e6557',
          400: '#8b8273',
          300: '#9a917f',
        },
        // Keep 'brand' as an alias for gold so legacy classes keep working
        brand: {
          50: '#faf4e6',
          100: '#f3e6c8',
          200: '#e4d5b3',
          300: '#d8b978',
          400: '#c79a4f',
          500: '#b68a3e',
          600: '#8a6326',
          700: '#5a4a2a',
          800: '#48381f',
          900: '#332817',
          950: '#221c15',
        },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        display: ['var(--font-cormorant)', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #d8b978 0%, #b68a3e 55%, #8a6326 100%)',
        'gradient-dark': 'linear-gradient(180deg, #221c15 0%, #1c1710 100%)',
      },
      boxShadow: {
        soft: '0 12px 30px -16px rgba(60,42,12,.3)',
        card: '0 16px 40px -22px rgba(60,42,12,.4)',
        gold: '0 12px 24px -8px rgba(160,110,30,.55)',
      },
      borderRadius: {
        pill: '999px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      screens: {
        xs: '480px',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
};

export default config;
