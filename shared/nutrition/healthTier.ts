export type CalorieTier = 'lean_choice' | 'balanced' | 'cheat_or_share';

export interface RecipeNutritionLike {
  calories?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
  confidence?: string;
  calorieRange?: [number, number];
}

export interface CalorieTierInfo {
  tier: CalorieTier;
  label: string;
  badgeClass: string;
  description: string;
}

export const CALORIE_TIER_CONFIG: Record<CalorieTier, CalorieTierInfo> = {
  lean_choice: {
    tier: 'lean_choice',
    label: '减脂优选',
    badgeClass: 'health-badge-lean',
    description: '低卡轻盈，三大营养素供能比均衡'
  },
  balanced: {
    tier: 'balanced',
    label: '家常均衡',
    badgeClass: 'health-badge-balanced',
    description: '能量适中，适合家常正餐'
  },
  cheat_or_share: {
    tier: 'cheat_or_share',
    label: '建议分食 / 高能量',
    badgeClass: 'health-badge-warning',
    description: '能量或脂肪较高，建议与家人分食或参考改良建议'
  }
};

/**
 * 严禁分配“减脂优选”的重油重糖传统菜品与技法黑名单关键词 (C.1.3 强规则一票否决)
 */
export const LEAN_CHOICE_BLACKLIST_KEYWORDS = [
  '油焖',
  '油炸',
  '炸',
  '干锅',
  '拔丝',
  '脆皮',
  '红烧',
  '高糖红烧',
  '锅包',
  '扣肉',
  '东坡'
];

export interface RecipeMetaForTier {
  name?: string;
  cookingMethod?: string | null;
  tags?: string[];
}

export function isLeanChoiceBlacklisted(
  meta?: RecipeMetaForTier | string | null
): boolean {
  if (!meta) return false;
  const text = typeof meta === 'string'
    ? meta
    : `${meta.name || ''} ${meta.cookingMethod || ''} ${(meta.tags || []).join(' ')}`;
  
  return LEAN_CHOICE_BLACKLIST_KEYWORDS.some(kw => text.includes(kw));
}

/**
 * 判定菜谱热量梯队与健康标签
 * 
 * 核心护栏与双红线规则：
 * 1. cheat_or_share（高能/建议分食）：
 *    - calories > 550 kcal 或 脂肪量 > 25g
 * 2. 规则一（技法一票否决）：
 *    - 凡是菜品名或主要技法包含“油焖、油炸、干锅、拔丝、脆皮、高糖红烧”的传统菜肴，直接封杀，严禁分配“减脂优选”。
 * 3. 规则二（营养阈值红线）：
 *    - 单份总热量必须 <= 350 kcal 且 脂肪供能比 < 35%（超低卡轻食 <= 200 kcal 且 脂肪总量 <= 10g 亦受极低总热量保护）
 *    - 必须同时满足阈值且不在黑名单内，方可被打标为“减脂优选”。
 * 4. balanced（家常均衡）：
 *    - 其余区间（包括黑名单中热量适中者、清炒蔬菜因用油导致脂肪比超标者等）
 */
export function getCalorieTier(
  nutrition?: RecipeNutritionLike | null,
  fallbackCalories?: number | null,
  recipeMeta?: RecipeMetaForTier | string | null
): CalorieTier {
  const calories = (typeof nutrition?.calories === 'number' ? nutrition.calories : null) ?? fallbackCalories ?? 0;
  const fat = (typeof nutrition?.fat === 'number' ? nutrition.fat : null) ?? 0;

  // 1. 高能量/高脂肪优先归入 cheat_or_share
  if (calories > 550 || fat > 25) {
    return 'cheat_or_share';
  }

  // 2. 规则一：技法与菜名一票否决黑名单判断
  const isBlacklisted = isLeanChoiceBlacklisted(recipeMeta);

  // 3. 规则二：营养阈值红线（严禁重油重糖菜品进入）
  if (calories > 0 && !isBlacklisted) {
    const fatEnergy = fat * 9;
    const fatEnergyRatio = (fatEnergy / calories) * 100;

    // A) 减脂标准：calories <= 350 kcal 且 脂肪供能比 < 35%
    // B) 超低热量清淡保护：calories <= 200 kcal 且 脂肪绝对克数 <= 10g（避免如西兰花淋10ml油导致脂肪超标仍被误标）
    if (
      (calories <= 350 && fatEnergyRatio < 35) ||
      (calories <= 200 && fat <= 10 && fatEnergyRatio <= 60)
    ) {
      return 'lean_choice';
    }
  }

  // 4. 默认家常均衡
  return 'balanced';
}

export interface RecipeWithIngredients {
  id?: string;
  name: string;
  requiredIngredients?: Array<{ id?: string; name: string }>;
  pantryIngredients?: string[];
  cookingMethod?: string;
  nutrition?: RecipeNutritionLike | null;
  calories?: number | null;
}

/**
 * 减脂烹饪改良小贴士生成器 (仅针对 cheat_or_share 菜谱)
 */
export function getHealthGuidanceTips(recipe: RecipeWithIngredients): string[] {
  const tier = getCalorieTier(recipe.nutrition, recipe.calories);
  if (tier !== 'cheat_or_share') {
    return [];
  }

  const tips: string[] = [];
  const req = recipe.requiredIngredients || [];
  const pantry = recipe.pantryIngredients || [];

  // 1. 控油喷雾小贴士 (针对炒、炸、煎或高油脂用量)
  const isOilHeavy =
    pantry.includes('pantry_oil') ||
    pantry.includes('preset_sesame_oil') ||
    recipe.cookingMethod === '炒' ||
    recipe.cookingMethod === '炸' ||
    recipe.cookingMethod === '煎' ||
    Boolean(recipe.nutrition?.fat && recipe.nutrition.fat >= 20);

  if (isOilHeavy) {
    tips.push('💡 减脂改良建议：改宽油为不粘锅控油喷雾（控制在 5-8g 内），热量可立减约 100+ kcal。');
  }

  // 2. 坚果/花生减半小贴士
  const hasPeanutsOrNuts = req.some(
    i => i.id === 'other_peanut' || i.name.includes('花生') || i.name.includes('坚果') || i.name.includes('腰果')
  );
  if (hasPeanutsOrNuts) {
    tips.push('💡 减脂改良建议：坚果/油炸花生减半使用，可再降约 60-80 kcal。');
  }

  // 3. 高脂肉类替代小贴士
  const hasFattyMeat = req.some(
    i => i.id === 'p_pork_belly' || i.name.includes('五花肉') || i.name.includes('肥肉') || i.name.includes('肥牛')
  );
  if (hasFattyMeat) {
    tips.push('💡 减脂改良建议：选用瘦肉或去皮鸡腿肉替代，显著降低饱和脂肪。');
  }

  // 通用兜底贴士（若上述特定规则未命中）
  if (tips.length === 0) {
    tips.push('💡 减脂改良建议：主食搭配建议减半，并增加一份焯水绿叶蔬菜以平衡单餐热量。');
  }

  return tips;
}
