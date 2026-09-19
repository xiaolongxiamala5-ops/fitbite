/**
 * Weight basis semantics for recipe ingredients:
 * - 'edible_net': The ingredient specifies net edible weight (e.g. skinless boneless chicken breast, peeled shrimp).
 *   actualEdibleGrams = grams (does NOT multiply Sanotsu edibleFraction)
 * - 'gross_as_purchased': The ingredient specifies gross market weight with bone/shell (e.g. bone-in chicken leg, whole shrimp, whole egg).
 *   actualEdibleGrams = grams * edibleFraction
 * - 'unknown': Weight basis is ambiguous; must be flagged as nutrition_incomplete by Evaluator.
 */
export type WeightBasis = 'edible_net' | 'gross_as_purchased' | 'unknown';

export interface MacroNutrients {
  calories: number;       // Energy in kcal (per 100g edible portion)
  protein: number;        // Protein in grams (per 100g edible portion)
  fat: number;            // Total fat in grams (per 100g edible portion)
  carbs: number;          // Carbohydrates in grams (per 100g edible portion)
  fiber: number | null;   // Total dietary fiber in grams, null if unmeasured
  sodium: number | null;  // Sodium in milligrams (mg), null if unmeasured
}

export interface NutritionFoodProvenance {
  source: 'china_food_composition_v6';
  commit: string;
  sourceFile: string;
  rawEdible: string;
  hasTraceValues: boolean;
}

export interface NutritionFood {
  /** Global unique identifier, e.g. "sanotsu:091112" */
  id: string;
  /** Opaque food code from upstream source, e.g. "091112", "091101x" */
  foodCode: string;
  /** Chinese common food name */
  name: string;
  /** English food name if present in source dataset, null if empty */
  englishName: string | null;
  /** Category name from dataset, e.g. "禽肉类及其制品-鸡" */
  category: string;
  /**
   * Edible fraction: 0.0 ~ 1.0 (e.g., 100% -> 1.0, 74% -> 0.74).
   * Note: Never divide this fraction by 100 again during calculations!
   */
  edibleFraction: number;
  /** Macro nutrients per 100g edible portion */
  per100g: MacroNutrients;
  /** Provenance tracking metadata */
  provenance: NutritionFoodProvenance;
}

/**
 * Deterministic Edible Grams calculation contract:
 * - edible_net: grams
 * - gross_as_purchased: grams * edibleFraction
 * - unknown: null
 */
export function calculateEdibleGrams(
  grams: number,
  basis: WeightBasis,
  edibleFraction: number
): number | null {
  if (grams < 0) return null;
  if (basis === 'edible_net') {
    return grams;
  }
  if (basis === 'gross_as_purchased') {
    return grams * edibleFraction;
  }
  return null;
}
