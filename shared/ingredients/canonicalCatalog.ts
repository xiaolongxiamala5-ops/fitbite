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
    aliases: ['鸡胸肉', '鸡胸', '鸡胸脯肉', '去皮鸡胸肉', '鸡里脊', '鸡胸脯', 'chicken breast', 'chicken breast fillets', 'chicken fillets']
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
    aliases: ['鸡翅', '鸡中翅', '鸡翅中', '鸡全翅', '鸡翅根', 'chicken wings']
  },
  {
    id: 'p_chicken_feet',
    slug: 'chicken_feet',
    name: '鸡爪',
    category: 'protein',
    aliases: ['鸡爪', '凤爪', '鸡脚']
  },
  {
    id: 'p_chicken_whole',
    slug: 'chicken_whole',
    name: '鸡',
    category: 'protein',
    aliases: ['鸡', '整鸡', '半鸡', '肉鸡', '三黄鸡', '土鸡', '草鸡', '半只鸡', '走地鸡', '童子鸡', 'whole chicken']
  },

  // 蛋类
  {
    id: 'p_egg',
    slug: 'egg',
    name: '鸡蛋',
    category: 'protein',
    aliases: ['鸡蛋', '鲜鸡蛋', '蛋液', '笨鸡蛋', '草鸡蛋', '鸡蛋黄', '鸡蛋白', 'eggs', 'egg']
  },
  {
    id: 'p_duck_egg',
    slug: 'duck_egg',
    name: '鸭蛋',
    category: 'protein',
    aliases: ['鸭蛋', '鲜鸭蛋', '生鸭蛋']
  },
  {
    id: 'p_quail_egg',
    slug: 'quail_egg',
    name: '鹌鹑蛋',
    category: 'protein',
    aliases: ['鹌鹑蛋', '鲜鹌鹑蛋']
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
    aliases: ['鲜虾', '活虾', '大虾', '海虾', '明虾', '黑虎虾', '基围虾', '罗氏虾', '对虾', '草虾', '白对虾', 'king prawns', 'prawns']
  },
  {
    id: 'p_shrimp_peeled',
    slug: 'shrimp_peeled',
    name: '虾仁',
    category: 'protein',
    aliases: ['虾仁', '鲜虾仁', '冻虾仁', '青虾仁', '纯虾仁']
  },
  {
    id: 'p_oyster',
    slug: 'oyster',
    name: '生蚝',
    category: 'protein',
    aliases: ['生蚝', '牡蛎', '海蛎子', '蚝肉', '鲜生蚝']
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
    aliases: ['草鱼', '草鱼肉', '草鱼片', '草鱼块', '草鱼肉片', '净草鱼肉', '黑鱼']
  },
  {
    id: 'p_fish_salmon',
    slug: 'fish_salmon',
    name: '三文鱼',
    category: 'protein',
    aliases: ['三文鱼', '三文鱼肉', '三文鱼排', '鲑鱼', 'smoked salmon', 'salmon']
  },
  {
    id: 'p_fish_basa',
    slug: 'fish_basa',
    name: '巴沙鱼',
    category: 'protein',
    aliases: ['巴沙鱼', '巴沙鱼柳', '巴沙鱼片', '龙利鱼']
  },
  {
    id: 'p_fish_cod',
    slug: 'fish_cod',
    name: '鳕鱼',
    category: 'protein',
    aliases: ['鳕鱼', '黑鳕鱼', '银鳕鱼', '真鳕鱼', '鳕狭', '明太鱼']
  },
  {
    id: 'p_fish_mandarin',
    slug: 'fish_mandarin',
    name: '鳜鱼',
    category: 'protein',
    aliases: ['鳜鱼', '桂鱼', '花鲫鱼', '鲜鳜鱼']
  },
  {
    id: 'p_fish_bream',
    slug: 'fish_bream',
    name: '鳊鱼',
    category: 'protein',
    aliases: ['鳊鱼', '鲂鱼', '武昌鱼', '鲜鳊鱼']
  },
  {
    id: 'p_fish_carp',
    slug: 'fish_carp',
    name: '鲤鱼',
    category: 'protein',
    aliases: ['鲤鱼', '鲤拐子', '鲜鲤鱼']
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
    aliases: ['豆腐', '大豆豆腐', '鲜豆腐', 'tofu']
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
  {
    id: 'p_tofu_frozen',
    slug: 'tofu_frozen',
    name: '冻豆腐',
    category: 'protein',
    aliases: ['冻豆腐', '蜂窝豆腐']
  },
  {
    id: 'p_tofu_dried',
    slug: 'tofu_dried',
    name: '香干',
    category: 'protein',
    aliases: ['香干', '豆腐干', '卤香干', '五香豆腐干', '茶干', '白香干', '小香干']
  },

  // 猪肉部位严格区分：五花肉 与 猪瘦肉/里脊 不合并
  {
    id: 'p_pork_belly',
    slug: 'pork_belly',
    name: '五花肉',
    category: 'protein',
    aliases: ['五花肉', '五花肉片', '带皮五花肉', '三层肉', '肥瘦肉', '五花肉薄片']
  },
  {
    id: 'p_pork_lean',
    slug: 'pork_lean',
    name: '猪瘦肉',
    category: 'protein',
    aliases: ['猪瘦肉', '瘦肉', '猪里脊', '里脊肉', '瘦肉丝', '里脊', '猪里脊肉', '猪肉丝']
  },
  {
    id: 'p_pork_minced',
    slug: 'pork_minced',
    name: '猪肉末',
    category: 'protein',
    aliases: ['猪肉末', '肉末', '肉糜', '肉馅', '猪肉馅']
  },
  {
    id: 'p_pork_ribs',
    slug: 'pork_ribs',
    name: '排骨',
    category: 'protein',
    aliases: ['排骨', '猪排骨', '肋排', '小排']
  },

  // 牛肉
  {
    id: 'p_beef',
    slug: 'beef',
    name: '牛肉',
    category: 'protein',
    aliases: ['牛肉', '牛里脊', '肥牛', '肥牛片', '牛腩', '牛排', '黄牛肉', '牛肉片', '牛腱', '牛腱子', '牛腱子肉', '牛柳', '牛肩肉', '牛肉丝', '牛肉粒', 'beef cut', 'beef loin']
  },
  {
    id: 'p_luncheon_meat',
    slug: 'luncheon_meat',
    name: '午餐肉',
    category: 'protein',
    aliases: ['午餐肉', '火腿', '火腿丁', '火腿肠', '罐头午餐肉']
  },

  // ================= 蔬菜类 (Vegetables) =================

  // 茄果与十字花科
  {
    id: 'v_tomato',
    slug: 'tomato',
    name: '西红柿',
    category: 'vegetable',
    aliases: ['西红柿', '番茄', '蕃茄', '大番茄', '生番茄', 'tomatoes', 'tomato', 'cherry tomatoes', 'tinned tomatoes', 'chopped tomatoes', 'sun-dried tomatoes', 'tinned chopped tomatoes']
  },
  {
    id: 'v_broccoli',
    slug: 'broccoli',
    name: '西兰花',
    category: 'vegetable',
    aliases: ['西兰花', '西蓝花', '绿花菜', '青花菜', 'broccoli']
  },
  {
    id: 'v_cabbage',
    slug: 'cabbage',
    name: '包菜',
    category: 'vegetable',
    aliases: ['包菜', '手撕包菜', '圆白菜', '卷心菜', '包心菜', '结球甘蓝', '甘蓝', 'cabbage']
  },
  {
    id: 'v_baby_cabbage',
    slug: 'baby_cabbage',
    name: '娃娃菜',
    category: 'vegetable',
    aliases: ['娃娃菜', '大头娃娃菜']
  },
  {
    id: 'v_choy_sum',
    slug: 'choy_sum',
    name: '菜心',
    category: 'vegetable',
    aliases: ['菜心', '新鲜菜心', '菜薹', '白菜薹', '广东菜心', '油菜心']
  },
  {
    id: 'v_celery',
    slug: 'celery',
    name: '芹菜',
    category: 'vegetable',
    aliases: ['芹菜', '小芹菜', '香芹', '水芹', '西芹', '旱芹', '芹菜段', '芹菜茎', 'celery stalk', 'celery']
  },
  {
    id: 'v_cucumber',
    slug: 'cucumber',
    name: '黄瓜',
    category: 'vegetable',
    aliases: ['黄瓜', '青瓜', 'cucumber']
  },

  // 辣椒类严格区分：不辣菜椒/甜椒 与 辣味尖椒/螺丝椒 不合并
  {
    id: 'v_green_bell_pepper',
    slug: 'green_bell_pepper',
    name: '青椒',
    category: 'vegetable',
    aliases: ['青椒', '青辣椒', '菜椒', '甜椒', '柿子椒', '圆椒', '大椒', '彩椒', 'bell peppers', 'red bell pepper', 'red bell peppers', 'green pepper']
  },
  {
    id: 'v_hot_pepper',
    slug: 'hot_pepper',
    name: '尖椒',
    category: 'vegetable',
    aliases: ['尖椒', '线椒', '螺丝椒', '二荆条鲜椒', '红辣椒', '红椒', '鲜辣椒', '朝天椒', '小米辣', '小米椒', '野山椒', 'red chilli']
  },
  {
    id: 'v_lettuce',
    slug: 'lettuce',
    name: '生菜',
    category: 'vegetable',
    aliases: ['生菜', '结球生菜', '罗马生菜', '圆生菜', '叶用莴苣', '玻璃生菜', 'lettuce', 'lettuce leaves']
  },
  {
    id: 'v_youmaicai',
    slug: 'youmaicai',
    name: '油麦菜',
    category: 'vegetable',
    aliases: ['油麦菜', '牛俐生菜']
  },
  {
    id: 'v_spinach',
    slug: 'spinach',
    name: '菠菜',
    category: 'vegetable',
    aliases: ['菠菜', '鲜菠菜', '赤根菜']
  },
  {
    id: 'v_water_spinach',
    slug: 'water_spinach',
    name: '空心菜',
    category: 'vegetable',
    aliases: ['空心菜', '蕹菜', '藤藤菜', '通菜']
  },
  {
    id: 'v_bok_choy',
    slug: 'bok_choy',
    name: '青菜',
    category: 'vegetable',
    aliases: ['青菜', '小油菜', '油菜', '小白菜', '上海青', '小青菜']
  },
  {
    id: 'v_cauliflower',
    slug: 'cauliflower',
    name: '菜花',
    category: 'vegetable',
    aliases: ['菜花', '花菜', '白花菜', '花椰菜']
  },
  {
    id: 'v_zucchini',
    slug: 'zucchini',
    name: '西葫芦',
    category: 'vegetable',
    aliases: ['西葫芦', '小南瓜', '美洲南瓜', 'courgette']
  },
  {
    id: 'v_winter_melon',
    slug: 'winter_melon',
    name: '冬瓜',
    category: 'vegetable',
    aliases: ['冬瓜', '白瓜', '地芝']
  },
  {
    id: 'v_pumpkin',
    slug: 'pumpkin',
    name: '南瓜',
    category: 'vegetable',
    aliases: ['南瓜', '倭瓜', '番瓜']
  },
  {
    id: 'v_asparagus_lettuce',
    slug: 'asparagus_lettuce',
    name: '莴笋',
    category: 'vegetable',
    aliases: ['莴笋', '莴苣', '莴笋条', '莴笋片', '莴笋丝']
  },
  {
    id: 'v_garlic_moss',
    slug: 'garlic_moss',
    name: '蒜苔',
    category: 'vegetable',
    aliases: ['蒜苔', '蒜薹']
  },
  {
    id: 'v_seaweed',
    slug: 'seaweed',
    name: '紫菜',
    category: 'vegetable',
    aliases: ['紫菜', '干紫菜', '免洗紫菜', '海苔']
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
    aliases: ['胡萝卜', '红萝卜', 'carrots', 'carrot']
  },
  {
    id: 'v_onion',
    slug: 'onion',
    name: '洋葱',
    category: 'vegetable',
    aliases: ['洋葱', '圆葱', 'onion', 'onions', 'red onion']
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
    aliases: ['土豆', '马铃薯', '洋芋', 'potatoes', 'potato']
  },
  {
    id: 'c_rice',
    slug: 'rice',
    name: '米饭',
    category: 'carb',
    aliases: ['米饭', '白米饭', '大米饭', '白饭', '大米', 'jasmin rice', 'rice']
  },
  {
    id: 'c_oats',
    slug: 'oats',
    name: '燕麦',
    category: 'carb',
    aliases: ['燕麦', '燕麦片', '纯燕麦片', '即食燕麦片', 'oat flakes', 'oats']
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
  },
  {
    id: 'other_milk',
    slug: 'milk',
    name: '纯牛奶',
    category: 'other',
    aliases: ['牛奶', '纯牛奶', '鲜牛奶', '全脂牛奶', '巴氏奶', 'milk']
  },

  // ================= Cooklang 英文食材补充 =================

  // 蔬菜 - 新增品种
  {
    id: 'v_aubergine',
    slug: 'aubergine',
    name: '茄子',
    category: 'vegetable',
    aliases: ['aubergine', 'eggplant']
  },
  {
    id: 'v_olives',
    slug: 'olives',
    name: '橄榄',
    category: 'vegetable',
    aliases: ['olives']
  },
  {
    id: 'v_basil',
    slug: 'basil',
    name: '罗勒',
    category: 'vegetable',
    aliases: ['basil leaves', 'fresh basil']
  },
  {
    id: 'v_parsley',
    slug: 'parsley',
    name: '欧芹',
    category: 'vegetable',
    aliases: ['parsley', 'fresh coriander', 'coriander']
  },
  {
    id: 'v_lemon',
    slug: 'lemon',
    name: '柠檬',
    category: 'vegetable',
    aliases: ['lemon', 'lime']
  },
  {
    id: 'v_avocado',
    slug: 'avocado',
    name: '牛油果',
    category: 'vegetable',
    aliases: ['avocado']
  },
  {
    id: 'v_green_beans',
    slug: 'green_beans',
    name: '四季豆',
    category: 'vegetable',
    aliases: ['frozen green beans', 'frozen beans', 'green beans']
  },
  {
    id: 'v_corn',
    slug: 'corn',
    name: '玉米',
    category: 'vegetable',
    aliases: ['frozen corn', 'corn']
  },
  {
    id: 'v_rocket',
    slug: 'rocket',
    name: '芝麻菜',
    category: 'vegetable',
    aliases: ['rocket salad', 'rocket salad leaves']
  },
  {
    id: 'v_dill',
    slug: 'dill',
    name: '莳萝',
    category: 'vegetable',
    aliases: ['dill']
  },
  {
    id: 'v_rosemary',
    slug: 'rosemary',
    name: '迷迭香',
    category: 'vegetable',
    aliases: ['rosemary']
  },
  {
    id: 'v_thyme',
    slug: 'thyme',
    name: '百里香',
    category: 'vegetable',
    aliases: ['thyme']
  },
  {
    id: 'v_capers',
    slug: 'capers',
    name: '刺山柑',
    category: 'vegetable',
    aliases: ['capers']
  },

  // 水产 - 新增品种
  {
    id: 'p_bream_cooklang',
    slug: 'bream',
    name: '鲷鱼',
    category: 'protein',
    aliases: ['bream']
  },
  {
    id: 'p_catfish',
    slug: 'catfish',
    name: '鲶鱼',
    category: 'protein',
    aliases: ['catfish']
  },
  {
    id: 'p_mussels',
    slug: 'mussels',
    name: '贻贝',
    category: 'protein',
    aliases: ['mussels']
  },
  {
    id: 'p_seafood_mix',
    slug: 'seafood_mix',
    name: '海鲜杂烩',
    category: 'protein',
    aliases: ['seafood mix']
  },

  // 乳制品/奶酪
  {
    id: 'p_feta',
    slug: 'feta',
    name: '菲达奶酪',
    category: 'protein',
    aliases: ['feta cheese']
  },
  {
    id: 'p_parmesan',
    slug: 'parmesan',
    name: '帕玛森奶酪',
    category: 'protein',
    aliases: ['Parmesan cheese']
  },
  {
    id: 'p_cottage_cheese',
    slug: 'cottage_cheese',
    name: '农家奶酪',
    category: 'protein',
    aliases: ['cottage cheese']
  },

  // 坚果/种子
  {
    id: 'other_pine_nuts',
    slug: 'pine_nuts',
    name: '松子',
    category: 'other',
    aliases: ['pine nuts']
  },
  {
    id: 'other_chia_seeds',
    slug: 'chia_seeds',
    name: '奇亚籽',
    category: 'other',
    aliases: ['chia seeds']
  },
  {
    id: 'other_granola',
    slug: 'granola',
    name: '格兰诺拉',
    category: 'other',
    aliases: ['granola']
  },

  // 碳水 - 新增品种
  {
    id: 'c_bread',
    slug: 'bread',
    name: '面包',
    category: 'carb',
    aliases: ['ciabatta', 'chiabatta']
  },
  {
    id: 'c_noodles',
    slug: 'noodles',
    name: '面条',
    category: 'carb',
    aliases: ['soba noodles']
  },
  {
    id: 'c_quinoa',
    slug: 'quinoa',
    name: '藜麦',
    category: 'carb',
    aliases: ['white quinoa', 'quinoa']
  },
  {
    id: 'c_flour',
    slug: 'flour',
    name: '面粉',
    category: 'carb',
    aliases: ['flour']
  },

  // 水果
  {
    id: 'other_strawberry',
    slug: 'strawberry',
    name: '草莓',
    category: 'other',
    aliases: ['strawberries', 'strawberry']
  },
  {
    id: 'other_banana',
    slug: 'banana',
    name: '香蕉',
    category: 'other',
    aliases: ['banana']
  },
  {
    id: 'other_blueberry',
    slug: 'blueberry',
    name: '蓝莓',
    category: 'other',
    aliases: ['blueberries', 'fresh blueberries']
  },
  {
    id: 'other_raspberry',
    slug: 'raspberry',
    name: '覆盆子',
    category: 'other',
    aliases: ['fresh raspberries', 'raspberries']
  },

  // 调料/酱汁/其他
  {
    id: 'other_red_wine',
    slug: 'red_wine',
    name: '红酒',
    category: 'other',
    aliases: ['red wine']
  },
  {
    id: 'other_worcester_sauce',
    slug: 'worcester_sauce',
    name: '伍斯特酱',
    category: 'other',
    aliases: ['Worcester sauce']
  },
  {
    id: 'other_fish_sauce',
    slug: 'fish_sauce',
    name: '鱼露',
    category: 'other',
    aliases: ['fish sauce']
  },
  {
    id: 'other_pesto',
    slug: 'pesto',
    name: '青酱',
    category: 'other',
    aliases: ['pesto']
  },
  {
    id: 'other_chicken_broth',
    slug: 'chicken_broth',
    name: '鸡汤',
    category: 'other',
    aliases: ['chicken broth', 'chicken stock']
  },
  {
    id: 'other_mushroom_soup_powder',
    slug: 'mushroom_soup_powder',
    name: '蘑菇汤粉',
    category: 'other',
    aliases: ['mushroom soup powder']
  },
  {
    id: 'other_cream',
    slug: 'cream',
    name: '奶油',
    category: 'other',
    aliases: ['cream']
  },
  {
    id: 'other_shakshuka_sauce',
    slug: 'shakshuka_sauce',
    name: '北非蛋酱',
    category: 'other',
    aliases: ['shakshuka sauce']
  },
  {
    id: 'other_provence_herbs',
    slug: 'provence_herbs',
    name: '普罗旺斯香草',
    category: 'other',
    aliases: ['provence herbs']
  }
];

export const CANONICAL_INGREDIENTS = CANONICAL_CATALOG;

export const CANONICAL_MAP = new Map<string, CanonicalDefinition>(
  CANONICAL_CATALOG.map(item => [item.id, item])
);
