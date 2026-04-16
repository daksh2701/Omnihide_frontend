/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        // Humne yahan custom loading bar animation define kiya hai
        'load-progress': 'load 2.5s ease-in-out forwards',
      },
      keyframes: {
        load: {
          '0%': { width: '0%', opacity: '0.3' },
          '100%': { width: '100%', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}