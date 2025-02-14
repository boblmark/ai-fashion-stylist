/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'progress': 'progress 2s ease-out forwards',
      },
      keyframes: {
        'fade-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'float': {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-10px)',
          },
        },
        'progress': {
          '0%': {
            width: '0%',
          },
          '100%': {
            width: '100%',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};