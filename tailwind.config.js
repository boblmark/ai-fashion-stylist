/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
      },
      keyframes: {
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' }
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```
```
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'slide': 'slide 20s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 30s linear infinite',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'progress': 'progress 2s ease-out forwards'
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': {
            'background-position': '0% 50%'
          },
          '50%': {
            'background-position': '100% 50%'
          }
        },
        'gradient-xy': {
          '0%, 100%': {
            'background-position': '0% 0%'
          },
          '50%': {
            'background-position': '100% 100%'
          }
        },
        'slide': {
          'from': {
            transform: 'translateX(0)'
          },
          'to': {
            transform: 'translateX(100%)'
          }
        },
        'float': {
          '0%, 100%': {
            transform: 'translateY(0)'
          },
          '50%': {
            transform: 'translateY(-10px)'
          }
        },
        'fade-in': {
          'from': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'progress': {
          'from': {
            width: '0%'
          },
          'to': {
            width: '100%'
          }
        }
      },
      backgroundImage: {
        'gradient-conic': 'conic-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}
