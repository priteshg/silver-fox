/**
 * Moves an item from one position to another within an ordered list and
 * renumbers every item's `order` field to match its new index.
 */
export function reorderByIndex<T extends { order: number }>(
  items: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  if (fromIndex < 0 || fromIndex >= sorted.length || toIndex < 0 || toIndex >= sorted.length) {
    return sorted;
  }
  const [moved] = sorted.splice(fromIndex, 1);
  sorted.splice(toIndex, 0, moved as T);
  return sorted.map((item, index) => ({ ...item, order: index }));
}
