module.exports = {
  preset: 'jest-expo',
  // Rely on jest-expo's own transformIgnorePatterns (tuned for the installed Expo/RN version) -
  // overriding it here previously broke parsing of @react-native/js-polyfills after an RN bump.
  setupFilesAfterEnv: ['./jest.setup.js'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
