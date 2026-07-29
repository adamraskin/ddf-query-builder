import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#EDEAE1',
          dim: '#E2DED2',
        },
        ink: {
          950: '#101E33',
          800: '#1C3352',
          600: '#2E4A6E',
          400: '#5C7593',
        },
        brass: {
          500: '#AD8A54',
          600: '#8F6F3E',
        },
        sage: {
          500: '#5E7F63',
        },
        rust: {
          500: '#AE4F39',
        },
      },
      fontFamily: {
        display: ['Iowan Old Style', 'Palatino Linotype', 'Georgia', 'ui-serif', 'serif'],
        body: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(16,30,51,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(16,30,51,0.05) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '28px 28px',
      },
    },
  },
  plugins: [],
};

export default config;
