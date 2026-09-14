/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      safelist: [
        'bg-teal-100', 'text-teal-600',
        'bg-amber-100', 'text-amber-600',
        'bg-blue-100', 'text-blue-600',
        'bg-purple-100', 'text-purple-600',
        'bg-green-100', 'text-green-600',
        'bg-red-100', 'text-red-600',
      ],
    },
  },
  plugins: [],
};
