export const DB_FILTER_STORAGE_KEY = 'workspace-db-filter';

export function loadDbFilter(connectionId: number | undefined): string[] | null {
  if (!connectionId) return null;
  try {
    const stored = localStorage.getItem(DB_FILTER_STORAGE_KEY);
    if (stored) {
      const map = JSON.parse(stored);
      return map[connectionId] ?? null;
    }
  } catch {}
  return null;
}

export function saveDbFilter(connectionId: number | undefined, selected: string[] | null) {
  if (!connectionId) return;
  try {
    const stored = localStorage.getItem(DB_FILTER_STORAGE_KEY);
    const map = stored ? JSON.parse(stored) : {};
    if (selected === null) {
      delete map[connectionId];
    } else {
      map[connectionId] = selected;
    }
    localStorage.setItem(DB_FILTER_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}
