/**
 * Pantry Seasonings Dictionary & Mapper for Pipeline (C.1.1)
 *
 * Categorizes seasonings and pantry ingredients into FitBite's standard pantry IDs.
 */

export interface PantryDefinition {
  id: string;
  name: string;
  aliases: string[];
}

export const PANTRY_CATALOG: PantryDefinition[] = [
  { id: 'pantry_oil', name: '食用油', aliases: ['食用油', '油', '植物油', '花生油', '菜籽油', '玉米油', '橄榄油', '猪油', '色拉油'] },
  { id: 'pantry_salt', name: '食盐', aliases: ['食盐', '盐', '精盐', '细盐', '食用盐'] },
  { id: 'pantry_soy_sauce', name: '生抽', aliases: ['生抽', '酱油', '生抽酱油', '味极鲜', '一品鲜', '老抽'] },
  { id: 'pantry_garlic', name: '大蒜', aliases: ['大蒜', '蒜', '蒜瓣', '蒜末', '蒜泥', '蒜蓉', '大蒜瓣', '大蒜末'] },
  { id: 'pantry_black_pepper', name: '黑胡椒', aliases: ['黑胡椒', '白胡椒', '胡椒粉', '黑胡椒粉', '白胡椒粉'] },
  { id: 'preset_chicken_essence', name: '鸡精', aliases: ['鸡精', '鸡粉', '蘑菇精', '蔬之鲜'] },
  { id: 'preset_ginger', name: '生姜', aliases: ['生姜', '姜', '老姜', '姜片', '姜丝', '姜末'] },
  { id: 'preset_starch', name: '淀粉', aliases: ['淀粉', '玉米淀粉', '生粉', '水淀粉', '太白粉', '红薯淀粉'] },
  { id: 'preset_cooking_wine', name: '料酒', aliases: ['料酒', '黄酒', '绍兴酒', '烹调料酒', '白酒'] },
  { id: 'preset_vinegar', name: '香醋', aliases: ['香醋', '白醋', '陈醋', '米醋', '镇江香醋', '香醋（陈醋）', '醋'] },
  { id: 'preset_sugar', name: '白糖', aliases: ['白糖', '糖', '白砂糖', '冰糖', '绵白糖', '砂糖'] },
  { id: 'preset_oyster_sauce', name: '蚝油', aliases: ['蚝油'] },
  { id: 'preset_scallion', name: '葱花', aliases: ['葱花', '葱', '大葱', '小葱', '香葱', '葱段', '葱白', '葱丝'] },
  { id: 'preset_star_anise', name: '八角', aliases: ['八角', '大料', '八角茴香'] },
  { id: 'preset_sichuan_pepper', name: '花椒', aliases: ['花椒', '花椒粉', '花椒粒', '花椒油', '青花椒', '麻椒'] },
  { id: 'preset_sesame_oil', name: '芝麻油', aliases: ['芝麻油', '香油', '麻油'] },
  { id: 'preset_cumin', name: '孜然', aliases: ['孜然', '孜然粉', '孜然粒'] },
  { id: 'preset_chili_powder', name: '辣椒粉', aliases: ['辣椒粉', '干辣椒', '辣椒面', '辣椒碎', '辣椒油', '红油', '小米椒', '小米辣', '二荆条', '香辣酱', '蒜蓉辣酱', '油泼辣子', '辣椒'] },
  { id: 'preset_doubanjiang', name: '豆瓣酱', aliases: ['豆瓣酱', '郫县豆瓣酱', '红油豆瓣酱'] },
  { id: 'preset_ketchup', name: '番茄酱', aliases: ['番茄酱', '番茄沙司', '番茄汁'] },
  { id: 'preset_steamed_fish_soy_sauce', name: '蒸鱼豉油', aliases: ['蒸鱼豉油', '豉油'] }
];

// 建立精确匹配映射表
const aliasToPantry = new Map<string, PantryDefinition>();

PANTRY_CATALOG.forEach(p => {
  aliasToPantry.set(p.name, p);
  aliasToPantry.set(p.id, p);
  p.aliases.forEach(alias => {
    aliasToPantry.set(alias, p);
  });
});

/**
 * 判断是否为厨房工具或器皿（非食材）
 */
export function isKitchenTool(rawText: string): boolean {
  const cleaned = rawText.trim().replace(/^[-*•]\s*/, '');
  return /(刀|水果刀|菜刀|锅|炒锅|蒸锅|平底锅|砂锅|电饭煲|烤箱|空气炸锅|微波炉|保鲜膜|保鲜袋|牙签|厨房纸|料理机|搅拌棒|漏勺|滤网|蒸架|砧板|案板|擦丝器|厨房秤|量杯|蒸笼)/.test(cleaned);
}

/**
 * 判断是否为水或无意义的烹饪辅助物（如水、冷水、饮用水、开水）
 */
export function isWaterOrIgnored(rawText: string): boolean {
  const cleaned = rawText.trim().replace(/^[-*•]\s*/, '').replace(/[（(][^）)]*[）)]/g, '');
  return /^(水|饮用水|开水|温水|冷水|凉白开|凉白开水|清水|自来水)$/.test(cleaned.trim());
}

/**
 * 解析并匹配调料/常备食材定义
 */
export function resolvePantry(rawText: string): PantryDefinition | null {
  // 过滤水等基础介质
  if (isWaterOrIgnored(rawText)) {
    return null;
  }

  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^[-*•]\s*/, '');
  cleaned = cleaned.replace(/[（(][^）)]*[）)]/g, '');
  cleaned = cleaned.replace(/\s*\d+(\.\d+)?\s*(g|kg|ml|克|千克|毫升|个|只|条|根|朵|瓣|盒|块|包).*$/i, '');
  cleaned = cleaned.trim();

  if (aliasToPantry.has(cleaned)) {
    return aliasToPantry.get(cleaned)!;
  }

  // 子串智能匹配（优先最长匹配）
  let matched: PantryDefinition | null = null;
  let maxMatchedLen = 0;

  for (const [alias, def] of aliasToPantry.entries()) {
    if (cleaned.includes(alias) && alias.length > maxMatchedLen) {
      matched = def;
      maxMatchedLen = alias.length;
    }
  }

  return matched;
}
