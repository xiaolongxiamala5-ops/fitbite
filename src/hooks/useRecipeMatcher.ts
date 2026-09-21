import { useMemo } from 'react';
import { useFridge } from '../context/FridgeContext';
import { ALL_APP_RECIPES } from '../data/recipes';
import { matchRecipes } from '../core/matcher/matcher';
import { MatchGroups } from '../core/matcher/types';

export function useRecipeMatcher(): MatchGroups {
  const { fridgeIngredients, pantryIngredients, favorites } = useFridge();

  const matchResults = useMemo(() => {
    return matchRecipes({
      fridgeIngredients: fridgeIngredients.map(item => item.id),
      pantryIngredients,
      recipes: ALL_APP_RECIPES,
      favorites
    });
  }, [fridgeIngredients, pantryIngredients, favorites]);

  return matchResults;
}