import {
  WeightBasis,
  NutritionFood,
  NutrientValues,
  IngredientNutritionSuccessResult
} from './types';
import {
  calculateIngredientNutrition,
  sumNutrition,
  divideNutrition
} from './calculator';

import { isConvertibleUnit } from './unitConversion';
import {
  classifyIngredient,
  MaterialityClassification
} from './materialityPolicy';

export type RecipeNutritionStatus =
  | 'nutrition_verified'    // All critical macro ingredients verified & calculated
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

/**
 * Evaluates recipe nutrition feasibility and calculates total/serving nutrition
 * under the FitBite Nutrition Materiality Policy (C.2.3).
 */
export function evaluateRecipeNutrition(
  recipe: RecipeEvaluationInput,
  options?: {
    foodLookup?: (idOrName: string) => NutritionFood | undefined;
    weightBasisLookup?: (idOrName: string) => WeightBasis | undefined;
  }
): RecipeNutritionEvaluationResult {
  const evaluatedIngredients: EvaluatedIngredientItem[] = [];
  const blockingCriticalIngredients: IncompleteBlocker[] = [];
  const ignoredMinorSeasonings: IgnoredMinorSeasoning[] = [];
  const unquantifiedSodiumSeasonings: string[] = [];
  const successfulNutrients: NutrientValues[] = [];

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
    const food = item.food || options?.foodLookup?.(identifier) || options?.foodLookup?.(item.name);
    // Resolve weightBasis if not directly provided:
    // 1. Explicit item weightBasis
    // 2. Trustworthy determination from source semantics (e.g. options.weightBasisLookup)
    // 3. Fallback: 'unknown' (strictly prohibited from guessing 'edible_net' or 'gross_as_purchased')
    const weightBasis: WeightBasis =
      item.weightBasis ||
      options?.weightBasisLookup?.(identifier) ||
      options?.weightBasisLookup?.(item.name) ||
      'unknown';

    const hasValidAmount = typeof item.amount === 'number' && Number.isFinite(item.amount) && item.amount > 0;
    const hasConvertibleUnit = typeof item.unit === 'string' && isConvertibleUnit(item.unit);

    let calculationSuccess = false;
    let computedResult: IngredientNutritionSuccessResult | null = null;

    if (hasValidAmount && hasConvertibleUnit && food && weightBasis !== 'unknown') {
      const calc = calculateIngredientNutrition({
        food,
        amount: item.amount!,
        unit: item.unit!,
        weightBasis,
        canonicalId: item.id,
        ingredientName: item.name
      });

      if (calc.success) {
        calculationSuccess = true;
        computedResult = calc;
        successfulNutrients.push(calc.nutrients);
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
        nutrients: computedResult.nutrients
      });
      continue;
    }

    // Ingredient was NOT successfully calculated (unquantified or unmapped)
    if (classification.isOil) {
      // Rule 5: Oil is NEVER negligible
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

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    nutritionStatus: 'nutrition_verified',
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
