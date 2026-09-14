// Color values are duplicated here (rather than imported from src/theme/colors.ts) because this
// file is loaded directly by Node/PostCSS outside Metro's TypeScript transform. Keep the two in
// sync - src/theme/colors.ts is the canonical source for app code (icons, ActivityIndicator, etc).
const lightColors = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F1F4',
  border: '#E4E4E9',
  textPrimary: '#15161A',
  textSecondary: '#5B5D68',
  textMuted: '#8B8D98',
  primary: '#6C5CE7',
  primaryMuted: '#EFEBFD',
  accent: '#00B894',
  danger: '#E4574C',
  warning: '#E1A62F',
  success: '#1FAB6E',
};

const darkColors = {
  background: '#0E0F13',
  surface: '#17181D',
  surfaceAlt: '#1F2027',
  border: '#2A2C35',
  textPrimary: '#F5F5F7',
  textSecondary: '#B4B6C2',
  textMuted: '#787A87',
  primary: '#8B7CF6',
  primaryMuted: '#26213F',
  accent: '#2DD4A7',
  danger: '#FF6B61',
  warning: '#F0BB4F',
  success: '#3ECF8E',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        light: lightColors,
        dark: darkColors,
      },
    },
  },
  plugins: [],
};
