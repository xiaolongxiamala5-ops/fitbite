import { useMemo } from 'react';
import { useFridge } from '../context/FridgeContext';
import { CURATED_RECIPES } from '../data/recipes';
import { matchRecipes } from '../core/matcher/matcher';
import { MatchGroups } from '../core/matcher/types';

export function useRecipeMatcher(): MatchGroups {
  const { fridgeIngredients, pantryIngredients, favorites } = useFridge();

  const matchResults = useMemo(() => {
    return matchRecipes({
      fridgeIngredients: fridgeIngredients.map(item => item.id),
      pantryIngredients,
      recipes: CURATED_RECIPES,
      favorites
    });
  }, [fridgeIngredients, pantryIngredients, favorites]);

  return matchResults;
}