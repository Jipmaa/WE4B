/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      borderRadius: {
        'xs': '0.125rem',
      },
      keyframes: {
        'fade-in': {
          from: {
            opacity: '0',
            transform: 'translateY(-0.25rem)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out forwards',
      }
    }
  },
  plugins: [],
}
