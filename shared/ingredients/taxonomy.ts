import { CanonicalDefinition } from './types';

export interface DisambiguationPill {
  name: string;
  canonicalId: string;
}

export interface HypernymDefinition extends CanonicalDefinition {
  children: string[];
  disambiguationPills: DisambiguationPill[];
}

/**
 * 食材上位词分类与层级拓扑定义 (SSOT)
 */
export const HYPERNYM_DEFINITIONS: HypernymDefinition[] = [
  // 1. 鱼类
  {
    id: 'p_fish_generic',
    slug: 'fish_generic',
    name: '鱼',
    category: 'protein',
    aliases: ['鱼', '海鲜', '海鱼', '河鱼', '鲜鱼', '鱼肉', '生鱼', '活鱼'],
    children: [
      'p_fish_seabass',
      'p_fish_grass_carp',
      'p_fish_salmon',
      'p_fish_basa'
    ],
    disambiguationPills: [
      { name: '鲈鱼', canonicalId: 'p_fish_seabass' },
      { name: '草鱼', canonicalId: 'p_fish_grass_carp' },
      { name: '三文鱼', canonicalId: 'p_fish_salmon' },
      { name: '巴沙鱼', canonicalId: 'p_fish_basa' }
    ]
  },
  // 2. 虾类 ('虾' | '鲜虾' | '大虾': ['基围虾', '虾仁', '对虾', '白对虾'])
  {
    id: 'p_shrimp_generic',
    slug: 'shrimp_generic',
    name: '虾',
    category: 'protein',
    aliases: ['虾', '鲜虾', '大虾'],
    children: [
      'p_shrimp_whole',
      'p_shrimp_peeled'
    ],
    disambiguationPills: [
      { name: '基围虾', canonicalId: 'p_shrimp_whole' },
      { name: '虾仁', canonicalId: 'p_shrimp_peeled' },
      { name: '对虾', canonicalId: 'p_shrimp_whole' },
      { name: '白对虾', canonicalId: 'p_shrimp_whole' }
    ]
  },
  // 3. 鸡肉类 ('鸡' | '鸡肉': ['鸡胸肉', '鸡腿肉', '鸡翅', '鸡爪'])
  {
    id: 'p_chicken_generic',
    slug: 'chicken_generic',
    name: '鸡',
    category: 'protein',
    aliases: ['鸡', '鸡肉'],
    children: [
      'p_chicken_breast',
      'p_chicken_leg',
      'p_chicken_wing',
      'p_chicken_feet'
    ],
    disambiguationPills: [
      { name: '鸡胸肉', canonicalId: 'p_chicken_breast' },
      { name: '鸡腿肉', canonicalId: 'p_chicken_leg' },
      { name: '鸡翅', canonicalId: 'p_chicken_wing' },
      { name: '鸡爪', canonicalId: 'p_chicken_feet' }
    ]
  },
  // 4. 牛肉类 ('牛' | '牛肉': ['牛里脊', '牛腩', '肥牛片', '牛排'])
  {
    id: 'p_beef_generic',
    slug: 'beef_generic',
    name: '牛肉',
    category: 'protein',
    aliases: ['牛', '牛肉'],
    children: [
      'p_beef'
    ],
    disambiguationPills: [
      { name: '牛里脊', canonicalId: 'p_beef' },
      { name: '牛腩', canonicalId: 'p_beef' },
      { name: '肥牛片', canonicalId: 'p_beef' },
      { name: '牛排', canonicalId: 'p_beef' }
    ]
  },
  // 5. 猪肉类 ('猪肉' | '肉': ['猪里脊', '五花肉', '肉末', '排骨'])
  {
    id: 'p_pork_generic',
    slug: 'pork_generic',
    name: '猪肉',
    category: 'protein',
    aliases: ['猪肉', '肉', '肉类', '鲜肉', '生肉'],
    children: [
      'p_pork_belly',
      'p_pork_lean',
      'p_pork_minced',
      'p_pork_ribs'
    ],
    disambiguationPills: [
      { name: '猪里脊', canonicalId: 'p_pork_lean' },
      { name: '五花肉', canonicalId: 'p_pork_belly' },
      { name: '肉末', canonicalId: 'p_pork_minced' },
      { name: '排骨', canonicalId: 'p_pork_ribs' },
      { name: '里脊肉', canonicalId: 'p_pork_lean' }
    ]
  },
  // 6. 蛋类 ('蛋': ['鸡蛋', '鸭蛋', '鹌鹑蛋'])
  {
    id: 'p_egg_generic',
    slug: 'egg_generic',
    name: '蛋',
    category: 'protein',
    aliases: ['蛋', '蛋类', '禽蛋'],
    children: [
      'p_egg',
      'p_salted_duck_egg',
      'p_preserved_egg',
      'p_duck_egg',
      'p_quail_egg'
    ],
    disambiguationPills: [
      { name: '鸡蛋', canonicalId: 'p_egg' },
      { name: '鸭蛋', canonicalId: 'p_duck_egg' },
      { name: '鹌鹑蛋', canonicalId: 'p_quail_egg' }
    ]
  },
  // 7. 豆腐豆制品 ('豆腐': ['嫩豆腐', '老豆腐', '内酯豆腐', '冻豆腐'])
  {
    id: 'p_tofu_generic',
    slug: 'tofu_generic',
    name: '豆腐',
    category: 'protein',
    aliases: ['豆腐', '大豆豆腐', '鲜豆腐'],
    children: [
      'p_tofu_silken',
      'p_tofu_firm',
      'p_tofu_frozen'
    ],
    disambiguationPills: [
      { name: '嫩豆腐', canonicalId: 'p_tofu_silken' },
      { name: '老豆腐', canonicalId: 'p_tofu_firm' },
      { name: '内酯豆腐', canonicalId: 'p_tofu_silken' },
      { name: '冻豆腐', canonicalId: 'p_tofu_frozen' }
    ]
  },
  // 8. 菇类 ('蘑菇' | '菌菇' | '菇': ['香菇', '金针菇', '杏鲍菇', '口蘑'])
  {
    id: 'v_mushroom_generic',
    slug: 'mushroom_generic',
    name: '蘑菇',
    category: 'vegetable',
    aliases: ['蘑菇', '菌菇', '菇', '蘑菇类', '食用菌'],
    children: [
      'v_mushroom_shiitake',
      'v_mushroom_enoki',
      'v_mushroom_king_oyster',
      'v_mushroom_button',
      'v_mushroom_shimeji',
      'v_mushroom_white_beech'
    ],
    disambiguationPills: [
      { name: '香菇', canonicalId: 'v_mushroom_shiitake' },
      { name: '金针菇', canonicalId: 'v_mushroom_enoki' },
      { name: '杏鲍菇', canonicalId: 'v_mushroom_king_oyster' },
      { name: '口蘑', canonicalId: 'v_mushroom_button' }
    ]
  },
  // 9. 椒类 ('椒' | '辣椒': ['青椒', '红椒', '彩椒', '朝天椒'])
  {
    id: 'v_pepper_generic',
    slug: 'pepper_generic',
    name: '辣椒',
    category: 'vegetable',
    aliases: ['椒', '辣椒', '辣椒类'],
    children: [
      'v_green_bell_pepper',
      'v_hot_pepper',
      'v_bell_pepper_color',
      'v_chaotian_pepper'
    ],
    disambiguationPills: [
      { name: '青椒', canonicalId: 'v_green_bell_pepper' },
      { name: '红椒', canonicalId: 'v_hot_pepper' },
      { name: '彩椒', canonicalId: 'v_bell_pepper_color' },
      { name: '朝天椒', canonicalId: 'v_chaotian_pepper' }
    ]
  }
];

export const HYPERNYM_BY_ID = new Map<string, HypernymDefinition>(
  HYPERNYM_DEFINITIONS.map(item => [item.id, item])
);

// 子食材 ID -> 所属上位词 ID 集合
const CHILD_TO_PARENTS = new Map<string, Set<string>>();
HYPERNYM_DEFINITIONS.forEach(def => {
  def.children.forEach(childId => {
    if (!CHILD_TO_PARENTS.has(childId)) {
      CHILD_TO_PARENTS.set(childId, new Set());
    }
    CHILD_TO_PARENTS.get(childId)!.add(def.id);
  });
});

/**
 * 别名/关键词 -> 上位词消歧映射字典 (DISAMBIGUATION_MAP)
 */
export const DISAMBIGUATION_MAP = new Map<string, HypernymDefinition>();
HYPERNYM_DEFINITIONS.forEach(def => {
  DISAMBIGUATION_MAP.set(def.name, def);
  DISAMBIGUATION_MAP.set(def.slug, def);
  DISAMBIGUATION_MAP.set(def.id, def);
  def.aliases.forEach(alias => {
    DISAMBIGUATION_MAP.set(alias, def);
  });
});

export const ALIAS_TO_HYPERNYM = DISAMBIGUATION_MAP;

/**
 * 具体食材集合：绝不能误触发上位词消歧（如“鸡蛋”、“鲈鱼”、“五花肉”等）
 */
export const SPECIFIC_INGREDIENT_NAMES = new Set<string>();
HYPERNYM_DEFINITIONS.forEach(def => {
  def.disambiguationPills.forEach(pill => {
    SPECIFIC_INGREDIENT_NAMES.add(pill.name);
  });
});
[
  '鸡蛋', '鸭蛋', '鹌鹑蛋', '咸鸭蛋', '皮蛋',
  '鲈鱼', '草鱼', '三文鱼', '巴沙鱼',
  '五花肉', '里脊肉', '猪里脊', '肉末', '排骨',
  '鸡胸肉', '鸡腿肉', '鸡翅', '鸡爪',
  '牛里脊', '牛腩', '肥牛片', '牛排',
  '基围虾', '虾仁', '对虾', '白对虾',
  '嫩豆腐', '老豆腐', '内酯豆腐', '冻豆腐', '北豆腐',
  '香菇', '金针菇', '杏鲍菇', '口蘑',
  '青椒', '红椒', '彩椒', '朝天椒', '尖椒', '青辣椒', '红辣椒'
].forEach(name => {
  SPECIFIC_INGREDIENT_NAMES.add(name);
});

/**
 * 判定两个食材 ID 是否存在上位词包含（Subsumption）关系
 * @param requiredId 菜谱所需的食材规范 ID
 * @param candidateId 用户冰箱中拥有的食材规范 ID
 */
export function isSubsumedBy(requiredId: string, candidateId: string): boolean {
  if (requiredId === candidateId) return true;

  // 用户拥有上位词（如 p_fish_generic），菜谱要求具体子食材（如 p_fish_seabass）
  const parents = CHILD_TO_PARENTS.get(requiredId);
  if (parents && parents.has(candidateId)) {
    return true;
  }

  // 反向：菜谱要求上位词（如 p_fish_generic），用户拥有具体子食材（如 p_fish_seabass）
  const candidateParents = CHILD_TO_PARENTS.get(candidateId);
  if (candidateParents && candidateParents.has(requiredId)) {
    return true;
  }

  return false;
}

/**
 * 判定菜谱所需食材是否被用户当前库存满足（支持直接命中与上位词覆盖）
 */
export function isIngredientFulfilled(
  requiredId: string,
  userFridgeIds: Set<string> | string[]
): boolean {
  const fridgeSet = userFridgeIds instanceof Set ? userFridgeIds : new Set(userFridgeIds);
  if (fridgeSet.has(requiredId)) {
    return true;
  }

  for (const fridgeId of fridgeSet) {
    if (isSubsumedBy(requiredId, fridgeId)) {
      return true;
    }
  }

  return false;
}

/**
 * 获取指定上位词的所有子食材规范 ID
 */
export function getSubsumedChildIds(parentId: string): string[] {
  const def = HYPERNYM_BY_ID.get(parentId);
  return def ? [...def.children] : [];
}

/**
 * 输入框消歧检测：判断输入文本是否匹配或触发上位词字典
 * 1. 优先排除已知具体食材（如“鸡蛋”、“鲈鱼”、“五花肉”、“青椒”等）
 * 2. 匹配上位词别名（首尾空格与前缀清除后精确匹配）
 * 3. 极短文本包含匹配（仅当非具体食材且包含上位词别名时）
 */
export function findDisambiguation(rawText: string): HypernymDefinition | null {
  if (!rawText) return null;
  const cleaned = rawText.trim().replace(/^[-*•]\s*/, '').trim();
  if (!cleaned) return null;

  // 1. 具体食材边界保护：单独输入具体食材严禁触发泛称消歧
  if (SPECIFIC_INGREDIENT_NAMES.has(cleaned)) {
    return null;
  }

  // 2. 完全精确匹配别名/关键词（如“虾”、“鲜虾”、“大虾”、“鸡”、“鸡肉”、“牛”、“牛肉”、“猪肉”、“肉”、“蛋”、“豆腐”、“蘑菇”、“菌菇”、“菇”、“椒”、“辣椒”、“鱼”）
  if (ALIAS_TO_HYPERNYM.has(cleaned)) {
    return ALIAS_TO_HYPERNYM.get(cleaned)!;
  }

  // 3. 短文本包含匹配（例如输入“买鱼”或“吃豆腐”，且不属于具体食材）
  if (cleaned.length <= 4) {
    for (const [alias, def] of ALIAS_TO_HYPERNYM.entries()) {
      if (alias.length >= 2 && cleaned.includes(alias)) {
        return def;
      }
    }
  }

  return null;
}
