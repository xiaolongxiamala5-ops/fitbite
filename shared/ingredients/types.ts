export type IngredientCategory = 'protein' | 'vegetable' | 'carb' | 'other';

export interface CanonicalDefinition {
  id: string; // e.g., 'p_chicken_breast', 'p_chicken_leg', 'p_shrimp_whole'
  slug: string; // e.g., 'chicken_breast', 'chicken_leg', 'shrimp_whole'
  name: string; // Primary Chinese display name
  category: IngredientCategory;
  aliases: string[];
}

export type CanonicalIngredient = CanonicalDefinition;

export interface CanonicalOption {
  canonicalId: string;
  name: string;
  category: IngredientCategory;
  amount?: number | null;
  unit?: string | null;
}
