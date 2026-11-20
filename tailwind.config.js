/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // shadcn tokens used by the supplied grid-feature-cards component
        foreground: 'rgb(var(--fg-rgb) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--muted-rgb) / <alpha-value>)',
        slateblue: '#4A6FA5',
        tealbrand: {
          DEFAULT: '#008080',
          dark: '#006666',
          bright: '#2AA5A5',
          tint: '#E6F2F2',
        },
        softgray: '#E0E0E0',
        basegray: '#D3D3D3',
        ink: '#1A2E2E',
        mutedgreen: '#5A6B6B',
        bone: '#F2EFE8',
        darkslate: {
          bg: '#22374E',
          card: '#2E4A66',
          muted: '#B8C4D0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(26, 46, 46, 0.25)',
        card: '0 2px 10px -2px rgba(26, 46, 46, 0.12)',
      },
    },
  },
  plugins: [],
};
