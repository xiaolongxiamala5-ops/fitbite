import { describe, it, expect } from 'vitest';
import {
  NutritionFood,
  NutrientValues,
  convertToGrams,
  isConvertibleUnit,
  SUPPORTED_MASS_UNITS,
  calculateIngredientNutrition,
  sumNutrition,
  divideNutrition,
  calculateRecipeNutrition,
  roundNutrients
} from '../shared/nutrition';

// =========================================================================
// Category A: Source-backed Real Fixtures
// Sourced 100% verbatim from pinned Sanotsu dataset (commit d15675c27582748307023b7ee7aca2a63fc52756).
// Zero hand-written approximations. Runs offline without requiring generated files.
// =========================================================================

/** 091112 鸡胸脯肉 (pinned Sanotsu exact values) */
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
    carbs: 0.6, // Exact pinned Sanotsu CHO = 0.6g
    fiber: 0.0,
    sodium: 44.8 // Exact pinned Sanotsu Na = 44.8mg
  },
  provenance: {
    source: 'china_food_composition_v6',
    commit: 'd15675c27582748307023b7ee7aca2a63fc52756',
    sourceFile: 'food_composition_full.csv',
    rawEdible: '100',
    hasTraceValues: false
  }
};

/** 091113 鸡腿 (pinned Sanotsu exact values) */
const realSanotsuChickenLeg: NutritionFood = {
  id: 'sanotsu:091113',
  foodCode: '091113',
  name: '鸡腿',
  englishName: null,
  category: '禽肉类及其制品-鸡',
  edibleFraction: 0.74, // Exact pinned Sanotsu edible = 74%
  per100g: {
    calories: 146, // Exact pinned Sanotsu energyKCal = 146 kcal
    protein: 20.2, // Exact pinned Sanotsu protein = 20.2g
    fat: 7.2,     // Exact pinned Sanotsu fat = 7.2g
    carbs: 0.0,   // Exact pinned Sanotsu CHO = 0.0g
    fiber: 0.0,
    sodium: 73.6  // Exact pinned Sanotsu Na = 73.6mg
  },
  provenance: {
    source: 'china_food_composition_v6',
    commit: 'd15675c27582748307023b7ee7aca2a63fc52756',
    sourceFile: 'food_composition_full.csv',
    rawEdible: '74',
    hasTraceValues: false
  }
};

/** 045217 西兰花［绿菜花］ (pinned Sanotsu exact values) */
const realSanotsuBroccoli: NutritionFood = {
  id: 'sanotsu:045217',
  foodCode: '045217', // Exact foodCode in mapping & Sanotsu
  name: '西兰花［绿菜花］',
  englishName: 'Broccoli, raw',
  category: '蔬菜类及其制品-嫩茎叶花菜类',
  edibleFraction: 0.83,
  per100g: {
    calories: 27,  // Exact pinned Sanotsu energyKCal = 27 kcal
    protein: 3.5,  // Exact pinned Sanotsu protein = 3.5g
    fat: 0.6,      // Exact pinned Sanotsu fat = 0.6g
    carbs: 3.7,    // Exact pinned Sanotsu CHO = 3.7g
    fiber: null,   // Exact pinned Sanotsu dietaryFiber = '—' (null / missing)
    sodium: 46.7   // Exact pinned Sanotsu Na = 46.7mg
  },
  provenance: {
    source: 'china_food_composition_v6',
    commit: 'd15675c27582748307023b7ee7aca2a63fc52756',
    sourceFile: 'food_composition_full.csv',
    rawEdible: '83',
    hasTraceValues: false
  }
};

// =========================================================================
// Category B: Synthetic Fixtures (TEST-ONLY)
// Purely constructed in code to test edge cases (null propagation, etc.).
// NOT sourced from Sanotsu, NOT bound to any real foodCode or ingredient name.
// =========================================================================

/**
 * TEST-ONLY SYNTHETIC FIXTURE
 * Used exclusively to test missing/null nutrient propagation in arithmetic.
 */
const syntheticFoodWithNulls: NutritionFood = {
  id: 'synthetic:null_test_food',
  foodCode: 'SYNTHETIC_NULLS',
  name: 'Synthetic Null Test Food',
  englishName: 'Synthetic Null Test Food',
  category: 'Synthetic Fixtures',
  edibleFraction: 1.0,
  per100g: {
    calories: 100,
    protein: 10.0,
    fat: 2.0,
    carbs: 5.0,
    fiber: null, // deliberately null to test missing nutrient handling
    sodium: null // deliberately null to test missing nutrient handling
  },
  provenance: {
    source: 'china_food_composition_v6',
    commit: 'synthetic_test_commit',
    sourceFile: 'synthetic_fixture.csv',
    rawEdible: '100',
    hasTraceValues: false
  }
};

describe('Nutrition Engine Test Suite (C.2.2)', () => {

  // =========================================================================
  // 1. Unit Conversion Tests
  // =========================================================================
  describe('1. Deterministic Unit Conversion (unitConversion.ts)', () => {
    it('1.1 基础质量单位确定性转换：g -> g', () => {
      const res = convertToGrams(100, 'g');
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.grams).toBe(100);
      }

      const resKe = convertToGrams(250, '克');
      expect(resKe.success).toBe(true);
      if (resKe.success) {
        expect(resKe.grams).toBe(250);
      }
    });

    it('1.2 质量单位确定性换算：kg -> 1000g', () => {
      const res = convertToGrams(1, 'kg');
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.grams).toBe(1000);
      }

      const resQianke = convertToGrams(2.5, '千克');
      expect(resQianke.success).toBe(true);
      if (resQianke.success) {
        expect(resQianke.grams).toBe(2500);
      }

      const resGongjin = convertToGrams(0.5, '公斤');
      expect(resGongjin.success).toBe(true);
      if (resGongjin.success) {
        expect(resGongjin.grams).toBe(500);
      }
    });

    it('1.3 传统市制单位换算：斤 -> 500g, 两 -> 50g', () => {
      const resJin = convertToGrams(1, '斤');
      expect(resJin.success).toBe(true);
      if (resJin.success) {
        expect(resJin.grams).toBe(500);
      }

      const resHalfJin = convertToGrams(0.5, '斤');
      expect(resHalfJin.success).toBe(true);
      if (resHalfJin.success) {
        expect(resHalfJin.grams).toBe(250);
      }

      const resLiang = convertToGrams(1, '两');
      expect(resLiang.success).toBe(true);
      if (resLiang.success) {
        expect(resLiang.grams).toBe(50);
      }

      const resTwoLiang = convertToGrams(2, '两');
      expect(resTwoLiang.success).toBe(true);
      if (resTwoLiang.success) {
        expect(resTwoLiang.grams).toBe(100);
      }
    });

    it('1.4 单位容错：大小写与首尾空格不敏感', () => {
      const resKg = convertToGrams(1.5, '  KG  ');
      expect(resKg.success).toBe(true);
      if (resKg.success) {
        expect(resKg.grams).toBe(1500);
      }

      const resG = convertToGrams(80, ' G ');
      expect(resG.success).toBe(true);
      if (resG.success) {
        expect(resG.grams).toBe(80);
      }
    });

    it('1.5 严格拒绝不支持与非确定性单位（体积、模糊数量、件数）', () => {
      const unsupportedUnits = [
        'ml', '毫升', 'l', '升',
        '勺', '汤匙', '茶匙',
        '个', '只', '条', '支', '根', '瓣', '片', '块',
        '适量', '少许', '半勺',
        '', 'unknown'
      ];

      for (const unit of unsupportedUnits) {
        const res = convertToGrams(10, unit);
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.reason).toBeDefined();
        }
        expect(isConvertibleUnit(unit)).toBe(false);
      }
    });

    it('1.6 严格拒绝无效数值（<= 0, NaN, Infinity）', () => {
      expect(convertToGrams(0, 'g').success).toBe(false);
      expect(convertToGrams(-50, 'g').success).toBe(false);
      expect(convertToGrams(NaN, 'g').success).toBe(false);
      expect(convertToGrams(Infinity, 'g').success).toBe(false);
    });

    it('1.7 暴露 SUPPORTED_MASS_UNITS 常量列表', () => {
      expect(SUPPORTED_MASS_UNITS.length).toBeGreaterThan(0);
      expect(SUPPORTED_MASS_UNITS).toContain('g');
      expect(SUPPORTED_MASS_UNITS).toContain('kg');
      expect(SUPPORTED_MASS_UNITS).toContain('斤');
      expect(SUPPORTED_MASS_UNITS).toContain('两');
    });
  });

  // =========================================================================
  // 2. Single Ingredient Nutrition Calculation
  // =========================================================================
  describe('2. Single Ingredient Nutrition Calculation (calculateIngredientNutrition)', () => {
    it('2.1 100g 鸡胸肉按 118 kcal/100g -> 118 kcal (真实 091112 数据)', () => {
      const result = calculateIngredientNutrition({
        food: realSanotsuChickenBreast,
        amount: 100,
        unit: 'g',
        weightBasis: 'edible_net',
        canonicalId: 'p_chicken_breast'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.actualGrams).toBe(100);
        expect(result.actualEdibleGrams).toBe(100);
        expect(result.nutrients.caloriesKcal).toBe(118);
        expect(result.nutrients.proteinGrams).toBe(24.6);
        expect(result.nutrients.fatGrams).toBe(1.9);
        expect(result.nutrients.carbGrams).toBe(0.6); // 真实 0.6g
        expect(result.nutrients.fiberGrams).toBe(0);
        expect(result.nutrients.sodiumMg).toBe(44.8); // 真实 44.8mg
      }
    });

    it('2.2 200g 鸡胸肉 -> 236 kcal (支持位置参数签名)', () => {
      const result = calculateIngredientNutrition(
        realSanotsuChickenBreast,
        200,
        'g',
        'edible_net',
        'p_chicken_breast'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.actualGrams).toBe(200);
        expect(result.actualEdibleGrams).toBe(200);
        expect(result.nutrients.caloriesKcal).toBe(236);
        expect(result.nutrients.proteinGrams).toBe(49.2);
        expect(result.nutrients.fatGrams).toBe(3.8);
        expect(result.nutrients.carbGrams).toBe(1.2); // 200/100 * 0.6 = 1.2
        expect(result.nutrients.sodiumMg).toBe(89.6); // 200/100 * 44.8 = 89.6
      }
    });

    it('2.3 edible_net 语义：不应用 edibleFraction (真实 091113 鸡腿数据 146 kcal/100g)', () => {
      // 鸡腿 edibleFraction = 0.74, 146 kcal/100g
      // 当标注为 edible_net 时（净肉），不扣除骨重
      const result = calculateIngredientNutrition({
        food: realSanotsuChickenLeg,
        amount: 100,
        unit: 'g',
        weightBasis: 'edible_net',
        canonicalId: 'p_chicken_leg'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.actualGrams).toBe(100);
        expect(result.actualEdibleGrams).toBe(100); // 未应用 0.74
        expect(result.nutrients.caloriesKcal).toBe(146);
        expect(result.nutrients.proteinGrams).toBe(20.2);
        expect(result.nutrients.fatGrams).toBe(7.2);
        expect(result.nutrients.carbGrams).toBe(0.0);
        expect(result.nutrients.sodiumMg).toBe(73.6);
      }
    });

    it('2.4 gross_as_purchased 语义：正确应用 edibleFraction (真实 091113 鸡腿数据)', () => {
      // 鸡腿 gross_as_purchased 100g -> 可食部 74g (100 * 0.74)
      // 74g * (146 kcal / 100) = 108.04 kcal
      const result = calculateIngredientNutrition({
        food: realSanotsuChickenLeg,
        amount: 100,
        unit: 'g',
        weightBasis: 'gross_as_purchased',
        canonicalId: 'p_chicken_leg'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.actualGrams).toBe(100);
        expect(result.actualEdibleGrams).toBe(74); // 100 * 0.74
        expect(result.nutrients.caloriesKcal).toBe(108.04);
        expect(result.nutrients.proteinGrams).toBe(14.948); // 74 * 20.2 / 100
        expect(result.nutrients.fatGrams).toBe(5.328);     // 74 * 7.2 / 100
        expect(result.nutrients.carbGrams).toBe(0.0);
        expect(result.nutrients.sodiumMg).toBe(54.464);    // 74 * 73.6 / 100
      }
    });

    it('2.5 市制单位换算与计算联动：0.5斤鸡胸肉 -> 295 kcal, 2两鸡胸肉 -> 118 kcal', () => {
      // 0.5 斤 = 250g -> 2.5 * 118 = 295 kcal
      const resJin = calculateIngredientNutrition({
        food: realSanotsuChickenBreast,
        amount: 0.5,
        unit: '斤',
        weightBasis: 'edible_net'
      });
      expect(resJin.success).toBe(true);
      if (resJin.success) {
        expect(resJin.actualGrams).toBe(250);
        expect(resJin.actualEdibleGrams).toBe(250);
        expect(resJin.nutrients.caloriesKcal).toBe(295);
        expect(resJin.nutrients.carbGrams).toBe(1.5); // 2.5 * 0.6 = 1.5
      }

      // 2 两 = 100g -> 118 kcal
      const resLiang = calculateIngredientNutrition({
        food: realSanotsuChickenBreast,
        amount: 2,
        unit: '两',
        weightBasis: 'edible_net'
      });
      expect(resLiang.success).toBe(true);
      if (resLiang.success) {
        expect(resLiang.actualGrams).toBe(100);
        expect(resLiang.nutrients.caloriesKcal).toBe(118);
        expect(resLiang.nutrients.carbGrams).toBe(0.6);
      }
    });

    it('2.6 unknown WeightBasis 必须拒绝计算并返回明确错误', () => {
      const result = calculateIngredientNutrition({
        food: realSanotsuChickenLeg,
        amount: 200,
        unit: 'g',
        weightBasis: 'unknown',
        canonicalId: 'p_chicken_leg'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('UNKNOWN_WEIGHT_BASIS');
        expect(result.reason).toContain('unknown');
      }
    });

    it('2.7 不支持单位拒绝计算', () => {
      const result = calculateIngredientNutrition({
        food: realSanotsuChickenBreast,
        amount: 2,
        unit: '勺',
        weightBasis: 'edible_net'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('UNCONVERTIBLE_UNIT');
      }
    });

    it('2.8 缺失 NutritionFood 数据拒绝计算', () => {
      const result = calculateIngredientNutrition({
        food: null as any,
        amount: 100,
        unit: 'g',
        weightBasis: 'edible_net'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('MISSING_NUTRITION_FOOD');
      }
    });

    it('2.9 null nutrient 不得被当成 0 (单食材，使用明确标记的 synthetic fixture)', () => {
      const result = calculateIngredientNutrition({
        food: syntheticFoodWithNulls,
        amount: 100,
        unit: 'g',
        weightBasis: 'edible_net'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.nutrients.caloriesKcal).toBe(100);
        expect(result.nutrients.proteinGrams).toBe(10.0);
        expect(result.nutrients.fatGrams).toBe(2.0);
        expect(result.nutrients.carbGrams).toBe(5.0);
        // 关键断言：fiber 与 sodium 必须是 null，绝对不得被默认赋值为 0
        expect(result.nutrients.fiberGrams).toBeNull();
        expect(result.nutrients.sodiumMg).toBeNull();
      }
    });
  });

  // =========================================================================
  // 3. Nutrition Aggregation & Math
  // =========================================================================
  describe('3. Nutrition Aggregation (sumNutrition & divideNutrition)', () => {
    it('3.1 多食材 total aggregation 正确相加', () => {
      const n1: NutrientValues = {
        caloriesKcal: 118,
        proteinGrams: 24.6,
        fatGrams: 1.9,
        carbGrams: 0.6,
        fiberGrams: 0,
        sodiumMg: 44.8
      };

      const n2: NutrientValues = {
        caloriesKcal: 54,
        proteinGrams: 7.0,
        fatGrams: 1.2,
        carbGrams: 7.4,
        fiberGrams: 2.0,
        sodiumMg: 93.4
      };

      const total = sumNutrition([n1, n2]);
      expect(total.caloriesKcal).toBe(172);
      expect(total.proteinGrams).toBe(31.6);
      expect(total.fatGrams).toBe(3.1);
      expect(total.carbGrams).toBe(8.0);
      expect(total.fiberGrams).toBe(2.0);
      expect(total.sodiumMg).toBe(138.2);
    });

    it('3.2 null nutrient 不被当 0 (相加传播规则)：任一食材为 null 则总和为 null', () => {
      const nWithKnownFiber: NutrientValues = {
        caloriesKcal: 100,
        proteinGrams: 10,
        fatGrams: 2,
        carbGrams: 10,
        fiberGrams: 3.5,
        sodiumMg: 100
      };

      const nWithNullFiber: NutrientValues = {
        caloriesKcal: 150,
        proteinGrams: 20,
        fatGrams: 5,
        carbGrams: 5,
        fiberGrams: null, // missing fiber
        sodiumMg: 50
      };

      const total = sumNutrition([nWithKnownFiber, nWithNullFiber]);
      expect(total.caloriesKcal).toBe(250);
      expect(total.proteinGrams).toBe(30);
      // fiber 绝不能算成 3.5 (假定第二个食材为0)，必须为 null
      expect(total.fiberGrams).toBeNull();
      // sodium 两者均已知，正常相加
      expect(total.sodiumMg).toBe(150);
    });

    it('3.3 servings 正确除法：perServing = total / servings', () => {
      const total: NutrientValues = {
        caloriesKcal: 500,
        proteinGrams: 40,
        fatGrams: 10,
        carbGrams: 60,
        fiberGrams: 6,
        sodiumMg: 200
      };

      const perServing = divideNutrition(total, 2);
      expect(perServing.caloriesKcal).toBe(250);
      expect(perServing.proteinGrams).toBe(20);
      expect(perServing.fatGrams).toBe(5);
      expect(perServing.carbGrams).toBe(30);
      expect(perServing.fiberGrams).toBe(3);
      expect(perServing.sodiumMg).toBe(100);
    });

    it('3.4 divideNutrition: null nutrient 除法后保持 null', () => {
      const totalWithNulls: NutrientValues = {
        caloriesKcal: 300,
        proteinGrams: 25,
        fatGrams: 8,
        carbGrams: 30,
        fiberGrams: null,
        sodiumMg: null
      };

      const perServing = divideNutrition(totalWithNulls, 2);
      expect(perServing.caloriesKcal).toBe(150);
      expect(perServing.fiberGrams).toBeNull();
      expect(perServing.sodiumMg).toBeNull();
    });

    it('3.5 divideNutrition: 无效 divisor 抛出异常', () => {
      const total: NutrientValues = {
        caloriesKcal: 100,
        proteinGrams: 10,
        fatGrams: 2,
        carbGrams: 5,
        fiberGrams: 1,
        sodiumMg: 50
      };

      expect(() => divideNutrition(total, 0)).toThrow();
      expect(() => divideNutrition(total, -1)).toThrow();
    });
  });

  // =========================================================================
  // 4. Recipe Nutrition & Incomplete Guardrails
  // =========================================================================
  describe('4. Recipe Total Calculation (calculateRecipeNutrition)', () => {
    it('4.1 完整菜谱所有食材计算成功，返回 complete 与确切总量 (真实食材组合)', () => {
      // 鸡胸肉 150g (118 kcal/100g): 1.5 * 118 = 177 kcal, 36.9g pro, 2.85g fat, 0.9g carb, 67.2mg Na
      // 西兰花 200g (27 kcal/100g): 2 * 27 = 54 kcal, 7.0g pro, 1.2g fat, 7.4g carb, 93.4mg Na, fiber: null
      const recipe = calculateRecipeNutrition(
        [
          {
            food: realSanotsuChickenBreast,
            amount: 150,
            unit: 'g',
            weightBasis: 'edible_net',
            canonicalId: 'p_chicken_breast',
            ingredientName: '鸡胸肉'
          },
          {
            food: realSanotsuBroccoli,
            amount: 200,
            unit: 'g',
            weightBasis: 'edible_net',
            canonicalId: 'v_broccoli',
            ingredientName: '西兰花'
          }
        ],
        2 // 2 servings
      );

      expect(recipe.isComplete).toBe(true);
      expect(recipe.status).toBe('complete');
      if (recipe.isComplete) {
        expect(recipe.total).not.toBeNull();
        expect(recipe.servings).toBe(2);
        expect(recipe.perServing).not.toBeNull();

        // Total: 177 + 54 = 231 kcal
        expect(recipe.total.caloriesKcal).toBe(231);
        expect(recipe.total.proteinGrams).toBe(43.9);
        expect(recipe.total.fatGrams).toBe(4.05);
        expect(recipe.total.carbGrams).toBe(8.3);
        // 西兰花在 Sanotsu 中未测定 fiber (null)，整道菜 fiber 严格保持 null，绝不默认为 0
        expect(recipe.total.fiberGrams).toBeNull();
        expect(recipe.total.sodiumMg).toBe(160.6);

        // Per Serving (2 份)
        expect(recipe.perServing?.caloriesKcal).toBe(115.5);
        expect(recipe.perServing?.proteinGrams).toBe(21.95);
        expect(recipe.perServing?.fatGrams).toBe(2.025);
        expect(recipe.perServing?.carbGrams).toBe(4.15);
        expect(recipe.perServing?.fiberGrams).toBeNull();
        expect(recipe.perServing?.sodiumMg).toBe(80.3);
      }
    });

    it('4.2 servings === null 时，perServing 必须为 null，禁止默认 servings = 1 或 2', () => {
      const recipe = calculateRecipeNutrition(
        [
          {
            food: realSanotsuChickenBreast,
            amount: 100,
            unit: 'g',
            weightBasis: 'edible_net'
          }
        ],
        null // 显式 null servings
      );

      expect(recipe.isComplete).toBe(true);
      if (recipe.isComplete) {
        expect(recipe.total.caloriesKcal).toBe(118);
        expect(recipe.servings).toBeNull();
        expect(recipe.perServing).toBeNull(); // 绝不默认算 1 或 2 份
      }

      // 未传 servings 参数时默认也为 null
      const recipeNoServings = calculateRecipeNutrition([
        {
          food: realSanotsuChickenBreast,
          amount: 100,
          unit: 'g',
          weightBasis: 'edible_net'
        }
      ]);
      expect(recipeNoServings.isComplete).toBe(true);
      if (recipeNoServings.isComplete) {
        expect(recipeNoServings.servings).toBeNull();
        expect(recipeNoServings.perServing).toBeNull();
      }
    });

    it('4.3 不完整 ingredient 绝对不得被静默忽略（不可换算单位）', () => {
      // 菜谱包含 2 个合法食材和 1 个“适量”或“勺”等无法换算的调料/食材
      const recipe = calculateRecipeNutrition([
        {
          food: realSanotsuChickenBreast,
          amount: 200,
          unit: 'g',
          weightBasis: 'edible_net',
          ingredientName: '鸡胸肉'
        },
        {
          food: realSanotsuBroccoli,
          amount: 100,
          unit: 'g',
          weightBasis: 'edible_net',
          ingredientName: '西兰花'
        },
        {
          food: realSanotsuChickenBreast,
          amount: 1,
          unit: '勺', // 无法换算的单位
          weightBasis: 'edible_net',
          ingredientName: '某调味汁'
        }
      ]);

      // 绝不能偷偷忽略第 3 项并返回前 2 项的总和！
      expect(recipe.isComplete).toBe(false);
      expect(recipe.status).toBe('incomplete');
      expect(recipe.total).toBeNull();
      expect(recipe.perServing).toBeNull();
      if (!recipe.isComplete) {
        expect(recipe.incompleteReasons.length).toBe(1);
        expect(recipe.incompleteReasons[0].code).toBe('UNCONVERTIBLE_UNIT');
        expect(recipe.incompleteReasons[0].ingredientName).toBe('某调味汁');
        expect(recipe.successfulIngredients.length).toBe(2);
      }
    });

    it('4.4 不完整 ingredient 绝对不得被静默忽略（unknown WeightBasis）', () => {
      const recipe = calculateRecipeNutrition([
        {
          food: realSanotsuChickenLeg,
          amount: 300,
          unit: 'g',
          weightBasis: 'unknown', // 未知重量语义
          ingredientName: '生鸡腿'
        }
      ]);

      expect(recipe.isComplete).toBe(false);
      expect(recipe.status).toBe('incomplete');
      expect(recipe.total).toBeNull();
      if (!recipe.isComplete) {
        expect(recipe.incompleteReasons.length).toBe(1);
        expect(recipe.incompleteReasons[0].code).toBe('UNKNOWN_WEIGHT_BASIS');
      }
    });

    it('4.5 空食材列表拒绝生成 complete 营养结果', () => {
      const recipe = calculateRecipeNutrition([]);
      expect(recipe.isComplete).toBe(false);
      expect(recipe.status).toBe('incomplete');
      expect(recipe.total).toBeNull();
      if (!recipe.isComplete) {
        expect(recipe.incompleteReasons[0].code).toBe('EMPTY_RECIPE');
      }
    });
  });

  // =========================================================================
  // 5. Utility Helpers
  // =========================================================================
  describe('5. Utility Helpers (roundNutrients)', () => {
    it('5.1 roundNutrients 能安全四舍五入并保留 null 语义', () => {
      const precise: NutrientValues = {
        caloriesKcal: 118.4567,
        proteinGrams: 24.6234,
        fatGrams: 1.8888,
        carbGrams: 0.6543,
        fiberGrams: null,
        sodiumMg: 48.1234
      };

      const rounded = roundNutrients(precise, 1);
      expect(rounded.caloriesKcal).toBe(118.5);
      expect(rounded.proteinGrams).toBe(24.6);
      expect(rounded.fatGrams).toBe(1.9);
      expect(rounded.carbGrams).toBe(0.7);
      expect(rounded.fiberGrams).toBeNull();
      expect(rounded.sodiumMg).toBe(48.1);
    });
  });

});
