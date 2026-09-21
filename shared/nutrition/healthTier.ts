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
 * 判定菜谱热量梯队
 * 1. lean_choice（减脂优选）：
 *    - calories <= 350 kcal 且 脂肪供能比 <= 35%（或轻食 <= 200 kcal）
 * 2. cheat_or_share（高能/建议分食）：
 *    - calories > 550 kcal 或 脂肪量 > 25g
 * 3. balanced（家常均衡）：
 *    - 其余区间（350 < calories <= 550 且 脂肪量 <= 25g）
 */
export function getCalorieTier(
  nutrition?: RecipeNutritionLike | null,
  fallbackCalories?: number | null
): CalorieTier {
  const calories = (typeof nutrition?.calories === 'number' ? nutrition.calories : null) ?? fallbackCalories ?? 0;
  const fat = (typeof nutrition?.fat === 'number' ? nutrition.fat : null) ?? 0;

  // 1. 高能量/高脂肪优先归入 cheat_or_share
  if (calories > 550 || fat > 25) {
    return 'cheat_or_share';
  }

  // 2. 轻食或低脂优选
  if (calories > 0) {
    const fatEnergy = fat * 9;
    const fatEnergyRatio = (fatEnergy / calories) * 100;

    if (calories <= 200 || (calories <= 350 && fatEnergyRatio <= 35)) {
      return 'lean_choice';
    }
  }

  // 3. 默认家常均衡
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
