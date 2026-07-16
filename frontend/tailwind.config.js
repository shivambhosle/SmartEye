/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base surfaces — matched from your existing screenshots
        background: '#0a0e1a',      // page background (near-black navy)
        surface: '#0d1220',         // card background
        'surface-hover': '#131a2b',
        border: '#1e2536',

        // Text
        foreground: '#f5f6f8',
        muted: '#8b93a7',

        // Brand accent — purple gradient used in "Made Simple" + CTA button
        brand: {
          DEFAULT: '#7c3aed',
          light: '#a78bfa',
          dark: '#4c1d95',
        },

        // Amber — used for active nav link + "Open Issues" stat
        accent: {
          DEFAULT: '#f0b429',
          dark: '#b8860b',
        },

        // Status colors, matching the stat-card dots in your screenshots
        status: {
          open: '#f0b429',
          progress: '#3b4252',
          resolved: '#22c55e',
          rate: '#a78bfa',
          urgent: '#ef4444',
          high: '#f97316',
          medium: '#f0b429',
          low: '#22c55e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
      },
    },
  },
  plugins: [],
};