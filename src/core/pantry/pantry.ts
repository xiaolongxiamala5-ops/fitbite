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
  { id: 'pantry_black_pepper', name: '黑胡椒', category: 'spice' }
];

export function isPantrySatisfied(requiredPantry: Array<string | { id: string }>, userPantry: string[]): boolean {
  if (!requiredPantry || requiredPantry.length === 0) return true;
  const userSet = new Set(userPantry);
  return requiredPantry.every(item => userSet.has(typeof item === 'string' ? item : item.id));
}

export function getMissingPantry(requiredPantry: Array<string | { id: string }>, userPantry: string[]): string[] {
  const userSet = new Set(userPantry);
  return requiredPantry
    .map(item => (typeof item === 'string' ? item : item.id))
    .filter(id => !userSet.has(id));
}