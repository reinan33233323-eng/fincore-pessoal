type CategoryScope = { name: string; unit: string; kind: string };

const searchText = (text:string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
/** Search every typed word, ignoring accents, with the closest names first. */
export function matchingCategories<T extends {name:string}>(categories:T[],query:string):T[]{
 const text=searchText(query),words=text.split(/\s+/).filter(Boolean);
 const rank=(name:string)=>name===text?0:name.startsWith(text)?1:name.includes(text)?2:3;
 return categories.filter(c=>words.every(word=>searchText(c.name).includes(word)))
  .sort((a,b)=>rank(searchText(a.name))-rank(searchText(b.name))||a.name.localeCompare(b.name,'pt-BR'));
}

/** Match the whole category key: identical names in other scopes are unrelated. */
export function renamedCategoryEntries<T extends { category: string; unit: string; kind: string }>(
  entries: T[], previous: CategoryScope, next: CategoryScope,
): T[] {
  if (previous.name === next.name) return entries;
  return entries.map(entry => entry.category === previous.name &&
    entry.unit === previous.unit && entry.kind === previous.kind
      ? { ...entry, category: next.name } : entry);
}

/** Require an explicit category for new entries; preserve existing classifications. */
export function categorySelection(current: string, available: { name: string }[], preserve: boolean): string {
  if (current && (preserve || available.some(category => category.name === current))) return current;
  return "";
}
