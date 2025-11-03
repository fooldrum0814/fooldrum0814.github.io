/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts}",
    "./docs/**/*.html",
    "./docs/**/*.js",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#4F46E5",
        "background-light": "#F8FAFC",
        "background-dark": "#18181B",
        "text-light": "#18181B",
        "text-dark": "#E4E4E7",
        "card-light": "#FFFFFF",
        "card-dark": "#27272A",
        "subtle-light": "#64748B",
        "subtle-dark": "#A1A1AA",
        accent: "#8B5CF6",
      },
      fontFamily: {
        display: ["Poppins", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.75rem", // 12px
        lg: "1rem", // 16px
        xl: "1.5rem", // 24px
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

