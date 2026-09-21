import { Recipe, IngredientAmount } from '../../data/recipes';
import { CalorieTier } from '../../../shared/nutrition';

export interface MatchResult {
  recipe: Recipe;
  matchScore: number;
  matchedCount: number;
  totalCount: number;
  missingIngredients: IngredientAmount[];
  missingPantry: string[];
  canMake: boolean;
  isFavorited: boolean;
  calorieTier?: CalorieTier;
  healthAdjustedScore?: number;
}

export interface MatchGroups {
  favoritedCanMake: MatchResult[];
  canMakeNow: MatchResult[];
  missingOneOrTwo: MatchResult[];
  other: MatchResult[];
}

export interface MatchOptions {
  fridgeIngredients: string[];
  pantryIngredients: string[];
  recipes: Recipe[];
  favorites?: string[];
}