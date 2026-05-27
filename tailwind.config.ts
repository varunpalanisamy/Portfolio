import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#050508',
        cyan: { DEFAULT: '#00F5FF', dim: '#00C4CC' },
        purple: { DEFAULT: '#8B5CF6', dim: '#6D28D9' },
        pink: { DEFAULT: '#FF006E', dim: '#CC0058' },
      },
      fontFamily: {
        orbitron: ['var(--font-orbitron)'],
        grotesk: ['var(--font-grotesk)'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 20s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
