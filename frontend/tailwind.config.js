/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base Neutrals - Soft pastel blue tones
        background: '#F0F4F8',
        surface: '#FFFFFF',
        sidebar: '#E8EDF3',
        border: '#D1DAE5',
        divider: '#E0E7EF',

        // Text
        text: {
          primary: '#1E3A5F',
          secondary: '#4A6B8A',
          muted: '#7A92AB',
        },

        // Primary Brand (Pastel Blue)
        primary: {
          DEFAULT: '#5B8DBE',
          foreground: '#FFFFFF',
          hover: '#4A7BA8',
          soft: '#E3EEF7',
        },

        // Accent for secondary interactive elements
        accent: {
          DEFAULT: '#E8EDF3',
          foreground: '#1E3A5F',
        },

        // Semantic Colors - Pastel versions
        success: {
          DEFAULT: '#6BB896',
          strong: '#5AA885',
          soft: '#E8F5EE',
        },
        warning: {
          DEFAULT: '#E8B563',
          strong: '#D9A552',
          soft: '#FDF4E5',
        },
        error: {
          DEFAULT: '#D97B7B',
          strong: '#C96A6A',
          soft: '#FDEAEA',
        },
        destructive: {
          DEFAULT: '#D97B7B',
          foreground: '#FFFFFF',
        },
        archived: {
          strong: '#8A9BAD',
          soft: '#E8EDF3',
        },

        // Additional UI tokens
        input: '#D1DAE5',
        ring: '#5B8DBE',
        muted: {
          DEFAULT: '#E8EDF3',
          foreground: '#4A6B8A',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#1E3A5F',
        },
        foreground: '#1E3A5F',
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