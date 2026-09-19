export type IngredientCategory = 'protein' | 'vegetable' | 'carb' | 'other';

export interface CanonicalIngredient {
  id: string;
  name: string;
  category: IngredientCategory;
}

export const CANONICAL_INGREDIENTS: CanonicalIngredient[] = [
  { id: 'p_shrimp', name: '大虾', category: 'protein' },
  { id: 'p_tofu_soft', name: '嫩豆腐', category: 'protein' },
  { id: 'p_chicken_breast', name: '鸡胸肉', category: 'protein' },
  { id: 'p_egg', name: '鸡蛋', category: 'protein' },
  { id: 'p_beef', name: '牛肉', category: 'protein' },
  { id: 'v_tomato', name: '番茄', category: 'vegetable' },
  { id: 'v_broccoli', name: '西兰花', category: 'vegetable' },
  { id: 'v_onion', name: '洋葱', category: 'vegetable' },
  { id: 'c_rice', name: '米饭', category: 'carb' },
  { id: 'c_potato', name: '土豆', category: 'carb' }
];

export const CANONICAL_MAP = new Map<string, CanonicalIngredient>(
  CANONICAL_INGREDIENTS.map(item => [item.id, item])
);