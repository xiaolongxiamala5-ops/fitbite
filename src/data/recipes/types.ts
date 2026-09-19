export interface IngredientAmount {
  id: string;
  name: string;
  amount: number;
  unit: string;
}

export interface RecipeNutrition {
  calories?: number;
  protein: number;
  fat: number;
  carbs: number;
  status?: RecipeNutritionStatus;
  source?: string;
  isEstimated?: boolean;
}

export type RecipeNutritionStatus = 'unverified' | 'verified';

export type RecipeDifficulty = 'easy' | 'medium' | 'hard';

export interface RecipeSubstitution {
  originalIngredient: string;
  substituteIngredient: string;
  description: string;
}

export interface RecipeTip {
  text: string;
}

export interface DetailedRecipe {
  id: string;
  name: string;
  description: string;
  servings: number;
  cookingTime: number | null;
  difficulty: RecipeDifficulty | null;
  requiredIngredients: IngredientAmount[];
  pantryIngredients: string[];
  instructions: string[];
  nutrition: RecipeNutrition & { calories: number; status: RecipeNutritionStatus };
  substitutions: RecipeSubstitution[];
  tips: RecipeTip[];
  source: string;
}