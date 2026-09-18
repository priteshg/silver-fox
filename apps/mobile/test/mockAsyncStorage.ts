/**
 * A minimal in-memory stand-in for @react-native-async-storage/async-storage,
 * used in tests instead of the real native module (which cannot run under
 * plain Node/jsdom). Installed globally in vitest.setup.ts.
 */
const store = new Map<string, string>();

export const mockAsyncStorage = {
  getItem: async (key: string): Promise<string | null> =>
    store.has(key) ? (store.get(key) as string) : null,
  setItem: async (key: string, value: string): Promise<void> => {
    store.set(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    store.delete(key);
  },
  clear: async (): Promise<void> => {
    store.clear();
  },
};

export function resetMockAsyncStorage(): void {
  store.clear();
}
