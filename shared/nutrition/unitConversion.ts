/**
 * Deterministic Unit Conversion & Calibrated Household Kitchen Benchmarks
 *
 * Dual-track contract:
 * 1. Deterministic Mass Units (Strict mode / Verified):
 *    - g / 克 -> 1g
 *    - kg / 千克 / 公斤 -> 1000g
 *    - 斤 / 市斤 -> 500g
 *    - 两 -> 50g
 *    Returns { success: true, grams: amount * factor, isEstimated: false }
 *
 * 2. Calibrated Household Units (Estimated mode):
 *    Strictly calibrated to domestic home cooking medians (去水分校准基准):
 *    - 禽蛋类 (p_egg): 个 / 只 / 枚 -> 50g
 *    - 豆腐类 (p_tofu_silken / p_tofu_firm): 盒 / 块 -> 250g
 *    - 大蒜 (pantry_garlic): 瓣 -> 2g (去皮中等瓣实测，严禁 5g 虚高值); 头 / 个 -> 30g
 *    - 生姜 (preset_ginger): 片 -> 1g; 块 -> 8g; 段 -> 3g
 *    - 葱 (preset_scallion): 段 -> 1.5g (小葱段); 根 / 棵 / 株 -> 8g
 *    - 瓷勺 (tbsp / 汤匙 / 大勺 / 勺 / 瓷勺):
 *        食用油 -> 8g (~72 kcal, 8g 脂肪)
 *        水水类 / 调味汁 (生抽、香醋、料酒等) -> 10g
 *        颗粒 / 粉末 / 其它 -> 10g
 *    - 小勺 (tsp / 茶匙 / 小勺):
 *        食用油 -> 3g
 *        颗粒 / 盐 / 糖 -> 3g
 *    - 常见辅料形态:
 *        鲜虾/大虾/虾 (只) -> 20g
 *        鲈鱼/鱼 (条) -> 500g
 *        鸡腿 (支 / 根 / 只) -> 250g
 *        西红柿/番茄 (个) -> 150g
 *        土豆/马铃薯 (个) -> 150g
 *        青椒/菜椒 (个 / 颗) -> 100g
 *        西兰花 (约 / 朵 / 个 / 颗) -> 250g
 *        香菇 (朵 / 个) -> 20g
 *        蟹味菇/白玉菇 (盒 / 包) -> 150g; 根 -> 3g
 *        皮蛋 (个 / 枚) -> 60g
 *        咸鸭蛋 (枚 / 个) -> 65g
 *        黄瓜 (根 / 条) -> 150g
 *        小米辣 (根) -> 3g
 *    - 毫升类 (ml / 毫升):
 *        食用油 -> 0.92g/ml
 *        酱油/醋/水水类 -> 1.0g/ml
 *    Returns { success: true, grams: amount * factor, isEstimated: true }
 */

export type UnitConversionResult =
  | { success: true; grams: number; isEstimated: boolean }
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
 * Returns true if the unit has a deterministic mass conversion factor to grams.
 */
export function isConvertibleUnit(unit: string): boolean {
  if (typeof unit !== 'string') return false;
  const normalized = unit.trim().toLowerCase();
  return normalized in DETERMINISTIC_MASS_FACTORS;
}

/**
 * Helper to test if an identifier indicates cooking oil
 */
function isOilLike(identifier: string): boolean {
  const lower = identifier.toLowerCase();
  return (
    lower.includes('oil') ||
    lower.includes('油') ||
    lower === 'pantry_oil' ||
    lower === 'preset_sesame_oil'
  );
}

/**
 * Helper to resolve household piece/spoon units given ingredient context.
 */
function resolveCalibratedGramsPerUnit(
  unit: string,
  identifier: string
): number | null {
  const normUnit = unit.trim().toLowerCase();
  const idLower = identifier.trim().toLowerCase();

  // 1. 大勺 / 瓷勺 / 汤匙 / tbsp
  if (['tbsp', '大勺', '汤匙', '勺', '瓷勺', '大匙'].includes(normUnit)) {
    if (isOilLike(idLower)) {
      return 8; // 食用油 1 瓷勺 = 8g (~72 kcal)
    }
    return 10; // 生抽/香醋/料酒/粉末 1 瓷勺 = 10g
  }

  // 2. 小勺 / 茶匙 / tsp
  if (['tsp', '小勺', '茶匙', '小匙'].includes(normUnit)) {
    if (isOilLike(idLower)) {
      return 3; // 食用油 1 小勺 = 3g
    }
    return 3; // 盐/糖等颗粒 1 小勺 = 3g
  }

  // 3. 毫升 / ml 估算
  if (normUnit === 'ml' || normUnit === '毫升') {
    if (isOilLike(idLower)) {
      return 0.92; // 食用油密度 0.92 g/ml
    }
    return 1.0; // 液体酱汁/醋/水密度按 1.0 g/ml 计
  }

  // 4. 食材形态专有换算 (按去水分厨房中位数)
  // 禽蛋类 (p_egg, 鸡蛋, 蛋)
  if (idLower.includes('egg') || idLower.includes('蛋')) {
    if (idLower.includes('century') || idLower.includes('preserved') || idLower.includes('皮蛋') || idLower.includes('松花蛋')) {
      if (['个', '枚', '只'].includes(normUnit)) return 60;
    }
    if (idLower.includes('salted') || idLower.includes('咸鸭蛋') || idLower.includes('咸蛋')) {
      if (['枚', '个', '只'].includes(normUnit)) return 65;
    }
    if (['个', '只', '枚'].includes(normUnit)) {
      return 50; // 鸡蛋标准生重 50g
    }
  }

  // 豆腐类 (嫩豆腐、内酯豆腐、老豆腐)
  if (idLower.includes('tofu') || idLower.includes('豆腐')) {
    if (['盒', '块', '包'].includes(normUnit)) {
      return 250; // 标准盒装内酯/嫩豆腐 250g
    }
  }

  // 大蒜 (pantry_garlic, 蒜, 大蒜, 蒜瓣)
  if (idLower.includes('garlic') || idLower.includes('蒜')) {
    if (['瓣'].includes(normUnit)) {
      return 2; // 去皮中等蒜瓣实测中位数 2g (严禁采用 5g 虚高值)
    }
    if (['个', '头'].includes(normUnit)) {
      return 30; // 整头大蒜约 30g
    }
  }

  // 生姜 (preset_ginger, 姜, 生姜)
  if (idLower.includes('ginger') || idLower.includes('姜')) {
    if (['片'].includes(normUnit)) {
      return 1; // 爆锅薄姜片 1g
    }
    if (['块'].includes(normUnit)) {
      return 8; // 小老姜块 8g
    }
    if (['段'].includes(normUnit)) {
      return 3;
    }
    if (['粒'].includes(normUnit)) {
      return 2;
    }
  }

  // 葱 (preset_scallion, 葱, 小葱, 大葱, 香葱)
  if (idLower.includes('scallion') || idLower.includes('葱')) {
    if (['段'].includes(normUnit)) {
      return 1.5; // 指节长小葱段 1.5g
    }
    if (['根', '棵', '株'].includes(normUnit)) {
      return 8; // 小葱 1 根约 8g
    }
  }

  // 鲜虾 / 大虾 / 虾仁
  if (idLower.includes('shrimp') || idLower.includes('prawn') || idLower.includes('虾')) {
    if (['只', '个', '条'].includes(normUnit)) {
      return 20; // 中等海虾 1 只整虾约 20g
    }
  }

  // 鲈鱼 / 鱼类
  if (idLower.includes('fish') || idLower.includes('bass') || idLower.includes('鲈鱼') || idLower.includes('鱼')) {
    if (['条', '尾', '条鲈鱼'].includes(normUnit) || normUnit.includes('条')) {
      return 500; // 一条家常清蒸鲜鲈鱼标准重量 500g
    }
  }

  // 鸡腿 (去骨纯鸡肉可食部中位数)
  if (idLower.includes('chicken_leg') || idLower.includes('鸡腿') || idLower.includes('手枪腿')) {
    if (['支', '根', '只', '个'].includes(normUnit)) {
      return 160; // 纯可食部去骨鸡肉克重约 160g (150-180g 厨房合理配比)
    }
  }

  // 西红柿 / 番茄
  if (idLower.includes('tomato') || idLower.includes('西红柿') || idLower.includes('番茄') || idLower.includes('蕃茄')) {
    if (['个', '只'].includes(normUnit)) {
      return 150; // 中等大小番茄 1 个约 150g
    }
  }

  // 土豆 / 马铃薯
  if (idLower.includes('potato') || idLower.includes('土豆') || idLower.includes('马铃薯')) {
    if (['个'].includes(normUnit)) {
      return 150; // 中等大小土豆 1 个约 150g
    }
  }

  // 青椒 / 菜椒 / 甜椒
  if (idLower.includes('pepper') || idLower.includes('青椒') || idLower.includes('菜椒') || idLower.includes('柿子椒')) {
    if (idLower.includes('millet') || idLower.includes('小米辣') || idLower.includes('辣椒圈')) {
      if (['根', '个'].includes(normUnit)) return 3;
    }
    if (['个', '颗', '只'].includes(normUnit)) {
      return 100; // 普通青椒 1 个约 100g
    }
  }

  // 西兰花
  if (idLower.includes('broccoli') || idLower.includes('西兰花') || idLower.includes('西蓝花')) {
    if (['约', '朵', '个', '颗', '棵'].includes(normUnit)) {
      return 250; // 标准半颗至整颗家常炒制西兰花约 250g
    }
  }

  // 香菇
  if (idLower.includes('shiitake') || idLower.includes('香菇')) {
    if (['朵', '个'].includes(normUnit)) {
      return 20; // 鲜香菇 1 朵约 20g
    }
  }

  // 蟹味菇 / 白玉菇 / 其他真姬菇
  if (idLower.includes('shimeji') || idLower.includes('beech') || idLower.includes('蟹味菇') || idLower.includes('白玉菇')) {
    if (['盒', '包', '袋'].includes(normUnit)) {
      return 150; // 超市标准盒装蟹味菇/白玉菇 150g
    }
    if (['根'].includes(normUnit)) {
      return 3;
    }
  }

  // 黄瓜
  if (idLower.includes('cucumber') || idLower.includes('黄瓜') || idLower.includes('青瓜')) {
    if (['根', '条'].includes(normUnit)) {
      return 150; // 家常普通黄瓜 1 根约 150g
    }
  }

  return null;
}

/**
 * Converts a given amount and unit into grams.
 *
 * Behavior:
 * - If unit matches standard mass units (g, kg, 斤, 两):
 *   Returns { success: true, grams: amount * factor, isEstimated: false }
 * - If unit matches calibrated household table AND ingredientIdentifier is provided:
 *   Returns { success: true, grams: amount * calibratedGrams, isEstimated: true }
 * - Otherwise:
 *   Returns { success: false, reason: string }
 */
export function convertToGrams(
  amount: number,
  unit: string,
  ingredientIdentifier?: string
): UnitConversionResult {
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

  // 1. Strict deterministic mass unit check
  const factor = DETERMINISTIC_MASS_FACTORS[normalized];
  if (factor !== undefined) {
    return {
      success: true,
      grams: amount * factor,
      isEstimated: false
    };
  }

  // 2. Calibrated household unit check (requires ingredient context)
  if (ingredientIdentifier) {
    const calibratedFactor = resolveCalibratedGramsPerUnit(normalized, ingredientIdentifier);
    if (calibratedFactor !== null && calibratedFactor > 0) {
      return {
        success: true,
        grams: amount * calibratedFactor,
        isEstimated: true
      };
    }
  }

  return {
    success: false,
    reason: `Unconvertible unit: "${unit}". FitBite C.2.2 only supports deterministic mass units (g, kg, 斤, 两) or calibrated household units.`
  };
}
