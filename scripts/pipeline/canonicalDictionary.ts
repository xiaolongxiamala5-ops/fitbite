/**
 * Canonical Ingredient Dictionary & Alias Resolver for Pipeline (C.1.1)
 *
 * Strict Architectural Rule:
 * ONLY true synonyms normalize to the same canonical key.
 * Semantic generalization across different meat cuts, fish species, or mushroom varieties
 * is STRICTLY FORBIDDEN.
 */

export interface CanonicalDefinition {
  id: string; // Internal canonical ID (e.g., 'p_chicken_breast', 'p_chicken_leg')
  slug: string; // Slug key (e.g., 'chicken_breast', 'chicken_leg')
  name: string; // Primary Chinese display name
  category: 'protein' | 'vegetable' | 'carb' | 'other';
  aliases: string[];
}

export const CANONICAL_CATALOG: CanonicalDefinition[] = [
  // ================= 蛋白质类 (Protein) =================

  // 鸡肉不同部位严格区分，绝不泛化合并
  {
    id: 'p_chicken_breast',
    slug: 'chicken_breast',
    name: '鸡胸肉',
    category: 'protein',
    aliases: ['鸡胸肉', '鸡胸', '鸡胸脯肉', '去皮鸡胸肉', '鸡里脊', '鸡胸脯']
  },
  {
    id: 'p_chicken_leg',
    slug: 'chicken_leg',
    name: '鸡腿肉',
    category: 'protein',
    aliases: ['手枪腿', '鸡腿', '大鸡腿', '鸡腿肉', '琵琶腿', '去骨鸡腿肉']
  },
  {
    id: 'p_chicken_wing',
    slug: 'chicken_wing',
    name: '鸡翅',
    category: 'protein',
    aliases: ['鸡翅', '鸡中翅', '鸡翅中', '鸡全翅', '鸡翅根']
  },

  // 蛋类
  {
    id: 'p_egg',
    slug: 'egg',
    name: '鸡蛋',
    category: 'protein',
    aliases: ['鸡蛋', '鲜鸡蛋', '蛋液', '笨鸡蛋', '草鸡蛋', '鸡蛋黄', '鸡蛋白']
  },
  {
    id: 'p_salted_duck_egg',
    slug: 'salted_duck_egg',
    name: '咸鸭蛋',
    category: 'protein',
    aliases: ['咸鸭蛋', '咸蛋', '咸蛋黄']
  },
  {
    id: 'p_preserved_egg',
    slug: 'preserved_egg',
    name: '皮蛋',
    category: 'protein',
    aliases: ['皮蛋', '松花蛋']
  },

  // 水产 - 虾类形态严格区分：整虾/鲜虾 与 剥皮虾仁 不合并
  {
    id: 'p_shrimp_whole',
    slug: 'shrimp_whole',
    name: '鲜虾',
    category: 'protein',
    aliases: ['鲜虾', '活虾', '大虾', '海虾', '明虾', '黑虎虾', '基围虾', '罗氏虾', '对虾', '草虾']
  },
  {
    id: 'p_shrimp_peeled',
    slug: 'shrimp_peeled',
    name: '虾仁',
    category: 'protein',
    aliases: ['虾仁', '鲜虾仁', '冻虾仁', '青虾仁', '纯虾仁']
  },

  // 水产 - 鱼类品种严格区分，绝不跨品种泛化
  {
    id: 'p_fish_seabass',
    slug: 'fish_seabass',
    name: '鲈鱼',
    category: 'protein',
    aliases: ['鲈鱼', '鲜鲈鱼', '海鲈鱼', '淡水鲈鱼']
  },

  // 豆制品 - 质地严格区分：内酯/嫩豆腐 与 老/北豆腐 不合并
  {
    id: 'p_tofu_silken',
    slug: 'tofu_silken',
    name: '内酯豆腐',
    category: 'protein',
    aliases: ['内酯豆腐', '内脂豆腐', '嫩豆腐', '南豆腐', '绢豆腐']
  },
  {
    id: 'p_tofu_firm',
    slug: 'tofu_firm',
    name: '老豆腐',
    category: 'protein',
    aliases: ['老豆腐', '北豆腐', '卤水豆腐', '板豆腐']
  },

  // 猪肉部位严格区分：五花肉 与 猪瘦肉/里脊 不合并
  {
    id: 'p_pork_belly',
    slug: 'pork_belly',
    name: '五花肉',
    category: 'protein',
    aliases: ['五花肉', '五花肉片', '带皮五花肉', '三层肉', '肥瘦肉']
  },
  {
    id: 'p_pork_lean',
    slug: 'pork_lean',
    name: '猪瘦肉',
    category: 'protein',
    aliases: ['猪瘦肉', '瘦肉', '猪里脊', '里脊肉', '瘦肉丝', '里脊']
  },
  {
    id: 'p_pork_minced',
    slug: 'pork_minced',
    name: '猪肉末',
    category: 'protein',
    aliases: ['猪肉末', '肉末', '肉糜', '肉馅', '猪肉馅']
  },

  // 牛肉
  {
    id: 'p_beef',
    slug: 'beef',
    name: '牛肉',
    category: 'protein',
    aliases: ['牛肉', '牛里脊', '肥牛', '牛腩', '黄牛肉', '牛肉片']
  },

  // ================= 蔬菜类 (Vegetables) =================

  // 茄果与十字花科
  {
    id: 'v_tomato',
    slug: 'tomato',
    name: '西红柿',
    category: 'vegetable',
    aliases: ['西红柿', '番茄', '蕃茄', '大番茄', '生番茄']
  },
  {
    id: 'v_broccoli',
    slug: 'broccoli',
    name: '西兰花',
    category: 'vegetable',
    aliases: ['西兰花', '西蓝花', '绿花菜', '青花菜']
  },
  {
    id: 'v_cucumber',
    slug: 'cucumber',
    name: '黄瓜',
    category: 'vegetable',
    aliases: ['黄瓜', '青瓜']
  },

  // 辣椒类严格区分：不辣菜椒/甜椒 与 辣味尖椒/螺丝椒 不合并
  {
    id: 'v_green_bell_pepper',
    slug: 'green_bell_pepper',
    name: '青椒',
    category: 'vegetable',
    aliases: ['青椒', '菜椒', '甜椒', '柿子椒', '圆椒', '大椒']
  },
  {
    id: 'v_hot_pepper',
    slug: 'hot_pepper',
    name: '尖椒',
    category: 'vegetable',
    aliases: ['尖椒', '线椒', '螺丝椒', '二荆条鲜椒']
  },

  // 菌菇类严格区分具体品种，绝不泛化合并为单一“菌菇”
  {
    id: 'v_mushroom_shiitake',
    slug: 'mushroom_shiitake',
    name: '香菇',
    category: 'vegetable',
    aliases: ['香菇', '鲜香菇', '花菇', '冬菇']
  },
  {
    id: 'v_mushroom_shimeji',
    slug: 'mushroom_shimeji',
    name: '蟹味菇',
    category: 'vegetable',
    aliases: ['蟹味菇', '真姬菇', '鸿喜菇']
  },
  {
    id: 'v_mushroom_white_beech',
    slug: 'mushroom_white_beech',
    name: '白玉菇',
    category: 'vegetable',
    aliases: ['白玉菇', '白雪菇']
  },
  {
    id: 'v_mushroom_button',
    slug: 'mushroom_button',
    name: '口蘑',
    category: 'vegetable',
    aliases: ['口蘑', '双孢蘑菇', '白蘑菇']
  },
  {
    id: 'v_mushroom_enoki',
    slug: 'mushroom_enoki',
    name: '金针菇',
    category: 'vegetable',
    aliases: ['金针菇']
  },
  {
    id: 'v_mushroom_king_oyster',
    slug: 'mushroom_king_oyster',
    name: '杏鲍菇',
    category: 'vegetable',
    aliases: ['杏鲍菇']
  },

  {
    id: 'v_carrot',
    slug: 'carrot',
    name: '胡萝卜',
    category: 'vegetable',
    aliases: ['胡萝卜', '红萝卜']
  },
  {
    id: 'v_onion',
    slug: 'onion',
    name: '洋葱',
    category: 'vegetable',
    aliases: ['洋葱', '圆葱']
  },

  // ================= 碳水类 (Carbs) =================
  {
    id: 'c_potato',
    slug: 'potato',
    name: '土豆',
    category: 'carb',
    aliases: ['土豆', '马铃薯', '洋芋']
  },

  // ================= 其他辅料 (Other) =================
  {
    id: 'other_peanut',
    slug: 'peanut',
    name: '花生米',
    category: 'other',
    aliases: ['花生', '花生米', '熟花生', '生花生', '花生碎', '油炸花生米']
  }
];

// 建立精确匹配映射表
const aliasToCanonical = new Map<string, CanonicalDefinition>();

CANONICAL_CATALOG.forEach(item => {
  aliasToCanonical.set(item.name, item);
  aliasToCanonical.set(item.slug, item);
  aliasToCanonical.set(item.id, item);
  item.aliases.forEach(alias => {
    aliasToCanonical.set(alias, item);
  });
});

/**
 * 清洗原始食材文本（去除数量、括号说明、修饰词等）
 */
export function cleanIngredientRawText(rawText: string): string {
  let cleaned = rawText.trim();
  // 去除 markdown 列表符
  cleaned = cleaned.replace(/^[-*•]\s*/, '');
  // 去除中英文括号及其中内容，例如（常温冷冻均可）、(可选)
  cleaned = cleaned.replace(/[（(][^）)]*[）)]/g, '');
  // 去除末尾的数字或单位描述，例如 1 个、200g、一条、三根
  cleaned = cleaned.replace(/\s*\d+(\.\d+)?\s*(g|kg|ml|克|千克|毫升|个|只|条|根|朵|瓣|盒|块|包|支).*$/i, '');
  // 去除中文数字，例如 一条、三根、半个、1 枚
  cleaned = cleaned.replace(/\s*[一二两三四五六七八九十半\d]+\s*(个|只|条|根|朵|瓣|盒|块|包|枚|支).*$/, '');
  return cleaned.trim();
}

/**
 * 解析食材是否属于 Canonical Ingredient 并返回规范定义
 * 绝不允许语义跨部位泛化
 */
export function resolveCanonical(rawText: string): CanonicalDefinition | null {
  const cleaned = cleanIngredientRawText(rawText);

  // 1. 直接全词精确匹配
  if (cleaned && aliasToCanonical.has(cleaned)) {
    return aliasToCanonical.get(cleaned)!;
  }

  // 2. 检查主文本子串匹配（按别名长度从长到短匹配）
  if (cleaned) {
    let matched: CanonicalDefinition | null = null;
    let maxMatchedLen = 0;

    for (const [alias, def] of aliasToCanonical.entries()) {
      if (cleaned.includes(alias) && alias.length > maxMatchedLen) {
        matched = def;
        maxMatchedLen = alias.length;
      }
    }
    if (matched) return matched;
  }

  // 3. 只有主文本未匹配时，才检查括号内的备选项
  const parenMatches = rawText.match(/[（(]([^）)]+)[）)]/g);
  if (parenMatches) {
    for (const paren of parenMatches) {
      const inner = cleanIngredientRawText(
        paren.replace(/^[（(]|[）)]$/g, '').replace(/^(或者|可选|推荐|可换成)/, '')
      );
      if (inner && aliasToCanonical.has(inner)) {
        return aliasToCanonical.get(inner)!;
      }
      for (const [alias, def] of aliasToCanonical.entries()) {
        if (inner.includes(alias)) {
          return def;
        }
      }
    }
  }

  return null;
}

export interface CanonicalResolvedResult {
  primary: CanonicalDefinition;
  mode: 'single' | 'anyOf';
  alternatives?: { id: string; name: string }[];
}

/**
 * 结构化解析食材（支持二选一 / 多选一替代关系）
 * 绝不允许为了兼容而丢失替代选项
 */
export function resolveCanonicalWithOptions(rawText: string): CanonicalResolvedResult | null {
  const candidates: string[] = [];

  // 1. 括号中的“或者/也行/均可/也可以用”
  const parenMatch = rawText.match(/^([^(（]+)[(（](?:或者|或|也可以用|也可以|推荐|超市的)?\s*([^）)]+?)(?:也行|均可|即可|的可选|可选)?\s*[）)]$/);
  if (parenMatch) {
    candidates.push(parenMatch[1].trim());
    candidates.push(parenMatch[2].trim());
  } else if (rawText.includes(' or ') || rawText.includes(' / ') || rawText.includes(' 或者 ')) {
    const parts = rawText.split(/\s+or\s+|\s*\/\s+|\s+或者\s+/);
    parts.forEach(p => candidates.push(p.trim()));
  } else {
    candidates.push(rawText);
  }

  // 解析各个候选片段
  const resolvedDefs: CanonicalDefinition[] = [];
  const seenIds = new Set<string>();

  for (const cand of candidates) {
    const def = resolveCanonical(cand);
    if (def && !seenIds.has(def.id)) {
      seenIds.add(def.id);
      resolvedDefs.push(def);
    }
  }

  // 若候选片段中没有解析出任何规范食材，尝试兜底解析整句
  if (resolvedDefs.length === 0) {
    const fallbackDef = resolveCanonical(rawText);
    if (fallbackDef) {
      resolvedDefs.push(fallbackDef);
    }
  }

  if (resolvedDefs.length === 0) {
    return null;
  }

  if (resolvedDefs.length === 1) {
    return {
      primary: resolvedDefs[0],
      mode: 'single'
    };
  }

  // 存在 2 个及以上不同的 Canonical 定义，构建 anyOf 替代组
  return {
    primary: resolvedDefs[0],
    mode: 'anyOf',
    alternatives: resolvedDefs.map(d => ({ id: d.id, name: d.name }))
  };
}
