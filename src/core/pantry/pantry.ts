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

export function isPantrySatisfied(requiredPantry: string[], userPantry: string[]): boolean {
  if (!requiredPantry || requiredPantry.length === 0) return true;
  const userSet = new Set(userPantry);
  return requiredPantry.every(id => userSet.has(id));
}

export function getMissingPantry(requiredPantry: string[], userPantry: string[]): string[] {
  const userSet = new Set(userPantry);
  return requiredPantry.filter(id => !userSet.has(id));
}