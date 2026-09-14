require('@testing-library/jest-native/extend-expect');

// expo-secure-store has no web/jest implementation by default; provide an in-memory mock so
// stores/services that import it can be unit tested without touching a real keychain.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn((key) => Promise.resolve(store.get(key) ?? null)),
    setItemAsync: jest.fn((key, value) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key) => {
      store.delete(key);
      return Promise.resolve();
    }),
  };
});
