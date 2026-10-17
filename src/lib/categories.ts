type CategoryScope = { name: string; unit: string; kind: string };

/** Match the whole category key: identical names in other scopes are unrelated. */
export function renamedCategoryEntries<T extends { category: string; unit: string; kind: string }>(
  entries: T[], previous: CategoryScope, next: CategoryScope,
): T[] {
  if (previous.name === next.name) return entries;
  return entries.map(entry => entry.category === previous.name &&
    entry.unit === previous.unit && entry.kind === previous.kind
      ? { ...entry, category: next.name } : entry);
}

/** Never silently reclassify an existing entry, including legacy category names. */
export function categorySelection(current: string, available: { name: string }[], preserve: boolean): string {
  if (current && (preserve || available.some(category => category.name === current))) return current;
  return available[0]?.name ?? "";
}
