/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base - Soft pastel blue theme
        background: '#F5F8FC',
        surface: '#FFFFFF',
        sidebar: '#EDF2F9',
        border: '#D6E2F0',
        divider: '#E5ECF6',

        // Text - Darker colors
        text: {
          primary: '#0F172A',
          secondary: '#334155',
          muted: '#64748B',
        },

        // Primary Brand (Pastel Blue)
        primary: {
          DEFAULT: '#6B9FD4',
          foreground: '#FFFFFF',
          hover: '#5A8EC3',
          soft: '#E8F2FC',
        },

        // Accent
        accent: {
          DEFAULT: '#EDF2F9',
          foreground: '#1E3D5C',
        },

        // Semantic Colors - Pastel versions
        success: {
          DEFAULT: '#7BC4A1',
          strong: '#6AB390',
          soft: '#EDF8F3',
        },
        warning: {
          DEFAULT: '#F0C079',
          strong: '#E0B068',
          soft: '#FEF7EC',
        },
        error: {
          DEFAULT: '#E88B8B',
          strong: '#D77A7A',
          soft: '#FEEEED',
        },
        destructive: {
          DEFAULT: '#E88B8B',
          foreground: '#FFFFFF',
        },
        archived: {
          strong: '#8FA5BD',
          soft: '#EDF2F9',
        },

        // Additional UI tokens
        input: '#D6E2F0',
        ring: '#6B9FD4',
        muted: {
          DEFAULT: '#EDF2F9',
          foreground: '#4E6E8C',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#0F172A',
        },
        foreground: '#0F172A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '6px',
        lg: '12px',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(107, 159, 212, 0.08)',
        'soft-lg': '0 4px 16px rgba(107, 159, 212, 0.12)',
      },
    },
  },
  plugins: [],
}