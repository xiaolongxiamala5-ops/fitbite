import { describe, it, expect, beforeEach } from 'vitest';
import { CANONICAL_INGREDIENTS, CANONICAL_MAP } from '../src/core/ingredients/canonical';
import { resolveAlias } from '../src/core/ingredients/aliasResolver';
import { getMissingPantry, getPantryName, getStoredPantryCatalog, getStoredPantrySelection, isPantrySatisfied, PANTRY_ITEMS, savePantryCatalog, savePantrySelection } from '../src/core/pantry/pantry';
import { matchRecipes } from '../src/core/matcher/matcher';
import { CURATED_RECIPES, Recipe } from '../src/data/recipes';
import { validateRecipe } from '../src/core/validator/recipeValidator';
import { addFavorite, removeFavorite, isFavorite, toggleFavorite } from '../src/core/favorites/favoritesRepository';

describe('FitBite Production Comprehensive Suite (26 Tests)', () => {

  describe('1. Canonical Ingredients System', () => {
    it('1.1 基础词典包含核心基准食材', () => {
      expect(CANONICAL_INGREDIENTS.length).toBeGreaterThanOrEqual(8);
      expect(CANONICAL_MAP.has('p_shrimp')).toBe(true);
      expect(CANONICAL_MAP.has('v_tomato')).toBe(true);
    });

    it('1.2 所有 Canonical ID 必须全局唯一', () => {
      const ids = CANONICAL_INGREDIENTS.map(i => i.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('1.3 食材必须归属于合法的标准分类', () => {
      const validCategories = ['protein', 'vegetable', 'carb', 'other'];
      CANONICAL_INGREDIENTS.forEach(item => {
        expect(validCategories).toContain(item.category);
      });
    });
  });

  describe('2. Alias Resolver System', () => {
    it('2.1 精确匹配标准食材名称', () => {
      const res = resolveAlias('大虾');
      expect(res).not.toBeNull();
      expect(res?.id).toBe('p_shrimp');
    });

    it('2.2 正确解析同义别名：西红柿 -> v_tomato', () => {
      const res = resolveAlias('西红柿');
      expect(res?.id).toBe('v_tomato');
    });

    it('2.3 正确解析海鲜类口语别名：草虾/基围虾/虾仁 -> p_shrimp', () => {
      expect(resolveAlias('基围虾')?.id).toBe('p_shrimp');
      expect(resolveAlias('草虾')?.id).toBe('p_shrimp');
      expect(resolveAlias('虾仁')?.id).toBe('p_shrimp');
    });

    it('2.4 未收录词汇安全返回 null，不引发崩溃', () => {
      expect(resolveAlias('火星进口无机石')).toBeNull();
      expect(resolveAlias('')).toBeNull();
    });

    it('2.5 输入含首尾空格时仍能正确处理', () => {
      expect(resolveAlias('  西红柿  ')?.id).toBe('v_tomato');
    });
  });

  describe('3. Pantry System & Rules', () => {
    it('3.1 当所需调料全部具备时判定为已满足', () => {
      const req = ['pantry_oil', 'pantry_salt'];
      const user = ['pantry_oil', 'pantry_salt', 'pantry_garlic'];
      expect(isPantrySatisfied(req, user)).toBe(true);
    });

    it('3.2 缺失任意一项调料必须严密阻断', () => {
      const req = ['pantry_oil', 'pantry_garlic'];
      const user = ['pantry_oil'];
      expect(isPantrySatisfied(req, user)).toBe(false);
    });

    it('3.3 菜谱不需要调料时无条件满足', () => {
      expect(isPantrySatisfied([], ['pantry_oil'])).toBe(true);
    });

    it('3.4 精确计算具体缺失的调料列表', () => {
      const req = ['pantry_oil', 'pantry_garlic', 'pantry_black_pepper'];
      const user = ['pantry_oil'];
      const missing = getMissingPantry(req, user);
      expect(missing).toEqual(['pantry_garlic', 'pantry_black_pepper']);
    });
  });

  describe('4. Recipe Matcher Engine', () => {
    it('4.1 黄金固定场景回归：大虾 + 嫩豆腐 + 番茄 + 齐备调料 -> 必须 100% canMake', () => {
      const groups = matchRecipes({
        fridgeIngredients: ['p_shrimp', 'p_tofu_soft', 'v_tomato'],
        pantryIngredients: ['pantry_garlic', 'pantry_soy_sauce', 'pantry_black_pepper', 'pantry_oil'],
        recipes: CURATED_RECIPES
      });

      const ready = groups.canMakeNow.find(r => r.recipe.id === 'curated_tomato_shrimp_tofu');
      expect(ready).toBeDefined();
      expect(ready?.canMake).toBe(true);
      expect(ready?.missingIngredients.length).toBe(0);
      expect(ready?.matchScore).toBe(100);
    });

    it('4.2 完全匹配时 Match Score 必须为 100%', () => {
      const groups = matchRecipes({
        fridgeIngredients: ['p_egg', 'v_tomato'],
        pantryIngredients: ['pantry_salt', 'pantry_oil'],
        recipes: CURATED_RECIPES
      });
      const eggRecipe = groups.canMakeNow.find(r => r.recipe.id === 'curated_tomato_scrambled_eggs');
      expect(eggRecipe?.matchScore).toBe(100);
    });

    it('4.3 仅缺失 1 样主食材时必须分入 missingOneOrTwo', () => {
      const groups = matchRecipes({
        fridgeIngredients: ['p_shrimp', 'v_tomato'],
        pantryIngredients: ['pantry_garlic', 'pantry_soy_sauce', 'pantry_black_pepper', 'pantry_oil'],
        recipes: CURATED_RECIPES
      });
      const matched = groups.missingOneOrTwo.find(r => r.recipe.id === 'curated_tomato_shrimp_tofu');
      expect(matched).toBeDefined();
      expect(matched?.missingIngredients.length).toBe(1);
      expect(matched?.missingIngredients[0].id).toBe('p_tofu_soft');
    });

    it('4.4 缺失 2 样主食材时必须分入 missingOneOrTwo', () => {
      const groups = matchRecipes({
        fridgeIngredients: ['p_shrimp'],
        pantryIngredients: ['pantry_garlic', 'pantry_soy_sauce', 'pantry_black_pepper', 'pantry_oil'],
        recipes: CURATED_RECIPES
      });
      const matched = groups.missingOneOrTwo.find(r => r.recipe.id === 'curated_tomato_shrimp_tofu');
      expect(matched).toBeDefined();
      expect(matched?.missingIngredients.length).toBe(2);
    });

    it('4.5 缺失 3 样及以上食材时归入 other', () => {
      const groups = matchRecipes({
        fridgeIngredients: [],
        pantryIngredients: [],
        recipes: CURATED_RECIPES
      });
      const matched = groups.other.find(r => r.recipe.id === 'curated_tomato_shrimp_tofu');
      expect(matched).toBeDefined();
      expect(matched?.missingIngredients.length).toBe(3);
    });

    it('4.6 主食材全齐但缺失关键调料时，严禁判定为 canMake', () => {
      const groups = matchRecipes({
        fridgeIngredients: ['p_shrimp', 'p_tofu_soft', 'v_tomato'],
        pantryIngredients: ['pantry_oil'],
        recipes: CURATED_RECIPES
      });
      const target = [...groups.canMakeNow, ...groups.other].find(r => r.recipe.id === 'curated_tomato_shrimp_tofu');
      expect(target?.canMake).toBe(false);
      expect(target?.missingPantry.length).toBeGreaterThan(0);
    });

    it('4.7 收藏过的可制作菜谱必须优先进入 favoritedCanMake 分区', () => {
      const groups = matchRecipes({
        fridgeIngredients: ['p_egg', 'v_tomato'],
        pantryIngredients: ['pantry_salt', 'pantry_oil'],
        recipes: CURATED_RECIPES,
        favorites: ['curated_tomato_scrambled_eggs']
      });
      expect(groups.favoritedCanMake.some(r => r.recipe.id === 'curated_tomato_scrambled_eggs')).toBe(true);
      expect(groups.canMakeNow.some(r => r.recipe.id === 'curated_tomato_scrambled_eggs')).toBe(false);
    });

    it('4.8 未收藏的可制作菜谱归入 canMakeNow', () => {
      const groups = matchRecipes({
        fridgeIngredients: ['p_egg', 'v_tomato'],
        pantryIngredients: ['pantry_salt', 'pantry_oil'],
        recipes: CURATED_RECIPES,
        favorites: []
      });
      expect(groups.canMakeNow.some(r => r.recipe.id === 'curated_tomato_scrambled_eggs')).toBe(true);
    });
  });

  describe('5. Recipe Validator', () => {
    it('5.1 当前 4 道 Curated 菜谱必须 100% 通过合规性校验', () => {
      CURATED_RECIPES.forEach(recipe => {
        const check = validateRecipe(recipe);
        expect(check.isValid).toBe(true);
        expect(check.errors).toEqual([]);
      });
    });

    it('5.2 若食材使用了未在 Canonical 注册的非法 ID，必须校验失败', () => {
      const invalidRecipe: Recipe = {
        id: 'bad_recipe',
        name: '未知料理',
        requiredIngredients: [{ id: 'unknown_alien_meat', name: '未知肉', amount: 100, unit: 'g' }],
        pantryIngredients: [],
        calories: 200,
        nutrition: { protein: 20, fat: 5, carbs: 5 },
        servings: 1,
        source: 'test',
        instructions: ['步骤1']
      };
      const check = validateRecipe(invalidRecipe);
      expect(check.isValid).toBe(false);
      expect(check.errors.some(e => e.includes('非法的规范 ID'))).toBe(true);
    });

    it('5.3 热量为负数时必须报错拦截', () => {
      const badRecipe = { ...CURATED_RECIPES[0], calories: -50 };
      const check = validateRecipe(badRecipe);
      expect(check.isValid).toBe(false);
      expect(check.errors.some(e => e.includes('卡路里'))).toBe(true);
    });

    it('5.4 步骤说明为空数组时必须报错拦截', () => {
      const badRecipe = { ...CURATED_RECIPES[0], instructions: [] };
      const check = validateRecipe(badRecipe);
      expect(check.isValid).toBe(false);
      expect(check.errors.some(e => e.includes('步骤说明'))).toBe(true);
    });
  });

  describe('6. Favorites Repository', () => {
    beforeEach(() => {
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
    });

    it('6.1 支持正确添加、查询与移除收藏', () => {
      const id = 'curated_tomato_shrimp_tofu';
      expect(isFavorite(id)).toBe(false);
      addFavorite(id);
      expect(isFavorite(id)).toBe(true);
      removeFavorite(id);
      expect(isFavorite(id)).toBe(false);
    });

    it('6.2 toggleFavorite 能幂等地在收藏与未收藏间切换', () => {
      const id = 'curated_broccoli_chicken';
      const added = toggleFavorite(id);
      expect(added).toBe(true);
      expect(isFavorite(id)).toBe(true);
      const removed = toggleFavorite(id);
      expect(removed).toBe(false);
      expect(isFavorite(id)).toBe(false);
    });
  });
});

describe('Pantry Catalog and Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('规范调料目录 ID 唯一且可解析展示名称', () => {
    const ids = PANTRY_ITEMS.map(item => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getPantryName('pantry_oyster_sauce')).toBe('蚝油');
  });

  it('目录列表与用户已拥有列表分别持久化', () => {
    savePantryCatalog(['pantry_oil', 'pantry_oyster_sauce']);
    savePantrySelection(['pantry_oil']);

    expect(getStoredPantryCatalog()).toEqual(['pantry_oil', 'pantry_oyster_sauce']);
    expect(getStoredPantrySelection()).toEqual(['pantry_oil']);
  });

  it('刷新后仍能读取用户调料选择', () => {
    savePantrySelection(['pantry_oyster_sauce']);
    expect(getStoredPantrySelection()).toEqual(['pantry_oyster_sauce']);
  });
});