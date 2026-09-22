import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Dynamically-composed status/stat classes (e.g. `bg-${color}-100`) aren't
  // visible to Tailwind's scanner, so they must be safelisted to be generated.
  safelist: [
    'bg-teal-100', 'text-teal-600',
    'bg-amber-100', 'text-amber-600',
    'bg-blue-100', 'text-blue-600',
    'bg-purple-100', 'text-purple-600',
    'bg-green-100', 'text-green-600',
    'bg-red-100', 'text-red-600',
  ],
  theme: {
    extend: {
      // Modern brand palette: the existing `teal`/`cyan` utility classes are
      // remapped to indigo/violet for a cohesive, contemporary look without
      // rewriting every component. Full default scales keep shades balanced.
      colors: {
        teal: colors.indigo,
        cyan: colors.violet,
      },
    },
  },
  plugins: [],
};
