import {
  WeightBasis,
  NutritionFood,
  NutrientValues,
  IngredientNutritionInput,
  IngredientNutritionResult,
  IngredientNutritionSuccessResult,
  RecipeNutritionResult,
  calculateEdibleGrams
} from './types';
import { convertToGrams } from './unitConversion';

/**
 * Utility rounding function to prevent IEEE 754 floating-point noise.
 * Default precision is 4 decimal places for internal calculations.
 */
export function roundTo(value: number, decimals: number = 4): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Convenience helper to round all nutrient values to a display-friendly precision (default 1 decimal).
 */
export function roundNutrients(nutrients: NutrientValues, decimals: number = 1): NutrientValues {
  return {
    caloriesKcal: roundTo(nutrients.caloriesKcal, decimals),
    proteinGrams: roundTo(nutrients.proteinGrams, decimals),
    fatGrams: roundTo(nutrients.fatGrams, decimals),
    carbGrams: roundTo(nutrients.carbGrams, decimals),
    fiberGrams: nutrients.fiberGrams !== null ? roundTo(nutrients.fiberGrams, decimals) : null,
    sodiumMg: nutrients.sodiumMg !== null ? roundTo(nutrients.sodiumMg, decimals) : null
  };
}

/**
 * Calculate nutrition for a single ingredient.
 * Supports either an options object or positional arguments.
 *
 * Deterministic Formula:
 * nutrient = (actualEdibleGrams / 100) * nutritionPer100g
 *
 * WeightBasis:
 * - 'edible_net': actualEdibleGrams = grams (does NOT apply edibleFraction)
 * - 'gross_as_purchased': actualEdibleGrams = grams * edibleFraction
 * - 'unknown': rejects calculation with UNKNOWN_WEIGHT_BASIS
 *
 * Missing Values:
 * null in source remains null; never assumed to be 0.
 */
export function calculateIngredientNutrition(
  input: IngredientNutritionInput
): IngredientNutritionResult;
export function calculateIngredientNutrition(
  food: NutritionFood,
  amount: number,
  unit: string,
  weightBasis: WeightBasis,
  canonicalId?: string,
  ingredientName?: string
): IngredientNutritionResult;
export function calculateIngredientNutrition(
  inputOrFood: IngredientNutritionInput | NutritionFood,
  amount?: number,
  unit?: string,
  weightBasis?: WeightBasis,
  canonicalId?: string,
  ingredientName?: string
): IngredientNutritionResult {
  let food: NutritionFood;
  let amt: number;
  let u: string;
  let basis: WeightBasis;
  let cid: string | undefined;
  let name: string | undefined;

  if (inputOrFood && typeof inputOrFood === 'object' && 'food' in inputOrFood) {
    const input = inputOrFood as IngredientNutritionInput;
    food = input.food;
    amt = input.amount;
    u = input.unit;
    basis = input.weightBasis;
    cid = input.canonicalId;
    name = input.ingredientName;
  } else {
    food = inputOrFood as NutritionFood;
    amt = amount!;
    u = unit!;
    basis = weightBasis!;
    cid = canonicalId;
    name = ingredientName;
  }

  // 1. Verify food exists and has per100g
  if (!food || typeof food !== 'object' || !food.per100g) {
    return {
      success: false,
      code: 'MISSING_NUTRITION_FOOD',
      reason: 'Missing NutritionFood data',
      canonicalId: cid,
      ingredientName: name,
      rawAmount: amt,
      rawUnit: u,
      weightBasis: basis
    };
  }

  // 2. Verify amount
  if (typeof amt !== 'number' || !Number.isFinite(amt) || amt <= 0) {
    return {
      success: false,
      code: 'INVALID_AMOUNT',
      reason: `Amount must be a positive finite number, received: ${amt}`,
      food,
      canonicalId: cid,
      ingredientName: name,
      rawAmount: amt,
      rawUnit: u,
      weightBasis: basis
    };
  }

  // 3. Convert unit to grams
  const conversion = convertToGrams(amt, u);
  if (!conversion.success) {
    return {
      success: false,
      code: 'UNCONVERTIBLE_UNIT',
      reason: conversion.reason,
      food,
      canonicalId: cid,
      ingredientName: name,
      rawAmount: amt,
      rawUnit: u,
      weightBasis: basis
    };
  }

  // 4. Validate WeightBasis
  if (basis === 'unknown') {
    return {
      success: false,
      code: 'UNKNOWN_WEIGHT_BASIS',
      reason: 'WeightBasis is unknown: cannot determine whether amount represents gross or net edible weight',
      food,
      canonicalId: cid,
      ingredientName: name,
      rawAmount: amt,
      rawUnit: u,
      weightBasis: basis
    };
  }

  if (basis !== 'edible_net' && basis !== 'gross_as_purchased') {
    return {
      success: false,
      code: 'INVALID_WEIGHT_BASIS',
      reason: `Invalid WeightBasis: "${basis}"`,
      food,
      canonicalId: cid,
      ingredientName: name,
      rawAmount: amt,
      rawUnit: u,
      weightBasis: basis
    };
  }

  // 5. Calculate edible grams
  const actualEdibleGrams = calculateEdibleGrams(conversion.grams, basis, food.edibleFraction);
  if (actualEdibleGrams === null || actualEdibleGrams < 0) {
    return {
      success: false,
      code: 'CALCULATION_ERROR',
      reason: `Failed to calculate edible grams from ${conversion.grams}g with basis "${basis}"`,
      food,
      canonicalId: cid,
      ingredientName: name,
      rawAmount: amt,
      rawUnit: u,
      weightBasis: basis
    };
  }

  // 6. Compute nutrients: (actualEdibleGrams / 100) * per100g
  const edibleRatio = actualEdibleGrams / 100;
  const caloriesKcal = roundTo(edibleRatio * food.per100g.calories);
  const proteinGrams = roundTo(edibleRatio * food.per100g.protein);
  const fatGrams = roundTo(edibleRatio * food.per100g.fat);
  const carbGrams = roundTo(edibleRatio * food.per100g.carbs);
  const fiberGrams = food.per100g.fiber !== null ? roundTo(edibleRatio * food.per100g.fiber) : null;
  const sodiumMg = food.per100g.sodium !== null ? roundTo(edibleRatio * food.per100g.sodium) : null;

  return {
    success: true,
    food,
    canonicalId: cid,
    ingredientName: name ?? food.name,
    weightBasis: basis,
    rawAmount: amt,
    rawUnit: u,
    actualGrams: conversion.grams,
    actualEdibleGrams,
    nutrients: {
      caloriesKcal,
      proteinGrams,
      fatGrams,
      carbGrams,
      fiberGrams,
      sodiumMg
    }
  };
}

/**
 * Sum an array of NutrientValues.
 * Strict Rule: Missing values (null) in fiber or sodium are NOT assumed to be 0.
 * If ANY ingredient has null, the aggregated value for that nutrient is null.
 */
export function sumNutrition(nutrientsList: NutrientValues[]): NutrientValues {
  if (nutrientsList.length === 0) {
    return {
      caloriesKcal: 0,
      proteinGrams: 0,
      fatGrams: 0,
      carbGrams: 0,
      fiberGrams: 0,
      sodiumMg: 0
    };
  }

  let totalCalories = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;
  let hasNullFiber = false;
  let totalFiber = 0;
  let hasNullSodium = false;
  let totalSodium = 0;

  for (const n of nutrientsList) {
    totalCalories += n.caloriesKcal;
    totalProtein += n.proteinGrams;
    totalFat += n.fatGrams;
    totalCarbs += n.carbGrams;

    if (n.fiberGrams === null) {
      hasNullFiber = true;
    } else {
      totalFiber += n.fiberGrams;
    }

    if (n.sodiumMg === null) {
      hasNullSodium = true;
    } else {
      totalSodium += n.sodiumMg;
    }
  }

  return {
    caloriesKcal: roundTo(totalCalories),
    proteinGrams: roundTo(totalProtein),
    fatGrams: roundTo(totalFat),
    carbGrams: roundTo(totalCarbs),
    fiberGrams: hasNullFiber ? null : roundTo(totalFiber),
    sodiumMg: hasNullSodium ? null : roundTo(totalSodium)
  };
}

/**
 * Divide nutrient values by a divisor (e.g. number of servings).
 * Strict Rule: Null nutrients remain null.
 */
export function divideNutrition(nutrients: NutrientValues, divisor: number): NutrientValues {
  if (typeof divisor !== 'number' || !Number.isFinite(divisor) || divisor <= 0) {
    throw new Error(`Divisor must be a positive finite number, received: ${divisor}`);
  }

  return {
    caloriesKcal: roundTo(nutrients.caloriesKcal / divisor),
    proteinGrams: roundTo(nutrients.proteinGrams / divisor),
    fatGrams: roundTo(nutrients.fatGrams / divisor),
    carbGrams: roundTo(nutrients.carbGrams / divisor),
    fiberGrams: nutrients.fiberGrams !== null ? roundTo(nutrients.fiberGrams / divisor) : null,
    sodiumMg: nutrients.sodiumMg !== null ? roundTo(nutrients.sodiumMg / divisor) : null
  };
}

/**
 * Calculate recipe nutrition from a list of ingredients.
 * Accepts an array of IngredientNutritionInput or already computed IngredientNutritionResult.
 *
 * Strict Guardrails:
 * 1. If ANY ingredient fails calculation, it is NEVER silently ignored.
 *    Incomplete reasons are collected and status is set to 'incomplete'.
 * 2. Servings handling:
 *    - If servings != null && servings > 0 -> perServing = total / servings
 *    - If servings === null -> perServing = null
 *    - NEVER assume default servings = 1 or 2!
 */
export function calculateRecipeNutrition(
  ingredients: Array<IngredientNutritionInput | IngredientNutritionResult>,
  servings: number | null = null
): RecipeNutritionResult {
  const successfulIngredients: IngredientNutritionSuccessResult[] = [];
  const incompleteReasons: Array<{
    canonicalId?: string;
    ingredientName?: string;
    code: string;
    reason: string;
  }> = [];

  for (const item of ingredients) {
    let result: IngredientNutritionResult;
    if ('success' in item) {
      result = item;
    } else {
      result = calculateIngredientNutrition(item);
    }

    if (result.success) {
      successfulIngredients.push(result);
    } else {
      incompleteReasons.push({
        canonicalId: result.canonicalId,
        ingredientName: result.ingredientName,
        code: result.code,
        reason: result.reason
      });
    }
  }

  // Validate servings argument: must be explicit finite positive number
  const validServings =
    typeof servings === 'number' && Number.isFinite(servings) && servings > 0
      ? servings
      : null;

  // If there are ANY incomplete ingredients or zero ingredients
  if (incompleteReasons.length > 0 || ingredients.length === 0) {
    if (ingredients.length === 0) {
      incompleteReasons.push({
        code: 'EMPTY_RECIPE',
        reason: 'Recipe contains zero ingredients.'
      });
    }

    return {
      status: 'incomplete',
      isComplete: false,
      total: null,
      perServing: null,
      servings: validServings,
      incompleteReasons,
      successfulIngredients
    };
  }

  // All ingredients calculated successfully
  const nutrientsList = successfulIngredients.map(i => i.nutrients);
  const total = sumNutrition(nutrientsList);
  const perServing = validServings !== null ? divideNutrition(total, validServings) : null;

  return {
    status: 'complete',
    isComplete: true,
    total,
    perServing,
    servings: validServings,
    ingredients: successfulIngredients
  };
}
