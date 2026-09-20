import { describe, it, expect } from 'vitest';
import {
  evaluateRecipeNutrition,
  classifyIngredient,
  isOilIngredient,
  isMacroCriticalIngredient,
  isMinorSeasoning,
  isSodiumSensitiveSeasoning,
  NutritionFood
} from '../shared/nutrition';
import { runImportedRecipesEvaluation } from '../scripts/nutrition/evaluateImportedRecipes';

// Exact pinned Sanotsu fixtures (commit d15675c27582748307023b7ee7aca2a63fc52756)
const realSanotsuChickenBreast: NutritionFood = {
  id: 'sanotsu:091112',
  foodCode: '091112',
  name: '鸡胸脯肉',
  englishName: null,
  category: '禽肉类及其制品-鸡',
  edibleFraction: 1.0,
  per100g: {
    calories: 118,
    protein: 24.6,
    fat: 1.9,
    carbs: 0.6,
    fiber: 0.0,
    sodium: 44.8
  },
  provenance: {
    source: 'china_food_composition_v6',
    commit: 'd15675c27582748307023b7ee7aca2a63fc52756',
    sourceFile: 'food_composition_full.csv',
    rawEdible: '100',
    hasTraceValues: false
  }
};

const realSanotsuBroccoli: NutritionFood = {
  id: 'sanotsu:045217',
  foodCode: '045217',
  name: '西兰花［绿菜花］',
  englishName: 'Broccoli, raw',
  category: '蔬菜类及其制品-嫩茎叶花菜类',
  edibleFraction: 0.83,
  per100g: {
    calories: 27,
    protein: 3.5,
    fat: 0.6,
    carbs: 3.7,
    fiber: null,
    sodium: 46.7
  },
  provenance: {
    source: 'china_food_composition_v6',
    commit: 'd15675c27582748307023b7ee7aca2a63fc52756',
    sourceFile: 'food_composition_full.csv',
    rawEdible: '83',
    hasTraceValues: false
  }
};

const realSanotsuOil: NutritionFood = {
  id: 'sanotsu:192007',
  foodCode: '192007',
  name: '花生油',
  englishName: 'Peanut oil',
  category: '植物油-植物油',
  edibleFraction: 1.0,
  per100g: {
    calories: 899,
    protein: 0.0,
    fat: 99.9,
    carbs: 0.0,
    fiber: null,
    sodium: 3.5
  },
  provenance: {
    source: 'china_food_composition_v6',
    commit: 'd15675c27582748307023b7ee7aca2a63fc52756',
    sourceFile: 'food_composition_full.csv',
    rawEdible: '100',
    hasTraceValues: false
  }
};

const realSanotsuCucumber: NutritionFood = {
  id: 'sanotsu:043208',
  foodCode: '043208',
  name: '黄瓜（鲜）［胡瓜］',
  englishName: 'Cucumber',
  category: '蔬菜类及其制品-瓜茄类',
  edibleFraction: 0.92,
  per100g: {
    calories: 16,
    protein: 0.8,
    fat: 0.2,
    carbs: 2.9,
    fiber: 0.5,
    sodium: 4.9
  },
  provenance: {
    source: 'china_food_composition_v6',
    commit: 'd15675c27582748307023b7ee7aca2a63fc52756',
    sourceFile: 'food_composition_full.csv',
    rawEdible: '92',
    hasTraceValues: false
  }
};

describe('Recipe Nutrition Evaluation & Materiality Policy Test Suite (C.2.3)', () => {

  // =========================================================================
  // 1. Materiality Classification Rules
  // =========================================================================
  describe('1. Materiality Classification (materialityPolicy.ts)', () => {
    it('1.1 油类必须判定为 oil_never_negligible，属于 macro-critical 且绝对不可忽略', () => {
      const oils = ['食用油', '植物油', 'pantry_oil', '芝麻油', 'preset_sesame_oil', '辣椒油', '猪油', '橄榄油'];
      for (const oil of oils) {
        const cls = classifyIngredient(oil);
        expect(cls.isOil).toBe(true);
        expect(cls.isMacroCritical).toBe(true);
        expect(cls.category).toBe('oil_never_negligible');
        expect(isOilIngredient(oil)).toBe(true);
      }
    });

    it('1.2 糖与淀粉判定为 calorie_macro_critical，未定量时必须阻断', () => {
      const sugars = ['白糖', '糖', 'preset_sugar', '冰糖', '蜂蜜'];
      for (const s of sugars) {
        const cls = classifyIngredient(s);
        expect(cls.category).toBe('calorie_macro_critical');
        expect(cls.isMacroCritical).toBe(true);
        expect(cls.isOil).toBe(false);
      }

      const starches = ['淀粉', 'preset_starch', '玉米淀粉', '生粉'];
      for (const st of starches) {
        const cls = classifyIngredient(st);
        expect(cls.category).toBe('calorie_macro_critical');
        expect(cls.isMacroCritical).toBe(true);
      }
    });

    it('1.3 常规微量香辛料/佐料判定为 minor_seasoning', () => {
      const spices = ['盐', '黑胡椒', '葱', '姜', '蒜', '八角', '花椒', '料酒', '醋'];
      for (const sp of spices) {
        expect(isMinorSeasoning(sp)).toBe(true);
        expect(isMacroCriticalIngredient(sp)).toBe(false);
      }
    });

    it('1.4 钠敏感调料正确标记 isSodiumSensitive', () => {
      expect(isSodiumSensitiveSeasoning('盐')).toBe(true);
      expect(isSodiumSensitiveSeasoning('pantry_salt')).toBe(true);
      expect(isSodiumSensitiveSeasoning('鸡精')).toBe(true);
      expect(isSodiumSensitiveSeasoning('生抽')).toBe(true);
      expect(isSodiumSensitiveSeasoning('pantry_soy_sauce')).toBe(true);
      expect(isSodiumSensitiveSeasoning('蚝油')).toBe(true);

      // 非钠敏感香辛料
      expect(isSodiumSensitiveSeasoning('黑胡椒')).toBe(false);
      expect(isSodiumSensitiveSeasoning('八角')).toBe(false);
      expect(isSodiumSensitiveSeasoning('大蒜')).toBe(false);
      expect(isSodiumSensitiveSeasoning('生姜')).toBe(false);
    });
  });

  // =========================================================================
  // 2. Core Evaluation Test Cases (Required A - F)
  // =========================================================================
  describe('2. Required Evaluation Cases (A - F)', () => {
    it('Case A: 200g 鸡胸 + 100g 西兰花 + 盐少许 → kcal/macros 可计算', () => {
      const result = evaluateRecipeNutrition({
        name: '鸡胸西兰花配微量盐',
        requiredIngredients: [
          { name: '鸡胸肉', amount: 200, unit: 'g', food: realSanotsuChickenBreast, weightBasis: 'edible_net' },
          { name: '西兰花', amount: 100, unit: 'g', food: realSanotsuBroccoli, weightBasis: 'edible_net' }
        ],
        pantryIngredients: ['盐']
      });

      // kcal/macros 可计算
      expect(result.canEstimateMacros).toBe(true);
      expect(result.isMacroComplete).toBe(true);
      expect(result.total).not.toBeNull();

      // 鸡胸 200g: 236 kcal, 49.2g P, 3.8g F, 1.2g C
      // 西兰花 100g: 27 kcal, 3.5g P, 0.6g F, 3.7g C
      // Total: 263 kcal, 52.7g P, 4.4g F, 4.9g C
      expect(result.total?.caloriesKcal).toBe(263);
      expect(result.total?.proteinGrams).toBe(52.7);
      expect(result.total?.fatGrams).toBe(4.4);
      expect(result.total?.carbGrams).toBe(4.9);

      // 盐未定量，属于钠敏感调料，禁止伪造 sodium 精确值
      expect(result.isSodiumComplete).toBe(false);
      expect(result.total?.sodiumMg).toBeNull();
      expect(result.nutritionStatus).toBe('nutrition_verified');

      // 记录忽略事实与原因
      expect(result.ignoredMinorSeasonings.length).toBe(1);
      expect(result.ignoredMinorSeasonings[0].ingredientName).toBe('盐');
      expect(result.ignoredMinorSeasonings[0].reason).toBe('minor_seasoning_unquantified');
    });

    it('Case B: 200g 鸡胸 + 100g 西兰花 + 黑胡椒少许 → kcal/macros 可计算', () => {
      const result = evaluateRecipeNutrition({
        name: '鸡胸西兰花配黑胡椒',
        requiredIngredients: [
          { name: '鸡胸肉', amount: 200, unit: 'g', food: realSanotsuChickenBreast, weightBasis: 'edible_net' },
          { name: '西兰花', amount: 100, unit: 'g', food: realSanotsuBroccoli, weightBasis: 'edible_net' }
        ],
        pantryIngredients: ['黑胡椒']
      });

      // kcal/macros 可计算
      expect(result.canEstimateMacros).toBe(true);
      expect(result.isMacroComplete).toBe(true);
      expect(result.total?.caloriesKcal).toBe(263);

      // 黑胡椒非钠敏感调味品，钠来源仅为主食材
      // 鸡胸 200g: 89.6mg, 西兰花 100g: 46.7mg -> 136.3mg
      expect(result.isSodiumComplete).toBe(true);
      expect(result.total?.sodiumMg).toBe(136.3);
      expect(result.nutritionStatus).toBe('nutrition_verified');

      expect(result.ignoredMinorSeasonings[0].ingredientName).toBe('黑胡椒');
    });

    it('Case C: 200g 鸡胸 + 100g 西兰花 + 鸡精少许 → kcal/macros 可计算，sodium incomplete/unknown', () => {
      const result = evaluateRecipeNutrition({
        name: '鸡胸西兰花配鸡精',
        requiredIngredients: [
          { name: '鸡胸肉', amount: 200, unit: 'g', food: realSanotsuChickenBreast, weightBasis: 'edible_net' },
          { name: '西兰花', amount: 100, unit: 'g', food: realSanotsuBroccoli, weightBasis: 'edible_net' }
        ],
        pantryIngredients: ['鸡精']
      });

      expect(result.canEstimateMacros).toBe(true);
      expect(result.isMacroComplete).toBe(true);
      expect(result.total?.caloriesKcal).toBe(263);
      expect(result.nutritionStatus).toBe('nutrition_verified');

      // 鸡精含大量钠，未定量时绝对禁止伪造钠含量
      expect(result.isSodiumComplete).toBe(false);
      expect(result.total?.sodiumMg).toBeNull();
      expect(result.unquantifiedSodiumSeasonings).toContain('鸡精');
    });

    it('Case D: 200g 鸡胸 + 100g 西兰花 + 食用油适量 → kcal/macros nutrition_incomplete', () => {
      const result = evaluateRecipeNutrition({
        name: '鸡胸炒西兰花（食用油适量）',
        requiredIngredients: [
          { name: '鸡胸肉', amount: 200, unit: 'g', food: realSanotsuChickenBreast, weightBasis: 'edible_net' },
          { name: '西兰花', amount: 100, unit: 'g', food: realSanotsuBroccoli, weightBasis: 'edible_net' }
        ],
        pantryIngredients: ['食用油']
      });

      // 油绝不可忽略！未定量时必须阻断整菜热量估算
      expect(result.canEstimateMacros).toBe(false);
      expect(result.isMacroComplete).toBe(false);
      expect(result.nutritionStatus).toBe('nutrition_incomplete');
      expect(result.total).toBeNull();
      expect(result.perServing).toBeNull();

      expect(result.blockingCriticalIngredients.length).toBe(1);
      expect(result.blockingCriticalIngredients[0].reason).toBe('unquantified_oil');
      expect(result.incompleteReasons.some(r => r.includes('食用油未定量'))).toBe(true);
    });

    it('Case E: 200g 鸡胸 + 生抽适量 → kcal/macros 可以输出主食材估算，sodium incomplete', () => {
      const result = evaluateRecipeNutrition({
        name: '白灼鸡胸蘸生抽',
        requiredIngredients: [
          { name: '鸡胸肉', amount: 200, unit: 'g', food: realSanotsuChickenBreast, weightBasis: 'edible_net' }
        ],
        pantryIngredients: ['生抽']
      });

      // 主食材可计算，生抽作为酱汁不阻断主宏量
      expect(result.canEstimateMacros).toBe(true);
      expect(result.isMacroComplete).toBe(true);
      expect(result.total?.caloriesKcal).toBe(236);
      expect(result.total?.proteinGrams).toBe(49.2);

      // 生抽未定量导致 sodium incomplete
      expect(result.isSodiumComplete).toBe(false);
      expect(result.total?.sodiumMg).toBeNull();
      expect(result.unquantifiedSodiumSeasonings).toContain('生抽');
      expect(result.nutritionStatus).toBe('nutrition_verified');
    });

    it('Case F: 显式 10g 食用油 → 必须计入总热量与脂肪', () => {
      const result = evaluateRecipeNutrition({
        name: '鸡胸肉煎制（精确 10g 油）',
        requiredIngredients: [
          { name: '鸡胸肉', amount: 200, unit: 'g', food: realSanotsuChickenBreast, weightBasis: 'edible_net' }
        ],
        pantryIngredients: [
          { name: '花生油', amount: 10, unit: 'g', food: realSanotsuOil, weightBasis: 'edible_net' }
        ]
      });

      expect(result.canEstimateMacros).toBe(true);
      expect(result.isMacroComplete).toBe(true);
      expect(result.total).not.toBeNull();

      // 鸡胸肉 200g: 236 kcal, 3.8g fat
      // 花生油 10g: 89.9 kcal, 9.99g fat
      // Total calories: 236 + 89.9 = 325.9 kcal
      // Total fat: 3.8 + 9.99 = 13.79g
      expect(result.total?.caloriesKcal).toBe(325.9);
      expect(result.total?.fatGrams).toBe(13.79);
      expect(result.total?.proteinGrams).toBe(49.2);

      // 显式定量的油被完全计入，且无阻断项
      expect(result.blockingCriticalIngredients.length).toBe(0);
    });
  });

  // =========================================================================
  // 3. Servings Handling in Evaluator
  // =========================================================================
  describe('3. Servings Handling in Recipe Evaluator', () => {
    it('3.1 servings > 0 时正确计算 perServing，servings === null 时 perServing 为 null', () => {
      const recipeWith2Servings = evaluateRecipeNutrition({
        name: '两份餐食',
        servings: 2,
        requiredIngredients: [
          { name: '鸡胸肉', amount: 200, unit: 'g', food: realSanotsuChickenBreast, weightBasis: 'edible_net' }
        ]
      });

      expect(recipeWith2Servings.total?.caloriesKcal).toBe(236);
      expect(recipeWith2Servings.servings).toBe(2);
      expect(recipeWith2Servings.perServing?.caloriesKcal).toBe(118);

      const recipeWithNullServings = evaluateRecipeNutrition({
        name: '无指定份数',
        servings: null,
        requiredIngredients: [
          { name: '鸡胸肉', amount: 200, unit: 'g', food: realSanotsuChickenBreast, weightBasis: 'edible_net' }
        ]
      });

      expect(recipeWithNullServings.servings).toBeNull();
      expect(recipeWithNullServings.perServing).toBeNull(); // 绝不默认算 1 或 2 份
    });
  });

  // =========================================================================
  // 4. Batch Evaluation of 15 Real Imported Recipes
  // =========================================================================
  describe('4. Batch Evaluation of 15 Real Imported Recipes', () => {
    it('4.1 15 道真实菜谱严格按 Materiality Policy 执行评估', () => {
      const results = runImportedRecipesEvaluation();
      expect(results.length).toBe(15);

      // 15 道导入菜谱因缺少 WeightBasis 来源证据、或未定量油糖/非质量单位，全部判定为 nutrition_incomplete
      const verifiedRecipes = results.filter(r => r.nutritionStatus === 'nutrition_verified');
      expect(verifiedRecipes.length).toBe(0);

      const incompleteRecipes = results.filter(r => r.nutritionStatus === 'nutrition_incomplete');
      expect(incompleteRecipes.length).toBe(15);

      // 凉拌黄瓜：因黄瓜缺少 WeightBasis 来源证据判定为 unknown，整道菜判定为 nutrition_incomplete
      const cucumber = results.find(r => r.recipeId === 'imported_howtocook_cold_cucumber');
      expect(cucumber).toBeDefined();
      expect(cucumber?.nutritionStatus).toBe('nutrition_incomplete');
      expect(cucumber?.canEstimateMacros).toBe(false);
      expect(cucumber?.total).toBeNull();
      expect(cucumber?.perServing).toBeNull();
      expect(cucumber?.blockingCriticalIngredients.some(b => b.reason === 'unknown_weight_basis')).toBe(true);

      // 检查白灼虾：仅因食用油未定量而阻断
      const boiledShrimp = results.find(r => r.recipeId === 'imported_howtocook_boiled_shrimp');
      expect(boiledShrimp?.nutritionStatus).toBe('nutrition_incomplete');
      expect(boiledShrimp?.blockingCriticalIngredients.some(b => b.reason === 'unquantified_oil')).toBe(true);

      // 检查西红柿炒鸡蛋：因非质量单位（个）及油、糖未定量而阻断
      const eggs = results.find(r => r.recipeId === 'imported_howtocook_tomato_scrambled_eggs');
      expect(eggs?.nutritionStatus).toBe('nutrition_incomplete');
      expect(eggs?.blockingCriticalIngredients.length).toBeGreaterThanOrEqual(3);
    });
  });

  // =========================================================================
  // 5. WeightBasis Source-Evidence Verification (Minimal Fix)
  // =========================================================================
  describe('5. WeightBasis Source-Evidence Verification', () => {
    it('5.1 当来源没有明确 WeightBasis 证据时，黄瓜 200g 必须判定为 WeightBasis: unknown，recipe 判定为 nutrition_incomplete，total 为 null，blocker 包含 unknown_weight_basis', () => {
      const evalResult = evaluateRecipeNutrition({
        name: '未注明重量语义的凉拌黄瓜',
        requiredIngredients: [
          { name: '黄瓜', amount: 200, unit: 'g', food: realSanotsuCucumber }
        ]
      });

      expect(evalResult.nutritionStatus).toBe('nutrition_incomplete');
      expect(evalResult.canEstimateMacros).toBe(false);
      expect(evalResult.total).toBeNull();
      expect(evalResult.perServing).toBeNull();

      const blocker = evalResult.blockingCriticalIngredients.find(b => b.reason === 'unknown_weight_basis');
      expect(blocker).toBeDefined();
      expect(blocker?.ingredientName).toBe('黄瓜');
      expect(blocker?.message).toContain('WeightBasis: unknown');

      const cucumberItem = evalResult.evaluatedIngredients.find(i => i.name === '黄瓜');
      expect(cucumberItem?.weightBasis).toBe('unknown');
    });

    it('5.2 当来源明确提供 weightBasis: "edible_net" 时，正确计算出 32 kcal (200 * 16 / 100)', () => {
      const evalResult = evaluateRecipeNutrition({
        name: '明确净重的凉拌黄瓜',
        requiredIngredients: [
          { name: '黄瓜', amount: 200, unit: 'g', food: realSanotsuCucumber, weightBasis: 'edible_net' }
        ]
      });

      expect(evalResult.nutritionStatus).toBe('nutrition_verified');
      expect(evalResult.canEstimateMacros).toBe(true);
      expect(evalResult.blockingCriticalIngredients.length).toBe(0);

      // 200g * 16 / 100 = 32.0 kcal
      expect(evalResult.total?.caloriesKcal).toBe(32);
      expect(evalResult.total?.proteinGrams).toBe(1.6);
      expect(evalResult.total?.fatGrams).toBe(0.4);
      expect(evalResult.total?.carbGrams).toBe(5.8);
      expect(evalResult.total?.fiberGrams).toBe(1.0);
      expect(evalResult.total?.sodiumMg).toBe(9.8);
    });

    it('5.3 当来源明确提供 weightBasis: "gross_as_purchased" 时，正确计算出 29.44 kcal (200 * 0.92 * 16 / 100)', () => {
      const evalResult = evaluateRecipeNutrition({
        name: '明确毛重的凉拌黄瓜',
        requiredIngredients: [
          { name: '黄瓜', amount: 200, unit: 'g', food: realSanotsuCucumber, weightBasis: 'gross_as_purchased' }
        ]
      });

      expect(evalResult.nutritionStatus).toBe('nutrition_verified');
      expect(evalResult.canEstimateMacros).toBe(true);
      expect(evalResult.blockingCriticalIngredients.length).toBe(0);

      // 200g * 0.92 * 16 / 100 = 29.44 kcal
      expect(evalResult.total?.caloriesKcal).toBe(29.44);
      expect(evalResult.total?.proteinGrams).toBe(1.472);
      expect(evalResult.total?.fatGrams).toBe(0.368);
      expect(evalResult.total?.carbGrams).toBe(5.336);
      expect(evalResult.total?.fiberGrams).toBe(0.92);
      expect(evalResult.total?.sodiumMg).toBe(9.016);
    });
  });

});
