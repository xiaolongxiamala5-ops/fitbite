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
      if (['个', '枚', '只', '颗'].includes(normUnit)) return 60;
    }
    if (idLower.includes('salted') || idLower.includes('咸鸭蛋') || idLower.includes('咸蛋')) {
      if (['枚', '个', '只', '颗'].includes(normUnit)) return 65;
    }
    if (['个', '只', '枚', '颗'].includes(normUnit)) {
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

  // 生蚝 / 牡蛎
  if (idLower.includes('oyster') || idLower.includes('生蚝') || idLower.includes('牡蛎')) {
    if (['个', '只', '枚'].includes(normUnit)) {
      return 65; // 带壳生蚝 1 个约 65g
    }
  }

  // 鲈鱼 / 鱼类
  if (idLower.includes('fish') || idLower.includes('bass') || idLower.includes('鲈鱼') || idLower.includes('鳕鱼') || idLower.includes('鱼')) {
    if (['条', '尾', '条鲈鱼'].includes(normUnit) || normUnit.includes('条')) {
      return 500; // 一条家常清蒸鲜鲈鱼标准重量 500g
    }
    if (['片', '块', '柳'].includes(normUnit)) {
      return 200; // 鱼片/鱼排/鱼柳每片约 200g (鳕鱼片 2 片约 400g)
    }
  }

  // 猪肉 / 五花肉
  if (idLower.includes('pork') || idLower.includes('五花肉') || idLower.includes('瘦肉') || idLower.includes('肉')) {
    if (['片'].includes(normUnit)) {
      return 10; // 五花肉薄片 1 片约 10g
    }
    if (['块'].includes(normUnit)) {
      return 30; // 炖肉块 1 块约 30g
    }
  }

  // 鸡腿 (去骨纯鸡肉可食部中位数)
  if (idLower.includes('chicken_leg') || idLower.includes('鸡腿') || idLower.includes('手枪腿')) {
    if (['支', '根', '只', '个'].includes(normUnit)) {
      return 160; // 纯可食部去骨鸡肉克重约 160g (150-180g 厨房合理配比)
    }
  }

  // 花生米
  if (idLower.includes('peanut') || idLower.includes('花生')) {
    if (['颗', '粒'].includes(normUnit)) {
      return 2; // 花生仁 1 粒约 2g
    }
    if (['把'].includes(normUnit)) {
      return 30;
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

  // 洋葱
  if (idLower.includes('onion') || idLower.includes('洋葱') || idLower.includes('圆葱')) {
    if (['个', '颗', '只'].includes(normUnit)) {
      return 150; // 中等大小洋葱 1 个约 150g
    }
  }

  // 包菜 / 卷心菜 / 圆白菜 / 结球甘蓝
  if (idLower.includes('cabbage') || idLower.includes('包菜') || idLower.includes('卷心菜') || idLower.includes('圆白菜') || idLower.includes('甘蓝')) {
    if (['颗', '个', '只'].includes(normUnit)) {
      return 500; // 一颗普通包菜约 500g
    }
  }

  // 娃娃菜
  if (idLower.includes('baby_cabbage') || idLower.includes('娃娃菜')) {
    if (['颗', '棵', '袋', '包', '个'].includes(normUnit)) {
      return 200; // 一棵中等娃娃菜约 200g
    }
    if (['片', '叶'].includes(normUnit)) {
      return 15; // 娃娃菜叶 1 片约 15g
    }
  }

  // 生菜
  if (idLower.includes('lettuce') || idLower.includes('生菜')) {
    if (['颗', '棵', '个'].includes(normUnit)) {
      return 200; // 一棵中等生菜约 200g
    }
    if (['片', '叶'].includes(normUnit)) {
      return 10; // 单片生菜叶约 10g
    }
  }

  // 油麦菜
  if (idLower.includes('youmaicai') || idLower.includes('油麦菜')) {
    if (['颗', '棵', '把', '扎'].includes(normUnit)) {
      return 200; // 一棵油麦菜约 200g
    }
  }

  // 菠菜 / 空心菜
  if (idLower.includes('spinach') || idLower.includes('菠菜') || idLower.includes('空心菜')) {
    if (['把', '扎', '捆', '棵', '颗'].includes(normUnit)) {
      return 250; // 一把绿叶蔬菜约 250g
    }
  }

  // 青菜 / 小白菜 / 油菜
  if (idLower.includes('bok_choy') || idLower.includes('青菜') || idLower.includes('油菜') || idLower.includes('小白菜')) {
    if (['颗', '棵', '株', '根'].includes(normUnit)) {
      return 30; // 单棵小青菜约 30g
    }
    if (['把', '扎'].includes(normUnit)) {
      return 200;
    }
  }

  // 菜花 / 花菜
  if (idLower.includes('cauliflower') || idLower.includes('花菜') || idLower.includes('菜花')) {
    if (['约', '朵', '个', '颗', '棵'].includes(normUnit)) {
      return 300; // 炒制花菜约 300g
    }
  }

  // 西葫芦
  if (idLower.includes('zucchini') || idLower.includes('西葫芦')) {
    if (['根', '个', '只'].includes(normUnit)) {
      return 200; // 1 根西葫芦约 200g
    }
  }

  // 冬瓜
  if (idLower.includes('winter_melon') || idLower.includes('冬瓜')) {
    if (['块', '片', '圈'].includes(normUnit)) {
      return 200; // 1 块冬瓜约 200g
    }
  }

  // 南瓜
  if (idLower.includes('pumpkin') || idLower.includes('南瓜')) {
    if (['块', '个'].includes(normUnit)) {
      return 300; // 1 块蒸南瓜约 300g
    }
  }

  // 蒜苔
  if (idLower.includes('garlic_moss') || idLower.includes('蒜苔') || idLower.includes('蒜薹')) {
    if (['扎', '把', '捆'].includes(normUnit)) {
      return 190; // 1 扎蒜苔约 190g
    }
    if (['根'].includes(normUnit)) {
      return 10;
    }
  }

  // 莴笋
  if (idLower.includes('asparagus_lettuce') || idLower.includes('莴笋') || idLower.includes('莴苣')) {
    if (['根', '个', '条'].includes(normUnit)) {
      return 350; // 1 根中等莴笋削皮去叶净重约 350g
    }
  }

  // 糖类 / 冰糖
  if (idLower.includes('sugar') || idLower.includes('糖')) {
    if (['粒', '块', '个'].includes(normUnit)) {
      return 5; // 烹饪冰糖 1 粒/小块约 5g
    }
  }

  // 大米 / 米
  if (idLower.includes('rice') || idLower.includes('米') || idLower.includes('大米')) {
    if (['ml', '毫升'].includes(normUnit)) {
      return 0.85; // 生大米密度约 0.85 g/ml (150ml ~ 128g)
    }
  }

  // 菜心 / 菜薹
  if (idLower.includes('choy_sum') || idLower.includes('菜心') || idLower.includes('菜薹')) {
    if (['颗', '棵', '根', '株', '把'].includes(normUnit)) {
      return 25; // 单棵菜心约 25g
    }
  }

  // 芹菜
  if (idLower.includes('celery') || idLower.includes('芹菜')) {
    if (['根', '棵', '株', '段'].includes(normUnit)) {
      return 15; // 芹菜 1 根约 15g
    }
  }

  // 尖椒 / 辣椒 / 小米辣 / 螺丝椒 / 线椒
  if (idLower.includes('hot_pepper') || idLower.includes('尖椒') || idLower.includes('线椒') || idLower.includes('螺丝椒') || idLower.includes('小米辣') || idLower.includes('小米椒') || idLower.includes('野山椒') || idLower.includes('朝天椒')) {
    if (idLower.includes('millet') || idLower.includes('小米辣') || idLower.includes('小米椒') || idLower.includes('野山椒') || idLower.includes('朝天椒')) {
      if (['根', '个', '条', '支', '粒'].includes(normUnit)) return 3; // 鲜小米辣 1 根约 3g
    }
    if (['根', '个', '条', '支'].includes(normUnit)) {
      return 15; // 鲜尖椒/二荆条 1 根约 15g
    }
  }

  // 青椒 / 菜椒 / 甜椒
  if (idLower.includes('pepper') || idLower.includes('青椒') || idLower.includes('菜椒') || idLower.includes('柿子椒')) {
    if (idLower.includes('millet') || idLower.includes('小米辣') || idLower.includes('辣椒圈') || idLower.includes('野山椒')) {
      if (['根', '个', '条', '支'].includes(normUnit)) return 3;
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
    if (['朵', '个', '粒'].includes(normUnit)) {
      return 15; // 泡发干香菇/鲜香菇 1 朵/粒约 15g
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

  // =================== Cooklang English unit support ===================

  // 升 / litre
  if (['l'].includes(normUnit)) {
    if (isOilLike(idLower)) {
      return 920; // 油 1L ≈ 920g
    }
    return 1000; // 液体 1L = 1000g
  }

  // 蒜瓣 / clove
  if (['clove', '瓣'].includes(normUnit)) {
    if (idLower.includes('garlic') || idLower.includes('蒜')) {
      return 2; // 去皮中等蒜瓣 2g
    }
  }

  // 包 / packet (标准食材包)
  if (['packet', '包'].includes(normUnit)) {
    return 200; // 标准冷冻蔬菜包约 200g
  }

  // 枝 / sprig (香草小枝)
  if (['sprigs', 'sprig', '枝'].includes(normUnit)) {
    return 5; // 迷迭香/百里香 1 小枝约 5g
  }

  // 把 / bunch (香草束)
  if (['bunch', '把'].includes(normUnit)) {
    if (idLower.includes('herb') || idLower.includes('香') || idLower.includes('parsley') || idLower.includes('rosemary') || idLower.includes('thyme') || idLower.includes('迷迭香') || idLower.includes('百里香') || idLower.includes('欧芹')) {
      return 25; // 小把香草约 25g
    }
  }

  // 片 / slice (面包/奶酪片)
  if (['slices', 'slice', '片'].includes(normUnit)) {
    if (idLower.includes('bread') || idLower.includes('面包') || idLower.includes('ciabatta') || idLower.includes('cheese') || idLower.includes('奶酪')) {
      return 30; // 面包/奶酪 1 片约 30g
    }
  }

  // 罐 / tin (标准罐头)
  if (['tin', '罐'].includes(normUnit)) {
    return 400; // 标准番茄罐头约 400g
  }

  // 大个 / large (大号食材单件)
  if (['large', '大'].includes(normUnit)) {
    if (idLower.includes('potato') || idLower.includes('土豆')) {
      return 200; // 大土豆 1 个约 200g
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
