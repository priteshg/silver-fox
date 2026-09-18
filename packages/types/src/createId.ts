/**
 * Generates a locally-unique id (timestamp + random suffix). Not a UUID and
 * not safe for distributed/multi-device sync — sufficient for an
 * offline-only local data store where ids only need to be unique on-device.
 */
export function createId(prefix?: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return prefix ? `${prefix}_${time}${random}` : `${time}${random}`;
}
