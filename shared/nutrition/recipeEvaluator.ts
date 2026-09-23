import {
  WeightBasis,
  NutritionFood,
  NutrientValues,
  IngredientNutritionSuccessResult,
  NutritionConfidenceLevel
} from './types';
import {
  calculateIngredientNutrition,
  sumNutrition,
  divideNutrition,
  roundTo
} from './calculator';

import { convertToGrams, isConvertibleUnit } from './unitConversion';
import {
  classifyIngredient,
  MaterialityClassification
} from './materialityPolicy';
import { CANONICAL_NUTRITION_LOOKUP } from '../../data/nutrition/mappings/canonical-to-sanotsu';

export type RecipeNutritionStatus =
  | 'nutrition_verified'    // All critical macro ingredients verified & calculated
  | 'nutrition_estimated'   // Reliable kitchen estimation via calibrated household units / oil fallback
  | 'nutrition_incomplete'  // Missing critical ingredient, oil, sugar, or unconvertible unit
  | 'nutrition_unverified'; // Default state before evaluation

export interface EvaluatedIngredientItem {
  id?: string;
  name: string;
  classification: MaterialityClassification;
  isQuantified: boolean;
  rawAmount?: number;
  rawUnit?: string;
  actualGrams?: number;
  actualEdibleGrams?: number;
  weightBasis?: WeightBasis;
  nutrients?: NutrientValues;
  isEstimated?: boolean;
  ignoredForMacroEstimate?: boolean;
  ignoredReason?: string;
  blockReason?: string;
}

export interface IncompleteBlocker {
  ingredientId?: string;
  ingredientName: string;
  reason: 'unquantified_oil' | 'unquantified_macro_critical' | 'unconvertible_unit' | 'missing_mapping' | 'unknown_weight_basis';
  message: string;
}

export interface IgnoredMinorSeasoning {
  ingredientId?: string;
  ingredientName: string;
  reason: 'minor_seasoning_unquantified';
}

export interface RecipeNutritionEvaluationResult {
  recipeId?: string;
  recipeName?: string;
  nutritionStatus: RecipeNutritionStatus;
  confidence: NutritionConfidenceLevel;
  calorieRange?: [number, number];
  isEstimated?: boolean;
  canEstimateMacros: boolean;
  isMacroComplete: boolean;
  isSodiumComplete: boolean;
  total: NutrientValues | null;
  perServing: NutrientValues | null;
  servings: number | null;
  evaluatedIngredients: EvaluatedIngredientItem[];
  blockingCriticalIngredients: IncompleteBlocker[];
  ignoredMinorSeasonings: IgnoredMinorSeasoning[];
  unquantifiedSodiumSeasonings: string[];
  incompleteReasons: string[];
}

export interface RecipeIngredientInput {
  id?: string;
  name: string;
  amount?: number;
  unit?: string;
  food?: NutritionFood;
  weightBasis?: WeightBasis;
  originalRawText?: string;
}

export interface RecipeEvaluationInput {
  id?: string;
  name?: string;
  servings?: number | null;
  requiredIngredients: RecipeIngredientInput[];
  pantryIngredients?: Array<string | RecipeIngredientInput>;
}

export interface RecipeEvaluationOptions {
  foodLookup?: (idOrName: string) => NutritionFood | undefined;
  weightBasisLookup?: (idOrName: string) => WeightBasis | undefined;
  allowEstimated?: boolean;
  mode?: 'strict' | 'dual' | 'estimated';
}

/** 192014 色拉油 (Standard cooking oil fallback: 898 kcal, 99.8g fat / 100g) */
const FALLBACK_OIL_FOOD: NutritionFood = {
  id: 'sanotsu:192014',
  foodCode: '192014',
  name: '色拉油',
  englishName: 'Salad oil，mix oil',
  category: '植物油-植物油',
  edibleFraction: 1,
  per100g: {
    calories: 898,
    protein: 0,
    fat: 99.8,
    carbs: 0,
    fiber: null,
    sodium: 5.1
  },
  provenance: {
    source: 'china_food_composition_v6',
    commit: 'd15675c27582748307023b7ee7aca2a63fc52756',
    sourceFile: 'food_composition_full.csv',
    rawEdible: '100',
    hasTraceValues: true
  }
};

/** 022103 玉米淀粉 (Standard starch fallback: 346 kcal, 85g carbs / 100g) */
const FALLBACK_STARCH_FOOD: NutritionFood = {
  id: 'sanotsu:022103',
  foodCode: '022103',
  name: '玉米淀粉',
  englishName: 'Corn starch',
  category: '薯类淀粉及其制品-淀粉类',
  edibleFraction: 1,
  per100g: {
    calories: 346,
    protein: 0.2,
    fat: 0.1,
    carbs: 85,
    fiber: null,
    sodium: 5.6
  },
  provenance: {
    source: 'china_food_composition_v6',
    commit: 'd15675c27582748307023b7ee7aca2a63fc52756',
    sourceFile: 'food_composition_full.csv',
    rawEdible: '100',
    hasTraceValues: false
  }
};

/** 071001 白砂糖 (Standard sugar fallback: 400 kcal, 100g carbs / 100g) */
const FALLBACK_SUGAR_FOOD: NutritionFood = {
  id: 'sanotsu:condiment_sugar',
  foodCode: '071001',
  name: '白砂糖',
  englishName: 'Granulated sugar',
  category: '调味品-糖',
  edibleFraction: 1,
  per100g: {
    calories: 400,
    protein: 0,
    fat: 0,
    carbs: 100,
    fiber: 0,
    sodium: 1.1
  },
  provenance: {
    source: 'china_food_composition_v6',
    commit: 'd15675c27582748307023b7ee7aca2a63fc52756',
    sourceFile: 'food_composition_full.csv',
    rawEdible: '100',
    hasTraceValues: false
  }
};

/** 044301 大蒜 (Standard garlic fallback: 126 kcal, 4.5g protein, 0.2g fat, 26.5g carbs / 100g) */
const FALLBACK_GARLIC_FOOD: NutritionFood = {
  id: 'sanotsu:pantry_garlic',
  foodCode: '044301',
  name: '大蒜',
  englishName: 'Garlic',
  category: '蔬菜类及其制品-葱蒜类',
  edibleFraction: 1,
  per100g: {
    calories: 126,
    protein: 4.5,
    fat: 0.2,
    carbs: 26.5,
    fiber: 1.1,
    sodium: 4.4
  },
  provenance: {
    source: 'china_food_composition_v6',
    commit: 'd15675c27582748307023b7ee7aca2a63fc52756',
    sourceFile: 'food_composition_full.csv',
    rawEdible: '100',
    hasTraceValues: false
  }
};

/** 044101 生姜 (Standard ginger fallback: 41 kcal, 1.3g protein, 0.6g fat, 7.6g carbs / 100g) */
const FALLBACK_GINGER_FOOD: NutritionFood = {
  id: 'sanotsu:preset_ginger',
  foodCode: '044101',
  name: '生姜',
  englishName: 'Ginger',
  category: '蔬菜类及其制品-根茎类',
  edibleFraction: 1,
  per100g: {
    calories: 41,
    protein: 1.3,
    fat: 0.6,
    carbs: 7.6,
    fiber: 1.4,
    sodium: 13.9
  },
  provenance: {
    source: 'china_food_composition_v6',
    commit: 'd15675c27582748307023b7ee7aca2a63fc52756',
    sourceFile: 'food_composition_full.csv',
    rawEdible: '100',
    hasTraceValues: false
  }
};

/** 044201 葱 (Standard scallion fallback: 30 kcal, 1.7g protein, 0.3g fat, 5.2g carbs / 100g) */
const FALLBACK_SCALLION_FOOD: NutritionFood = {
  id: 'sanotsu:preset_scallion',
  foodCode: '044201',
  name: '葱',
  englishName: 'Scallion',
  category: '蔬菜类及其制品-葱蒜类',
  edibleFraction: 1,
  per100g: {
    calories: 30,
    protein: 1.7,
    fat: 0.3,
    carbs: 5.2,
    fiber: 1.2,
    sodium: 8.4
  },
  provenance: {
    source: 'china_food_composition_v6',
    commit: 'd15675c27582748307023b7ee7aca2a63fc52756',
    sourceFile: 'food_composition_full.csv',
    rawEdible: '100',
    hasTraceValues: false
  }
};

/** 161001 黄酒/料酒 (Standard cooking wine fallback: 120 kcal, 1.2g protein, 0g fat, 5.0g carbs / 100g) */
const FALLBACK_COOKING_WINE_FOOD: NutritionFood = {
  id: 'sanotsu:preset_cooking_wine',
  foodCode: '161001',
  name: '黄酒/料酒',
  englishName: 'Cooking wine',
  category: '调味品-酒',
  edibleFraction: 1,
  per100g: {
    calories: 120,
    protein: 1.2,
    fat: 0,
    carbs: 5.0,
    fiber: 0,
    sodium: 10
  },
  provenance: {
    source: 'china_food_composition_v6',
    commit: 'd15675c27582748307023b7ee7aca2a63fc52756',
    sourceFile: 'food_composition_full.csv',
    rawEdible: '100',
    hasTraceValues: false
  }
};

/**
 * Evaluates recipe nutrition feasibility and calculates total/serving nutrition
 * under the FitBite Nutrition Materiality Policy (C.2.3) & Dual-Track Kitchen Estimation.
 */
export function evaluateRecipeNutrition(
  recipe: RecipeEvaluationInput,
  options?: RecipeEvaluationOptions
): RecipeNutritionEvaluationResult {
  const evaluatedIngredients: EvaluatedIngredientItem[] = [];
  const blockingCriticalIngredients: IncompleteBlocker[] = [];
  const ignoredMinorSeasonings: IgnoredMinorSeasoning[] = [];
  const unquantifiedSodiumSeasonings: string[] = [];
  const successfulNutrients: NutrientValues[] = [];

  const isDualOrEstimated =
    options?.allowEstimated ??
    (options?.mode === 'dual' || options?.mode === 'estimated') ??
    false;

  let hasEstimatedFactors = false;
  let hasInjectedFallbackOil = false;

  // Normalize ingredients list: requiredIngredients + pantryIngredients
  const allInputs: RecipeIngredientInput[] = [...recipe.requiredIngredients];

  if (Array.isArray(recipe.pantryIngredients)) {
    for (const p of recipe.pantryIngredients) {
      if (typeof p === 'string') {
        allInputs.push({
          id: p,
          name: p
        });
      } else if (p && typeof p === 'object') {
        allInputs.push(p);
      }
    }
  }

  // Process each ingredient
  for (const item of allInputs) {
    const identifier = item.id || item.name;
    // 优先使用规范 ID 分类，若未命中特定分类且存在真实中文名，则回退检查中文名
    let classification = classifyIngredient(identifier);
    if (classification.category === 'calorie_macro_critical' && item.name && item.name !== item.id) {
      const nameClassification = classifyIngredient(item.name);
      if (nameClassification.category !== 'calorie_macro_critical') {
        classification = nameClassification;
      }
    }

    // Resolve food if not directly provided
    let food = item.food || options?.foodLookup?.(identifier) || options?.foodLookup?.(item.name);
    if (!food && isDualOrEstimated) {
      if (classification.isOil) {
        food = FALLBACK_OIL_FOOD;
      } else if (identifier === 'preset_sugar' || identifier === 'preset_rock_sugar' || (item.name && item.name.includes('糖'))) {
        food = FALLBACK_SUGAR_FOOD;
      } else if (identifier === 'preset_cooking_wine' || (item.name && (item.name.includes('料酒') || item.name.includes('黄酒') || item.name.includes('绍兴酒')))) {
        food = FALLBACK_COOKING_WINE_FOOD;
      } else if (identifier === 'preset_starch' || (item.name && item.name.includes('淀粉'))) {
        food = FALLBACK_STARCH_FOOD;
      } else if (identifier === 'pantry_garlic' || (item.name && item.name.includes('蒜'))) {
        food = FALLBACK_GARLIC_FOOD;
      } else if (identifier === 'preset_ginger' || (item.name && item.name.includes('姜'))) {
        food = FALLBACK_GINGER_FOOD;
      } else if (identifier === 'preset_scallion' || (item.name && item.name.includes('葱'))) {
        food = FALLBACK_SCALLION_FOOD;
      }
    }

    // Resolve weightBasis if not directly provided:
    let weightBasis: WeightBasis =
      item.weightBasis ||
      options?.weightBasisLookup?.(identifier) ||
      options?.weightBasisLookup?.(item.name) ||
      'unknown';

    // In dual/estimated mode, resolve unknown weightBasis from canonical dictionary or culinary heuristic
    if (weightBasis === 'unknown' && isDualOrEstimated) {
      const canonicalHit =
        CANONICAL_NUTRITION_LOOKUP.get(identifier) ||
        (item.id ? CANONICAL_NUTRITION_LOOKUP.get(item.id) : undefined);

      if (canonicalHit) {
        weightBasis = canonicalHit.defaultWeightBasis;
        hasEstimatedFactors = true;
      } else if (food) {
        if (food.edibleFraction >= 0.99) {
          weightBasis = 'edible_net';
        } else {
          weightBasis = 'gross_as_purchased';
          hasEstimatedFactors = true;
        }
      }
    }

    const hasValidAmount = typeof item.amount === 'number' && Number.isFinite(item.amount) && item.amount > 0;
    
    // Check unit convertibility
    let conversion = hasValidAmount && typeof item.unit === 'string'
      ? convertToGrams(item.amount!, item.unit!, identifier)
      : null;

    const hasConvertibleUnit = isDualOrEstimated
      ? (conversion?.success === true)
      : (typeof item.unit === 'string' && isConvertibleUnit(item.unit));

    if (conversion && conversion.success && conversion.isEstimated) {
      hasEstimatedFactors = true;
    }

    let calculationSuccess = false;
    let computedResult: IngredientNutritionSuccessResult | null = null;

    if (hasValidAmount && hasConvertibleUnit && food && weightBasis !== 'unknown') {
      const calc = calculateIngredientNutrition({
        food,
        amount: conversion && conversion.success ? conversion.grams : item.amount!,
        unit: conversion && conversion.success ? 'g' : item.unit!,
        weightBasis,
        canonicalId: item.id,
        ingredientName: item.name
      });

      if (calc.success) {
        calculationSuccess = true;
        computedResult = calc;
        successfulNutrients.push(calc.nutrients);
        if (calc.isEstimated) {
          hasEstimatedFactors = true;
        }
      }
    }

    if (calculationSuccess && computedResult) {
      evaluatedIngredients.push({
        id: item.id,
        name: item.name,
        classification,
        isQuantified: true,
        rawAmount: item.amount,
        rawUnit: item.unit,
        actualGrams: computedResult.actualGrams,
        actualEdibleGrams: computedResult.actualEdibleGrams,
        weightBasis,
        nutrients: computedResult.nutrients,
        isEstimated: computedResult.isEstimated
      });
      continue;
    }

    // Ingredient was NOT successfully calculated (unquantified or unmapped)
    if (classification.isOil) {
      if (isDualOrEstimated) {
        // 双轨估算模式：未定量食用油强制按家常快炒底线油 8g (~72 kcal, 8g 脂肪) 注入估算
        if (!hasInjectedFallbackOil) {
          const oilFood = food || FALLBACK_OIL_FOOD;
          const oilNutrients: NutrientValues = {
            caloriesKcal: roundTo((8 / 100) * oilFood.per100g.calories),
            proteinGrams: 0,
            fatGrams: roundTo((8 / 100) * oilFood.per100g.fat),
            carbGrams: 0,
            fiberGrams: null,
            sodiumMg: null
          };
          successfulNutrients.push(oilNutrients);
          hasEstimatedFactors = true;
          hasInjectedFallbackOil = true;

          evaluatedIngredients.push({
            id: item.id || 'pantry_oil',
            name: item.name || '食用油',
            classification,
            isQuantified: false,
            rawAmount: 8,
            rawUnit: 'g',
            actualGrams: 8,
            actualEdibleGrams: 8,
            weightBasis: 'edible_net',
            nutrients: oilNutrients,
            isEstimated: true
          });
          continue;
        } else {
          // 次要未定量油类（如点缀香油）在底线烹饪油已计入的前提下，作为佐味辅料记录
          evaluatedIngredients.push({
            id: item.id,
            name: item.name,
            classification,
            isQuantified: false,
            rawAmount: item.amount,
            rawUnit: item.unit,
            ignoredForMacroEstimate: true,
            ignoredReason: 'minor_oil_after_base_oil'
          });
          continue;
        }
      }

      // Strict mode: Oil is NEVER negligible
      let blockerReason: IncompleteBlocker['reason'] = 'unquantified_oil';
      let message = `食用油未定量：油属于高供能食材，未定量时禁止估算整菜热量与三大宏量 (${item.name})`;

      if (hasValidAmount && !hasConvertibleUnit) {
        blockerReason = 'unconvertible_unit';
        message = `核心食材 "${item.name}" 使用了非质量单位 "${item.unit}"，缺少密度或标准重量换算规则 (${item.amount}${item.unit})`;
      } else if (hasValidAmount && !food) {
        blockerReason = 'missing_mapping';
        message = `核心食材 "${item.name}" 缺少营养数据映射`;
      } else if (hasValidAmount && weightBasis === 'unknown') {
        blockerReason = 'unknown_weight_basis';
        message = `核心食材 "${item.name}" 的重量语义未知 (WeightBasis: unknown)`;
      }

      const blocker: IncompleteBlocker = {
        ingredientId: item.id,
        ingredientName: item.name,
        reason: blockerReason,
        message
      };
      blockingCriticalIngredients.push(blocker);
      evaluatedIngredients.push({
        id: item.id,
        name: item.name,
        classification,
        isQuantified: hasValidAmount,
        rawAmount: item.amount,
        rawUnit: item.unit,
        weightBasis: hasValidAmount ? weightBasis : undefined,
        blockReason: blocker.message
      });
    } else if (classification.isMacroCritical) {
      if (isDualOrEstimated && !hasValidAmount && (identifier === 'preset_sugar' || identifier === 'preset_rock_sugar' || identifier === 'preset_starch')) {
        // 估算模式：调料篮中的未定量少量提鲜糖/勾芡淀粉注入家常底线估算 (糖 2g，淀粉 3g)
        if (identifier === 'preset_sugar' || identifier === 'preset_rock_sugar') {
          const sugarFood = food || FALLBACK_SUGAR_FOOD;
          const sugarNutrients: NutrientValues = {
            caloriesKcal: roundTo((2 / 100) * sugarFood.per100g.calories),
            proteinGrams: 0,
            fatGrams: 0,
            carbGrams: roundTo((2 / 100) * sugarFood.per100g.carbs),
            fiberGrams: null,
            sodiumMg: null
          };
          successfulNutrients.push(sugarNutrients);
          hasEstimatedFactors = true;
          evaluatedIngredients.push({
            id: item.id,
            name: item.name || (identifier === 'preset_rock_sugar' ? '冰糖' : '白糖'),
            classification,
            isQuantified: false,
            rawAmount: 2,
            rawUnit: 'g',
            actualGrams: 2,
            actualEdibleGrams: 2,
            weightBasis: 'edible_net',
            nutrients: sugarNutrients,
            isEstimated: true
          });
          continue;
        } else {
          const starchFood = food || FALLBACK_STARCH_FOOD;
          const starchNutrients: NutrientValues = {
            caloriesKcal: roundTo((3 / 100) * starchFood.per100g.calories),
            proteinGrams: roundTo((3 / 100) * starchFood.per100g.protein),
            fatGrams: 0,
            carbGrams: roundTo((3 / 100) * starchFood.per100g.carbs),
            fiberGrams: null,
            sodiumMg: null
          };
          successfulNutrients.push(starchNutrients);
          hasEstimatedFactors = true;
          evaluatedIngredients.push({
            id: item.id,
            name: item.name || '淀粉',
            classification,
            isQuantified: false,
            rawAmount: 3,
            rawUnit: 'g',
            actualGrams: 3,
            actualEdibleGrams: 3,
            weightBasis: 'edible_net',
            nutrients: starchNutrients,
            isEstimated: true
          });
          continue;
        }
      }

      // Rule 1: Calorie/Macro Critical ingredients
      let blockerReason: IncompleteBlocker['reason'] = 'unquantified_macro_critical';
      let message = `核心供能食材 "${item.name}" 未定量或单位不可换算 (${item.unit || '无数量'})`;

      if (hasValidAmount && !hasConvertibleUnit) {
        blockerReason = 'unconvertible_unit';
        message = `核心食材 "${item.name}" 使用了非质量单位 "${item.unit}"，缺少密度或标准重量换算规则`;
      } else if (!food) {
        blockerReason = 'missing_mapping';
        message = `核心食材 "${item.name}" 缺少营养数据映射`;
      } else if (weightBasis === 'unknown') {
        blockerReason = 'unknown_weight_basis';
        message = `核心食材 "${item.name}" 的重量语义未知 (WeightBasis: unknown)，缺少来源证据判定削皮/处理前后称重`;
      }

      const blocker: IncompleteBlocker = {
        ingredientId: item.id,
        ingredientName: item.name,
        reason: blockerReason,
        message
      };
      blockingCriticalIngredients.push(blocker);
      evaluatedIngredients.push({
        id: item.id,
        name: item.name,
        classification,
        isQuantified: hasValidAmount,
        rawAmount: item.amount,
        rawUnit: item.unit,
        weightBasis,
        blockReason: blocker.message
      });
    } else if (classification.category === 'sauce') {
      // Rule 4: Sauces optional for macros, but sodium sensitive
      unquantifiedSodiumSeasonings.push(item.name);
      evaluatedIngredients.push({
        id: item.id,
        name: item.name,
        classification,
        isQuantified: false,
        rawAmount: item.amount,
        rawUnit: item.unit,
        ignoredForMacroEstimate: true,
        ignoredReason: 'unquantified_sauce_sodium_incomplete'
      });
    } else if (classification.category === 'minor_seasoning') {
      // Rule 2 & 3: Minor seasonings
      ignoredMinorSeasonings.push({
        ingredientId: item.id,
        ingredientName: item.name,
        reason: 'minor_seasoning_unquantified'
      });

      if (classification.isSodiumSensitive) {
        unquantifiedSodiumSeasonings.push(item.name);
      }

      evaluatedIngredients.push({
        id: item.id,
        name: item.name,
        classification,
        isQuantified: false,
        rawAmount: item.amount,
        rawUnit: item.unit,
        ignoredForMacroEstimate: true,
        ignoredReason: 'minor_seasoning_unquantified'
      });
    }
  }

  // Determine overall status
  const validServings =
    typeof recipe.servings === 'number' && Number.isFinite(recipe.servings) && recipe.servings > 0
      ? recipe.servings
      : null;

  if (blockingCriticalIngredients.length > 0 || successfulNutrients.length === 0) {
    const incompleteReasons = blockingCriticalIngredients.map(b => b.message);
    if (successfulNutrients.length === 0 && incompleteReasons.length === 0) {
      incompleteReasons.push('菜谱无任何可计算的食材。');
    }

    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      nutritionStatus: 'nutrition_incomplete',
      confidence: 'incomplete',
      canEstimateMacros: false,
      isMacroComplete: false,
      isSodiumComplete: false,
      total: null,
      perServing: null,
      servings: validServings,
      evaluatedIngredients,
      blockingCriticalIngredients,
      ignoredMinorSeasonings,
      unquantifiedSodiumSeasonings,
      incompleteReasons
    };
  }

  // All critical ingredients successfully computed!
  const total = sumNutrition(successfulNutrients);

  // If there are unquantified sodium seasonings (salt, soy sauce, oyster sauce, chicken essence)
  // strict rule: sodiumMg MUST NOT fabricate a precise value!
  if (unquantifiedSodiumSeasonings.length > 0) {
    total.sodiumMg = null;
  }

  const isSodiumComplete = unquantifiedSodiumSeasonings.length === 0 && total.sodiumMg !== null;
  const perServing = validServings !== null ? divideNutrition(total, validServings) : null;

  const confidence: NutritionConfidenceLevel = hasEstimatedFactors ? 'estimated' : 'verified';
  const nutritionStatus: RecipeNutritionStatus = hasEstimatedFactors ? 'nutrition_estimated' : 'nutrition_verified';

  // Calorie range: calories ±8%
  const calorieRange: [number, number] | undefined = hasEstimatedFactors
    ? [Math.round(total.caloriesKcal * 0.92), Math.round(total.caloriesKcal * 1.08)]
    : undefined;

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    nutritionStatus,
    confidence,
    calorieRange,
    isEstimated: hasEstimatedFactors,
    canEstimateMacros: true,
    isMacroComplete: true,
    isSodiumComplete,
    total,
    perServing,
    servings: validServings,
    evaluatedIngredients,
    blockingCriticalIngredients,
    ignoredMinorSeasonings,
    unquantifiedSodiumSeasonings,
    incompleteReasons: []
  };
}
