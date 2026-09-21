import { CanonicalDefinition } from './types';

/**
 * Shared Canonical Ingredient Catalog (SSOT)
 *
 * Strict Architectural Guardrails:
 * 1. ONLY true synonyms normalize to the same canonical key.
 * 2. Semantic generalization across different meat cuts, fish species, or mushroom varieties is STRICTLY FORBIDDEN.
 * 3. Part separation is mandatory (chicken breast vs chicken leg vs chicken wing; whole shrimp vs peeled shrimp).
 * 4. Deprecated generic 'p_shrimp' is strictly excluded.
 */
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
  {
    id: 'p_fish_grass_carp',
    slug: 'fish_grass_carp',
    name: '草鱼',
    category: 'protein',
    aliases: ['草鱼', '草鱼肉', '草鱼片', '草鱼块', '草鱼肉片', '净草鱼肉']
  },
  {
    id: 'p_fish_salmon',
    slug: 'fish_salmon',
    name: '三文鱼',
    category: 'protein',
    aliases: ['三文鱼', '三文鱼肉', '三文鱼排', '鲑鱼']
  },
  {
    id: 'p_fish_basa',
    slug: 'fish_basa',
    name: '巴沙鱼',
    category: 'protein',
    aliases: ['巴沙鱼', '巴沙鱼柳', '巴沙鱼片', '龙利鱼']
  },

  // ================= 基础泛称类 (Generic / Hypernym) =================
  {
    id: 'p_fish_generic',
    slug: 'fish_generic',
    name: '鱼',
    category: 'protein',
    aliases: ['鱼', '海鲜', '海鱼', '河鱼', '鲜鱼', '鱼肉', '生鱼', '活鱼']
  },
  {
    id: 'p_tofu_generic',
    slug: 'tofu_generic',
    name: '豆腐',
    category: 'protein',
    aliases: ['豆腐', '大豆豆腐', '鲜豆腐']
  },
  {
    id: 'p_pork_generic',
    slug: 'pork_generic',
    name: '猪肉',
    category: 'protein',
    aliases: ['肉', '猪肉', '肉类', '鲜肉', '生肉']
  },
  {
    id: 'p_egg_generic',
    slug: 'egg_generic',
    name: '蛋',
    category: 'protein',
    aliases: ['蛋', '蛋类', '禽蛋']
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
    aliases: ['青椒', '青辣椒', '菜椒', '甜椒', '柿子椒', '圆椒', '大椒']
  },
  {
    id: 'v_hot_pepper',
    slug: 'hot_pepper',
    name: '尖椒',
    category: 'vegetable',
    aliases: ['尖椒', '线椒', '螺丝椒', '二荆条鲜椒', '红辣椒', '红椒', '鲜辣椒']
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
  {
    id: 'v_soybean_sprout',
    slug: 'soybean_sprout',
    name: '黄豆芽',
    category: 'vegetable',
    aliases: ['黄豆芽', '豆芽', '大豆芽']
  },
  {
    id: 'v_black_fungus',
    slug: 'black_fungus',
    name: '黑木耳',
    category: 'vegetable',
    aliases: ['黑木耳', '木耳', '干木耳', '干黑木耳', '泡发木耳', '云耳']
  },

  // ================= 碳水类 (Carbs) =================
  {
    id: 'c_potato',
    slug: 'potato',
    name: '土豆',
    category: 'carb',
    aliases: ['土豆', '马铃薯', '洋芋']
  },
  {
    id: 'c_rice',
    slug: 'rice',
    name: '米饭',
    category: 'carb',
    aliases: ['米饭', '白米饭', '大米饭', '白饭']
  },

  // ================= 其他辅料 (Other) =================
  {
    id: 'other_peanut',
    slug: 'peanut',
    name: '花生米',
    category: 'other',
    aliases: ['花生', '花生米', '熟花生', '生花生', '花生碎', '油炸花生米']
  },
  {
    id: 'other_cola',
    slug: 'cola',
    name: '可乐',
    category: 'other',
    aliases: ['可乐', '可口可乐', '百事可乐']
  }
];

export const CANONICAL_INGREDIENTS = CANONICAL_CATALOG;

export const CANONICAL_MAP = new Map<string, CanonicalDefinition>(
  CANONICAL_CATALOG.map(item => [item.id, item])
);
