import { CURATED_DETAILED_RECIPES } from './recipes/index';
import type { DetailedRecipe, IngredientAmount, RecipeNutrition } from './recipes/types';

export type { IngredientAmount, RecipeNutrition } from './recipes/types';

export interface Recipe {
  id: string;
  name: string;
  requiredIngredients: IngredientAmount[];
  pantryIngredients: string[];
  calories: number;
  nutrition: RecipeNutrition;
  servings: number;
  source: string;
  instructions: string[];
}

function toLegacyRecipe(recipe: DetailedRecipe): Recipe {
  const { calories, protein, fat, carbs, ...nutrition } = recipe.nutrition;

  return {
    id: recipe.id,
    name: recipe.name,
    requiredIngredients: recipe.requiredIngredients,
    pantryIngredients: recipe.pantryIngredients,
    calories,
    nutrition: { protein, fat, carbs, ...nutrition },
    servings: recipe.servings,
    source: recipe.source,
    instructions: recipe.instructions
  };
}

export const CURATED_RECIPES: Recipe[] = CURATED_DETAILED_RECIPES.map(toLegacyRecipe);