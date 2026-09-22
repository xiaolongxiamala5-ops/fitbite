import { Recipe, IngredientAmount } from '../../data/recipes';
import { isPantrySatisfied, getMissingPantry } from '../pantry/pantry';
import { isIngredientFulfilled, isSubsumedBy, findDisambiguation } from '../ingredients/taxonomy';
import { getCalorieTier } from '../../../shared/nutrition';
import { MatchOptions, MatchResult, MatchGroups } from './types';

export function matchRecipes(options: MatchOptions): MatchGroups {
  const { fridgeIngredients, pantryIngredients, recipes, favorites = [] } = options;
  const userFridgeSet = new Set(fridgeIngredients);
  const favoriteSet = new Set(favorites);

  const results: MatchResult[] = recipes.map(recipe => {
    let matchedCount = 0;
    const missingIngredients: IngredientAmount[] = [];

    recipe.requiredIngredients.forEach(item => {
      // 支持直接命中与上位词覆盖（Subsumption）
      if (isIngredientFulfilled(item.id, userFridgeSet)) {
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

    // 模块二：高热量健康分流状态评定
    const calorieTier = getCalorieTier(recipe.nutrition, recipe.calories, {
      name: recipe.name,
      cookingMethod: recipe.cookingMethod,
      tags: recipe.tags
    });
    let healthAdjustedScore = matchScore;
    if (calorieTier === 'lean_choice') {
      healthAdjustedScore += 15;
    } else if (calorieTier === 'cheat_or_share') {
      healthAdjustedScore = Math.max(0, Math.round(matchScore * 0.7)); // 30% 降权
    }

    return {
      recipe,
      matchScore,
      matchedCount,
      totalCount,
      missingIngredients,
      missingPantry,
      canMake,
      isFavorited,
      calorieTier,
      healthAdjustedScore
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

  // 推荐位健康分流排序：同等条件下，lean_choice 靠前，cheat_or_share 靠后
  const sortByHealth = (a: MatchResult, b: MatchResult) => {
    const aScore = a.healthAdjustedScore ?? a.matchScore;
    const bScore = b.healthAdjustedScore ?? b.matchScore;
    return bScore - aScore;
  };

  favoritedCanMake.sort(sortByHealth);
  canMakeNow.sort(sortByHealth);
  missingOneOrTwo.sort(sortByHealth);

  return {
    favoritedCanMake,
    canMakeNow,
    missingOneOrTwo,
    other
  };
}

/**
 * 搜索框分词与包含检索（Search Filter）
 * 搜索“鱼”不仅匹配菜谱标题含“鱼”，同时反查菜谱食材列表；只要原料属于“鱼”的子类，均需正常召回。
 */
export function searchRecipesByKeyword<T extends { recipe: Recipe } | Recipe>(
  query: string,
  items: T[]
): T[] {
  if (!query || !query.trim()) return items;
  const trimmed = query.trim().toLowerCase();

  // 检查查询词是否对应上位词
  const hypernym = findDisambiguation(trimmed);
  const subsumedIds = hypernym ? new Set(hypernym.children) : new Set<string>();

  return items.filter(item => {
    const recipe = 'recipe' in item ? (item as any).recipe as Recipe : item as Recipe;

    // 1. 标题匹配
    if (recipe.name.toLowerCase().includes(trimmed)) {
      return true;
    }

    // 2. 标签 / 烹饪方式匹配
    if (recipe.tags?.some(t => t.toLowerCase().includes(trimmed))) {
      return true;
    }
    if (recipe.cookingMethod?.toLowerCase().includes(trimmed)) {
      return true;
    }

    // 3. 原料直接名匹配或上位词包含反查
    for (const ing of recipe.requiredIngredients) {
      if (ing.name.toLowerCase().includes(trimmed)) {
        return true;
      }
      // 上位词反查：若查询“鱼”，原料是“鲈鱼”(p_fish_seabass)，命中召回！
      if (subsumedIds.has(ing.id)) {
        return true;
      }
      // 反向层级匹配
      if (hypernym && isSubsumedBy(ing.id, hypernym.id)) {
        return true;
      }
    }

    return false;
  });
}