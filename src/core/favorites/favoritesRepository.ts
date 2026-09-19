const STORAGE_KEY = 'fitbite_favorites_v1';

export function getFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addFavorite(id: string): string[] {
  const current = getFavorites();
  if (!current.includes(id)) {
    const updated = [...current, id];
    saveFavorites(updated);
    return updated;
  }
  return current;
}

export function removeFavorite(id: string): string[] {
  const current = getFavorites();
  const updated = current.filter(item => item !== id);
  saveFavorites(updated);
  return updated;
}

export function toggleFavorite(id: string): boolean {
  const current = getFavorites();
  if (current.includes(id)) {
    removeFavorite(id);
    return false;
  } else {
    addFavorite(id);
    return true;
  }
}

export function isFavorite(id: string): boolean {
  return getFavorites().includes(id);
}

function saveFavorites(list: string[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}