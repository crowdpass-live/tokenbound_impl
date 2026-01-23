/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      backgroundImage: {
        'hero-image': "url('/assets/hero-image.jpg')",
      },
      colors: {
        "deep-blue": "#0D0042",
        "primary": "#11EBF2",
        "active-green": "#12B54E",
        "black": "#000000",
        "base-white": "#F5F5F5",
        "white": "#FFFFFF",
        "dark-bg": "#14141A",
        "accent-orange": "#FF6932",
        "light-green": "#B3DFC0",
        "gray-text": "#9CA3AF",
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
}

