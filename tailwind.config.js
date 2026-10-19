/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral ramp tinted with ~4% anchor hue (sky #0ea5e9) in LCH space.
        slate: {
          50: '#f4f7fa',
          100: '#edf1f5',
          200: '#e1e6eb',
          300: '#cfd5db',
          400: '#abb1b7',
          500: '#868c92',
          600: '#6d7378',
          700: '#555a60',
          800: '#40454a',
          850: '#373c41',
          900: '#2a2f34',
          950: '#181c1f',
        },
        // Triadic companion 1 (+120deg, hue 156) - momentum / progress.
        momentum: {
          300: '#87d0a5',
          400: '#51b37e',
          500: '#339765',
          600: '#2a8155',
        },
        // Triadic companion 2 (+240deg, hue 85) - attention / pending.
        attention: {
          300: '#dfbc77',
          400: '#cda64e',
          500: '#b08c35',
        },
      },
      boxShadow: {
        glow: '0 8px 30px -6px rgb(14 165 233 / 0.18)',
        'glow-strong': '0 8px 24px -4px rgb(79 70 229 / 0.35)',
      },
    },
  },
  plugins: [],
};
