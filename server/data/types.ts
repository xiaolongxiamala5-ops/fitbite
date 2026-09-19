import { FitBiteRecipe } from '../../scripts/pipeline/types';

/**
 * SQLite table row representations
 */
export interface RecipeRow {
  id: string;
  name: string;
  category: string;
  cooking_method: string | null;
  difficulty: string | null;
  raw_difficulty: string | null;
  servings: number | null;
  estimated_minutes: number | null;
  source: string;
  source_id: string;
  content_hash: string;
  tags_json: string;
  instructions_json: string;
  pantry_ingredients_json: string;
  required_ingredients_json: string;
  provenance_json: string;
  nutrition_json: string | null;
}

export interface RecipeIngredientRow {
  recipe_id: string;
  group_index: number;
  option_index: number;
  canonical_id: string;
  mode: 'single' | 'anyOf';
  is_primary: number; // 1: primary option; 0: alternative option
  original_text: string;
}

export interface ImportSummary {
  totalInJson: number;
  inserted: number;
  updated: number;
  skipped: number;
}

export interface LocalRecipeSourceOptions {
  dbPath?: string; // File path (e.g. 'data/fitbite_local.db') or ':memory:'
}

export interface IRecipeSource {
  readonly id: string;
  readonly name: string;
  init(): void;
  close(): void;
  count(): number;
  getAllRecipes(): FitBiteRecipe[];
  getRecipeById(id: string): FitBiteRecipe | null;
  findRecipesByCanonicalIds(canonicalIds: string[]): FitBiteRecipe[];
}
