import { IngredientAmount } from '../../data/recipes';
import { isPantrySatisfied, getMissingPantry } from '../pantry/pantry';
import { MatchOptions, MatchResult, MatchGroups } from './types';

export function matchRecipes(options: MatchOptions): MatchGroups {
  const { fridgeIngredients, pantryIngredients, recipes, favorites = [] } = options;
  const userFridgeSet = new Set(fridgeIngredients);
  const favoriteSet = new Set(favorites);

  const results: MatchResult[] = recipes.map(recipe => {
    let matchedCount = 0;
    const missingIngredients: IngredientAmount[] = [];

    recipe.requiredIngredients.forEach(item => {
      if (userFridgeSet.has(item.id)) {
        matchedCount++;
      } else {
        missingIngredients.push(item);
      }
    });

    const totalCount = recipe.requiredIngredients.length;
    const matchScore = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;
    const pantryOk = isPantrySatisfied(recipe.pantryIngredients, pantryIngredients);
    const missingPantry = getMissingPantry(recipe.pantryIngredients, pantryIngredients);

    const canMake = missingIngredients.length === 0 && pantryOk;
    const isFavorited = favoriteSet.has(recipe.id);

    return {
      recipe,
      matchScore,
      matchedCount,
      totalCount,
      missingIngredients,
      missingPantry,
      canMake,
      isFavorited
    };
  });

  const favoritedCanMake: MatchResult[] = [];
  const canMakeNow: MatchResult[] = [];
  const missingOneOrTwo: MatchResult[] = [];
  const other: MatchResult[] = [];

  for (const item of results) {
    if (item.isFavorited && item.canMake) {
      favoritedCanMake.push(item);
    } else if (!item.isFavorited && item.canMake) {
      canMakeNow.push(item);
    } else if (item.missingIngredients.length === 1 || item.missingIngredients.length === 2) {
      missingOneOrTwo.push(item);
    } else {
      other.push(item);
    }
  }

  return {
    favoritedCanMake,
    canMakeNow,
    missingOneOrTwo,
    other
  };
}