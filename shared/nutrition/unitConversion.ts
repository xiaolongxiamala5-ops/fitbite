/**
 * Deterministic Unit Conversion for Nutrition Engine (C.2.2)
 *
 * Strict Architectural Guardrails:
 * 1. ONLY deterministic mass units are supported:
 *    - g / 克 -> 1g
 *    - kg / 千克 / 公斤 -> 1000g
 *    - 斤 / 市斤 -> 500g
 *    - 两 -> 50g
 * 2. Absolute prohibitions in C.2.2:
 *    - DO NOT assume 1 ml = 1 g (density varies across oils, sauces, water)
 *    - DO NOT assume spoon/tablespoon = fixed grams
 *    - DO NOT assume piece/item (个/只/条/支/瓣/根) = fixed grams
 * 3. Any unit without an explicit deterministic mass conversion MUST return unconvertible.
 */

export type UnitConversionResult =
  | { success: true; grams: number }
  | { success: false; reason: string };

const DETERMINISTIC_MASS_FACTORS: Record<string, number> = {
  g: 1,
  克: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  千克: 1000,
  公斤: 1000,
  kilogram: 1000,
  kilograms: 1000,
  斤: 500,
  市斤: 500,
  两: 50
};

export const SUPPORTED_MASS_UNITS: readonly string[] = Object.keys(DETERMINISTIC_MASS_FACTORS);

/**
 * Returns true if the unit has a deterministic conversion factor to grams.
 */
export function isConvertibleUnit(unit: string): boolean {
  if (typeof unit !== 'string') return false;
  const normalized = unit.trim().toLowerCase();
  return normalized in DETERMINISTIC_MASS_FACTORS;
}

/**
 * Converts a given amount and unit into grams.
 * Returns { success: false, reason: string } for unsupported or non-mass units.
 */
export function convertToGrams(amount: number, unit: string): UnitConversionResult {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return {
      success: false,
      reason: `Invalid amount: "${amount}". Amount must be a positive finite number.`
    };
  }

  if (typeof unit !== 'string') {
    return {
      success: false,
      reason: 'Unit must be a non-empty string.'
    };
  }

  const normalized = unit.trim().toLowerCase();
  if (!normalized) {
    return {
      success: false,
      reason: 'Unit cannot be empty.'
    };
  }

  const factor = DETERMINISTIC_MASS_FACTORS[normalized];
  if (factor !== undefined) {
    return {
      success: true,
      grams: amount * factor
    };
  }

  return {
    success: false,
    reason: `Unconvertible unit: "${unit}". FitBite C.2.2 only supports deterministic mass units (g, kg, 斤, 两).`
  };
}
