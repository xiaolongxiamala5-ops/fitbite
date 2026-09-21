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
  {
    id: 'p_tofu_generic',
    slug: 'tofu_generic',
    name: '豆腐',
    category: 'protein',
    aliases: ['豆腐', '大豆豆腐', '鲜豆腐'],
    children: [
      'p_tofu_silken',
      'p_tofu_firm'
    ],
    disambiguationPills: [
      { name: '内酯豆腐', canonicalId: 'p_tofu_silken' },
      { name: '老豆腐', canonicalId: 'p_tofu_firm' },
      { name: '嫩豆腐', canonicalId: 'p_tofu_silken' },
      { name: '北豆腐', canonicalId: 'p_tofu_firm' }
    ]
  },
  {
    id: 'p_pork_generic',
    slug: 'pork_generic',
    name: '猪肉',
    category: 'protein',
    aliases: ['肉', '猪肉', '肉类', '鲜肉', '生肉'],
    children: [
      'p_pork_belly',
      'p_pork_lean',
      'p_pork_minced'
    ],
    disambiguationPills: [
      { name: '五花肉', canonicalId: 'p_pork_belly' },
      { name: '里脊肉', canonicalId: 'p_pork_lean' },
      { name: '肉末', canonicalId: 'p_pork_minced' }
    ]
  },
  {
    id: 'p_egg_generic',
    slug: 'egg_generic',
    name: '蛋',
    category: 'protein',
    aliases: ['蛋', '蛋类', '禽蛋'],
    children: [
      'p_egg',
      'p_salted_duck_egg',
      'p_preserved_egg'
    ],
    disambiguationPills: [
      { name: '鸡蛋', canonicalId: 'p_egg' },
      { name: '咸鸭蛋', canonicalId: 'p_salted_duck_egg' },
      { name: '皮蛋', canonicalId: 'p_preserved_egg' }
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

// 别名/关键词 -> 上位词
const ALIAS_TO_HYPERNYM = new Map<string, HypernymDefinition>();
HYPERNYM_DEFINITIONS.forEach(def => {
  ALIAS_TO_HYPERNYM.set(def.name, def);
  ALIAS_TO_HYPERNYM.set(def.slug, def);
  ALIAS_TO_HYPERNYM.set(def.id, def);
  def.aliases.forEach(alias => {
    ALIAS_TO_HYPERNYM.set(alias, def);
  });
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
 */
export function findDisambiguation(rawText: string): HypernymDefinition | null {
  if (!rawText) return null;
  const cleaned = rawText.trim().replace(/^[-*•]\s*/, '');
  if (!cleaned) return null;

  // 1. 完全精确匹配别名
  if (ALIAS_TO_HYPERNYM.has(cleaned)) {
    return ALIAS_TO_HYPERNYM.get(cleaned)!;
  }

  // 2. 短文本包含匹配（例如输入“吃鱼”或“买鱼”或“鲜豆腐”）
  if (cleaned.length <= 4) {
    for (const [alias, def] of ALIAS_TO_HYPERNYM.entries()) {
      if (cleaned === alias || (alias.length >= 2 && cleaned.includes(alias))) {
        return def;
      }
    }
  }

  return null;
}
