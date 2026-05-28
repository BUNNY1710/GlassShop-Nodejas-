/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Instrument Sans"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        display: [
          '"Bricolage Grotesque"',
          '"Instrument Sans"',
          'ui-sans-serif',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          'ui-monospace',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem',    letterSpacing: '0.02em' }],
        xs:   ['0.75rem',   { lineHeight: '1.125rem' }],
        sm:   ['0.8125rem', { lineHeight: '1.25rem'  }],
        base: ['0.9375rem', { lineHeight: '1.5rem'   }],
        lg:   ['1.0625rem', { lineHeight: '1.625rem' }],
        xl:   ['1.25rem',   { lineHeight: '1.75rem',  letterSpacing: '-0.01em' }],
        '2xl':['1.5rem',    { lineHeight: '2rem',     letterSpacing: '-0.02em' }],
        '3xl':['1.875rem',  { lineHeight: '2.25rem',  letterSpacing: '-0.025em' }],
        '4xl':['2.25rem',   { lineHeight: '2.5rem',   letterSpacing: '-0.03em' }],
        '5xl':['3rem',      { lineHeight: '1.08',     letterSpacing: '-0.04em' }],
        '6xl':['3.75rem',   { lineHeight: '1.04',     letterSpacing: '-0.045em' }],
      },
      letterSpacing: {
        tightest: '-0.05em',
        display:  '-0.035em',
        tight:    '-0.025em',
      },
      colors: {
        /* Primary brand — sky blue, like architectural glass */
        brand: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        primary: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        accent: {
          sky:    '#0ea5e9',
          teal:   '#14b8a6',
          amber:  '#f59e0b',
          rose:   '#f43f5e',
          violet: '#8b5cf6',
        },
        surface: {
          DEFAULT: '#ffffff',
          subtle:  '#f8fafc',
          muted:   '#f1f5f9',
        },
      },
      backgroundImage: {
        'mesh-light':
          'radial-gradient(at 20% 10%, rgba(14,165,233,0.06) 0px, transparent 60%), ' +
          'radial-gradient(at 80% 0%,  rgba(2,132,199,0.04)  0px, transparent 55%), ' +
          'radial-gradient(at 5%  80%, rgba(56,189,248,0.05) 0px, transparent 55%)',
        'mesh-dark':
          'radial-gradient(at 20% 10%, rgba(14,165,233,0.09) 0px, transparent 60%), ' +
          'radial-gradient(at 80% 0%,  rgba(2,132,199,0.07)  0px, transparent 55%), ' +
          'radial-gradient(at 5%  80%, rgba(3,105,161,0.08)  0px, transparent 55%)',
        shine:
          'linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.14) 50%, transparent 80%)',
        'prism-light':
          'linear-gradient(135deg, rgba(14,165,233,0.06) 0%, rgba(2,132,199,0.04) 40%, rgba(3,105,161,0.03) 100%)',
        'prism-dark':
          'linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(2,132,199,0.08) 40%, rgba(3,105,161,0.06) 100%)',
      },
      animation: {
        'fade-in':  'fadeIn 0.45s cubic-bezier(0.22,1,0.36,1) forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards',
        'scale-in': 'scaleIn 0.38s cubic-bezier(0.22,1,0.36,1) forwards',
        shimmer:    'shimmer 2.2s ease-in-out infinite',
        float:      'float 10s ease-in-out infinite',
        'surface-drift': 'surfaceDrift 14s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-14px)' },
        },
        surfaceDrift: {
          '0%,100%': { opacity: '0.35', transform: 'translateX(0) translateY(0)' },
          '33%':     { opacity: '0.50', transform: 'translateX(10px) translateY(-6px)' },
          '66%':     { opacity: '0.40', transform: 'translateX(-7px) translateY(8px)' },
        },
      },
      boxShadow: {
        /* Crisp, purposeful shadows — no violet tints */
        xs:       '0 1px 2px 0 rgba(0,0,0,0.04)',
        sm:       '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.05)',
        card:     '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
        input:    '0 1px 2px rgba(0,0,0,0.04)',
        modal:    '0 0 0 1px rgba(0,0,0,0.04), 0 20px 50px -10px rgba(0,0,0,0.14)',
        dropdown: '0 4px 20px -4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
        /* Accent-colored shadows — sky blue */
        primary:  '0 4px 14px -4px rgba(2,132,199,0.30)',
        'primary-sm': '0 2px 8px -2px rgba(2,132,199,0.22)',
        /* Status shadows */
        success:  '0 4px 14px -4px rgba(22,163,74,0.28)',
        danger:   '0 4px 14px -4px rgba(220,38,38,0.28)',
        /* Hover state upgrade */
        'card-hover':     '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
        /* Elevated overlay panels */
        elevated:         '0 0 0 1px rgba(0,0,0,0.04), 0 16px 40px -10px rgba(0,0,0,0.14)',
        /* Legacy aliases */
        'glow':           '0 0 24px -6px rgba(2,132,199,0.30)',
        'glow-sm':        '0 0 16px -5px rgba(2,132,199,0.22)',
        'glow-xs':        '0 0 10px -4px rgba(2,132,199,0.18)',
        premium:          '0 2px 4px -1px rgba(2,132,199,0.08), 0 8px 24px -6px rgba(2,132,199,0.14)',
        /* Inset highlight */
        'inset-top':      'inset 0 1px 0 rgba(255,255,255,0.10)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
};
