/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      colors: {
        nex: {
          bg: '#040818',
          deep: '#070d29',
          panel: '#0b1233',
          line: 'rgba(125, 160, 255, 0.16)',
          blue: '#38bdf8',
          violet: '#a78bfa',
          pink: '#f472b6',
          text: '#e6ecff',
          mute: '#8b97c4',
        },
      },
      boxShadow: {
        neon: '0 0 24px rgba(56, 189, 248, 0.35)',
        violet: '0 0 24px rgba(167, 139, 250, 0.35)',
      },
    },
  },
  plugins: [],
}
