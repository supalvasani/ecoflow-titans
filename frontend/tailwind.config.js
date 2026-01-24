/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base Neutrals
        background: '#F8FAFC',
        surface: '#FFFFFF',
        sidebar: '#F1F5F9',
        border: '#E2E8F0',
        divider: '#E5E7EB',
        
        // Text
        text: {
          primary: '#111827',
          secondary: '#4B5563',
          muted: '#9CA3AF',
        },
        
        // Primary Brand (Graphite Green)
        primary: {
          DEFAULT: '#1F3D3A',
          hover: '#254B47',
          soft: '#E6F0EE',
        },
        
        // Semantic Colors
        success: {
          strong: '#059669',
          soft: '#ECFDF5',
        },
        warning: {
          strong: '#D97706',
          soft: '#FEF3C7',
        },
        error: {
          strong: '#B42318',
          soft: '#FEE2E2',
        },
        archived: {
          strong: '#6B7280',
          soft: '#F1F5F9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
}