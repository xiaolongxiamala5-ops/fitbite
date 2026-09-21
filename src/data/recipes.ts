import { CURATED_DETAILED_RECIPES } from './recipes/index';
import type { DetailedRecipe, IngredientAmount, RecipeNutrition } from './recipes/types';

export type { IngredientAmount, RecipeNutrition } from './recipes/types';

export interface Recipe {
  id: string;
  name: string;
  requiredIngredients: IngredientAmount[];
  pantryIngredients: string[];
  calories: number;
  nutrition: RecipeNutrition | null;
  servings: number;
  source: string;
  instructions: string[];
  tags?: string[];
  cookingMethod?: string;
}

function toLegacyRecipe(recipe: DetailedRecipe): Recipe {
  const { calories, protein, fat, carbs, ...nutrition } = recipe.nutrition;

  return {
    id: recipe.id,
    name: recipe.name,
    requiredIngredients: recipe.requiredIngredients,
    pantryIngredients: recipe.pantryIngredients,
    calories,
    nutrition: {
      calories,
      protein,
      fat,
      carbs,
      confidence: recipe.nutrition.confidence || 'verified',
      ...nutrition
    },
    servings: recipe.servings,
    source: recipe.source,
    instructions: recipe.instructions
  };
}

export const CURATED_RECIPES: Recipe[] = CURATED_DETAILED_RECIPES.map(toLegacyRecipe);

import importedRecipesJson from '../../data/recipes_imported.json';

export const IMPORTED_RECIPES: Recipe[] = (importedRecipesJson as any[]).map(raw => ({
  id: raw.id,
  name: raw.name,
  requiredIngredients: (raw.requiredIngredients || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    amount: typeof item.amount === 'number' ? item.amount : 0,
    unit: item.unit || ''
  })),
  pantryIngredients: raw.pantryIngredients || [],
  calories: raw.nutrition?.calories || 0,
  nutrition: raw.nutrition || null,
  servings: raw.servings || 1,
  source: raw.provenance?.source === 'howtocook' ? 'HowToCook 开源菜谱' : (raw.provenance?.source || '开源菜谱'),
  instructions: raw.instructions || []
}));

export const ALL_APP_RECIPES: Recipe[] = [...CURATED_RECIPES, ...IMPORTED_RECIPES];