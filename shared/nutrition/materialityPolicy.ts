/**
 * Recipe Nutrition Materiality Policy (C.2.3)
 *
 * Defines the materiality rules for nutrition evaluation in FitBite:
 *
 * 1. Calorie/Macro Critical Ingredients (calorie_macro_critical):
 *    - Main ingredients, proteins, starches, sugars, nuts, pastes.
 *    - Any missing critical ingredient strictly blocks macro estimation.
 *
 * 2. Oil is NEVER Negligible (oil_never_negligible):
 *    - Cooking oils, sesame oil, chili oil, lard, etc.
 *    - Must NEVER be treated as a minor seasoning.
 *    - If unquantified, strictly blocks macro completeness.
 *
 * 3. Minor Seasonings (minor_seasoning):
 *    - Conventional small-amount seasonings: salt, pepper, spices, scallion, ginger, garlic, vinegar, cooking wine.
 *    - If unquantified, allowed to not block macro estimation.
 *    - Never hardcoded as 0 kcal in source facts.
 *    - Marked as ignoredForMacroEstimate: true, reason: 'minor_seasoning_unquantified'.
 *
 * 4. Sauces & Sodium-Sensitive Seasonings:
 *    - Soy sauce, oyster sauce, salt, chicken essence, MSG.
 *    - If unquantified, does NOT block macros, but marks sodium as incomplete / unknown (sodiumMg = null).
 */

export type IngredientMaterialityCategory =
  | 'calorie_macro_critical'
  | 'oil_never_negligible'
  | 'minor_seasoning'
  | 'sauce';

export interface MaterialityClassification {
  category: IngredientMaterialityCategory;
  isMacroCritical: boolean;
  isOil: boolean;
  isSodiumSensitive: boolean;
  standardName: string;
}

// =========================================================================
// Keyword / ID Registries
// =========================================================================

/** Oil and fat keywords (never negligible) */
const OIL_KEYWORDS = [
  '油', '食用油', '植物油', '花生油', '菜籽油', '玉米油', '橄榄油',
  '大豆油', '葵花籽油', '芝麻油', '香油', '麻油', '辣椒油', '红油',
  '猪油', '牛油', '羊油', '黄油', '色拉油', '油泼辣子', '调和油'
];

const OIL_IDS = new Set([
  'pantry_oil',
  'preset_sesame_oil'
]);

/** Calorie-dense sweeteners (sugar, honey, etc.) */
const SUGAR_KEYWORDS = [
  '白糖', '糖', '白砂糖', '冰糖', '红糖', '绵白糖', '砂糖', '蜂蜜', '黑糖', '麦芽糖', '糖浆'
];

const SUGAR_IDS = new Set([
  'preset_sugar'
]);

/** Starches (calorie-dense carbs) */
const STARCH_KEYWORDS = [
  '淀粉', '玉米淀粉', '生粉', '水淀粉', '太白粉', '红薯淀粉', '土豆淀粉'
];

const STARCH_IDS = new Set([
  'preset_starch'
]);

/** Calorie-dense nut pastes & dressings */
const PASTE_KEYWORDS = [
  '花生酱', '芝麻酱', '沙拉酱', '蛋黄酱'
];

/** Liquid and paste sauces (optional for macros if unquantified, but sodium-sensitive) */
const SAUCE_KEYWORDS = [
  '生抽', '老抽', '酱油', '生抽酱油', '味极鲜', '一品鲜',
  '蚝油', '蒸鱼豉油', '豉油', '豆瓣酱', '郫县豆瓣酱', '红油豆瓣酱',
  '番茄酱', '番茄沙司'
];

const SAUCE_IDS = new Set([
  'pantry_soy_sauce',
  'preset_oyster_sauce',
  'preset_steamed_fish_soy_sauce',
  'preset_doubanjiang',
  'preset_ketchup'
]);

/** Minor seasonings with high sodium impact */
const SODIUM_SEASONING_KEYWORDS = [
  '食盐', '盐', '精盐', '细盐', '食用盐',
  '鸡精', '鸡粉', '味精', '蘑菇精', '蔬之鲜'
];

const SODIUM_SEASONING_IDS = new Set([
  'pantry_salt',
  'preset_chicken_essence'
]);

/** Minor seasonings with negligible calorie & sodium impact */
const MINOR_SPICE_KEYWORDS = [
  // Alliums & aromatics
  '葱', '葱花', '小葱', '大葱', '香葱', '葱段', '葱白', '葱丝',
  '生姜', '姜', '老姜', '姜片', '姜丝', '姜末',
  '大蒜', '蒜', '蒜瓣', '蒜末', '蒜泥', '蒜蓉', '大蒜瓣', '大蒜末',
  // Peppers & spices
  '黑胡椒', '白胡椒', '胡椒粉', '黑胡椒粉', '白胡椒粉',
  '八角', '大料', '八角茴香',
  '花椒', '花椒粉', '花椒粒', '青花椒', '麻椒',
  '孜然', '孜然粉', '孜然粒',
  '辣椒粉', '干辣椒', '辣椒面', '辣椒碎',
  '桂皮', '香叶', '丁香', '草果', '肉蔻', '小茴香',
  // Deglazing & acid
  '料酒', '黄酒', '绍兴酒', '白酒', '烹调料酒',
  '香醋', '陈醋', '白醋', '米醋', '醋', '镇江香醋'
];

const MINOR_SPICE_IDS = new Set([
  'pantry_garlic',
  'pantry_black_pepper',
  'preset_ginger',
  'preset_scallion',
  'preset_star_anise',
  'preset_sichuan_pepper',
  'preset_cumin',
  'preset_chili_powder',
  'preset_cooking_wine',
  'preset_vinegar'
]);

// =========================================================================
// Classification API
// =========================================================================

/**
 * Classifies an ingredient (by identifier or name) according to FitBite Nutrition Materiality Policy.
 */
export function classifyIngredient(idOrName: string): MaterialityClassification {
  const normalized = (idOrName || '').trim();
  const lower = normalized.toLowerCase();

  // 1. Sauces (Rule 4: Optional for macros if unquantified, but sodium-sensitive)
  // Check sauces FIRST so that 蚝油 / 酱油 / 蒸鱼豉油 are never confused with cooking oils
  if (
    SAUCE_IDS.has(normalized) ||
    SAUCE_KEYWORDS.some(k => normalized === k || normalized.includes(k))
  ) {
    return {
      category: 'sauce',
      isMacroCritical: false,
      isOil: false,
      isSodiumSensitive: true,
      standardName: normalized
    };
  }

  // 2. Oil is NEVER Negligible (Rule 5)
  if (
    OIL_IDS.has(normalized) ||
    lower.endsWith('_oil') ||
    OIL_KEYWORDS.some(k => normalized === k || (k !== '油' && normalized.includes(k)) || normalized === '油')
  ) {
    return {
      category: 'oil_never_negligible',
      isMacroCritical: true,
      isOil: true,
      isSodiumSensitive: false,
      standardName: normalized
    };
  }

  // 2. Sugar & Sweeteners (Rule 1)
  if (
    SUGAR_IDS.has(normalized) ||
    SUGAR_KEYWORDS.some(k => normalized === k || normalized.includes(k))
  ) {
    return {
      category: 'calorie_macro_critical',
      isMacroCritical: true,
      isOil: false,
      isSodiumSensitive: false,
      standardName: normalized
    };
  }

  // 3. Starches (Rule 1)
  if (
    STARCH_IDS.has(normalized) ||
    STARCH_KEYWORDS.some(k => normalized === k || normalized.includes(k))
  ) {
    return {
      category: 'calorie_macro_critical',
      isMacroCritical: true,
      isOil: false,
      isSodiumSensitive: false,
      standardName: normalized
    };
  }

  // 4. Calorie-dense pastes (Rule 1)
  if (PASTE_KEYWORDS.some(k => normalized.includes(k))) {
    return {
      category: 'calorie_macro_critical',
      isMacroCritical: true,
      isOil: false,
      isSodiumSensitive: false,
      standardName: normalized
    };
  }


  // 6. Minor Seasonings - Sodium Sensitive (Rule 2 & 3: Salt, chicken essence, MSG)
  if (
    SODIUM_SEASONING_IDS.has(normalized) ||
    SODIUM_SEASONING_KEYWORDS.some(k => normalized === k || normalized.includes(k))
  ) {
    return {
      category: 'minor_seasoning',
      isMacroCritical: false,
      isOil: false,
      isSodiumSensitive: true,
      standardName: normalized
    };
  }

  // 7. Minor Seasonings - Spices & Aromatics (Rule 2: Pepper, scallion, garlic, ginger, vinegar, wine)
  if (
    MINOR_SPICE_IDS.has(normalized) ||
    MINOR_SPICE_KEYWORDS.some(k => normalized === k || normalized.includes(k))
  ) {
    return {
      category: 'minor_seasoning',
      isMacroCritical: false,
      isOil: false,
      isSodiumSensitive: false,
      standardName: normalized
    };
  }

  // 8. Default: All other ingredients (Meat, fish, poultry, eggs, vegetables, rice, noodles, potatoes, etc.)
  // Treated as Calorie/Macro Critical.
  return {
    category: 'calorie_macro_critical',
    isMacroCritical: true,
    isOil: false,
    isSodiumSensitive: false,
    standardName: normalized
  };
}

/** Check if an ingredient is an oil/fat (never negligible) */
export function isOilIngredient(idOrName: string): boolean {
  return classifyIngredient(idOrName).isOil;
}

/** Check if an ingredient is macro-critical (must be quantified) */
export function isMacroCriticalIngredient(idOrName: string): boolean {
  return classifyIngredient(idOrName).isMacroCritical;
}

/** Check if an ingredient is a minor seasoning */
export function isMinorSeasoning(idOrName: string): boolean {
  return classifyIngredient(idOrName).category === 'minor_seasoning';
}

/** Check if an ingredient affects sodium estimation */
export function isSodiumSensitiveSeasoning(idOrName: string): boolean {
  return classifyIngredient(idOrName).isSodiumSensitive;
}
