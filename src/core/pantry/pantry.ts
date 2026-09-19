export interface PantryItem {
  id: string;
  name: string;
  category: 'condiment' | 'oil' | 'spice';
}

export const PANTRY_ITEMS: PantryItem[] = [
  { id: 'pantry_oil', name: '食用油', category: 'oil' },
  { id: 'pantry_salt', name: '食盐', category: 'spice' },
  { id: 'pantry_soy_sauce', name: '生抽', category: 'condiment' },
  { id: 'pantry_garlic', name: '大蒜', category: 'spice' },
  { id: 'pantry_black_pepper', name: '黑胡椒', category: 'spice' },
  { id: 'pantry_oyster_sauce', name: '蚝油', category: 'condiment' },
  { id: 'pantry_dark_soy_sauce', name: '老抽', category: 'condiment' },
  { id: 'pantry_rice_vinegar', name: '米醋', category: 'condiment' },
  { id: 'pantry_black_vinegar', name: '陈醋', category: 'condiment' },
  { id: 'pantry_sugar', name: '白糖', category: 'spice' },
  { id: 'pantry_starch', name: '淀粉', category: 'spice' },
  { id: 'pantry_cooking_wine', name: '料酒', category: 'condiment' },
  { id: 'pantry_sesame_oil', name: '香油', category: 'oil' },
  { id: 'pantry_chili_powder', name: '辣椒粉', category: 'spice' },
  { id: 'pantry_chili_oil', name: '辣椒油', category: 'oil' },
  { id: 'pantry_sichuan_pepper', name: '花椒', category: 'spice' },
  { id: 'pantry_cumin', name: '孜然', category: 'spice' }
];

export const DEFAULT_PANTRY_IDS = [
  'pantry_oil',
  'pantry_salt',
  'pantry_soy_sauce',
  'pantry_garlic',
  'pantry_black_pepper'
];

const PANTRY_SELECTION_KEY = 'fitbite_pantry_selection_v1';
const PANTRY_CATALOG_KEY = 'fitbite_pantry_catalog_v1';

function readStoredIds(key: string, fallback: string[]): string[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = JSON.parse(window.localStorage.getItem(key) || 'null');
    return Array.isArray(stored) && stored.every(id => typeof id === 'string') ? stored : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredIds(key: string, ids: string[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(ids));
}

export function getStoredPantrySelection(): string[] {
  return readStoredIds(PANTRY_SELECTION_KEY, DEFAULT_PANTRY_IDS);
}

export function savePantrySelection(ids: string[]): void {
  writeStoredIds(PANTRY_SELECTION_KEY, ids);
}

export function getStoredPantryCatalog(): string[] {
  return readStoredIds(PANTRY_CATALOG_KEY, DEFAULT_PANTRY_IDS);
}

export function savePantryCatalog(ids: string[]): void {
  writeStoredIds(PANTRY_CATALOG_KEY, ids);
}

export function getPantryName(id: string): string {
  return PANTRY_ITEMS.find(item => item.id === id)?.name || id;
}

export function isPantrySatisfied(requiredPantry: string[], userPantry: string[]): boolean {
  if (!requiredPantry || requiredPantry.length === 0) return true;
  const userSet = new Set(userPantry);
  return requiredPantry.every(id => userSet.has(id));
}

export function getMissingPantry(requiredPantry: string[], userPantry: string[]): string[] {
  const userSet = new Set(userPantry);
  return requiredPantry.filter(id => !userSet.has(id));
}