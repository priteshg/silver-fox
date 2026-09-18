import AsyncStorage from "@react-native-async-storage/async-storage";

/** Reads and JSON-parses a stored value. Returns null if absent or unparseable. */
export async function readJson(key: string): Promise<unknown | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
