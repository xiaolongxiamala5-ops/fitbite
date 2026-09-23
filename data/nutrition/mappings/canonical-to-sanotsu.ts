/**
 * Canonical Ingredient to Sanotsu FoodCode Mapping (SSOT)
 *
 * Strict Architectural Guardrails:
 * 1. ZERO hardcoded calories or macronutrients in this mapping file.
 *    All nutrition values MUST be looked up dynamically from the pinned dataset.
 * 2. Every canonicalId MUST exist in shared/ingredients/canonicalCatalog.
 * 3. Every foodCode MUST exist in Sanotsu china-food-composition-data (commit d15675c).
 * 4. defaultWeightBasis specifies the standard culinary interpretation:
 *    - 'edible_net': specifies net edible weight (e.g. skinless boneless chicken breast, peeled shrimp)
 *    - 'gross_as_purchased': specifies gross weight with bone/shell (e.g. bone-in chicken leg, whole egg)
 */

export interface CanonicalNutritionMapping {
  canonicalId: string;
  foodCode: string;
  defaultWeightBasis: 'edible_net' | 'gross_as_purchased';
  notes: string;
  verifiedBy: string;
}

export const CANONICAL_TO_SANOTSU: CanonicalNutritionMapping[] = [
  // ================= 蛋白质类 (Protein) =================
  {
    canonicalId: 'p_chicken_breast',
    foodCode: '091112', // 鸡胸脯肉
    defaultWeightBasis: 'edible_net',
    notes: '标准生去皮鸡胸脯肉，可食部 100%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_chicken_leg',
    foodCode: '091113', // 鸡腿
    defaultWeightBasis: 'gross_as_purchased',
    notes: '生带骨鸡腿，可食部约 74%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_chicken_wing',
    foodCode: '091114', // 鸡翅
    defaultWeightBasis: 'gross_as_purchased',
    notes: '生鸡翅，带骨可食部约 69%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_chicken_whole',
    foodCode: '091101x', // 鸡（代表值）
    defaultWeightBasis: 'gross_as_purchased',
    notes: '整鸡/半鸡代表值，带骨可食部约 63%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_egg',
    foodCode: '111101x', // 鸡蛋（代表值）
    defaultWeightBasis: 'gross_as_purchased',
    notes: '生鲜鸡蛋，带壳可食部约 87%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_salted_duck_egg',
    foodCode: '112202', // 鸭蛋（咸鸭蛋，生）
    defaultWeightBasis: 'gross_as_purchased',
    notes: '生咸鸭蛋，带壳计算',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_preserved_egg',
    foodCode: '112201', // 松花蛋（鸭蛋）［皮蛋］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '鸭皮蛋，带壳计算',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_shrimp_whole',
    foodCode: '122107', // 海虾
    defaultWeightBasis: 'gross_as_purchased',
    notes: '生整海虾，带头带壳可食部约 51%',
    verifiedBy: 'manual_curation'
  },
  // 架构决策：p_shrimp_peeled（鲜虾仁）暂时保持 unmapped。
  // 该条目的营养组成与 FitBite 所需的 generic fresh peeled shrimp 产品语义无法可靠对应；
  // source metadata 未确认其具体加工状态，因此暂时保持 unmapped。
  {
    canonicalId: 'p_oyster',
    foodCode: '124109', // 生蚝
    defaultWeightBasis: 'gross_as_purchased',
    notes: '生蚝，100% 可食或带壳',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_fish_seabass',
    foodCode: '121226', // 鲈鱼［鲈花］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '整条鲜鲈鱼，带骨带鳞可食部约 58%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_fish_grass_carp',
    foodCode: '121102', // 草鱼
    defaultWeightBasis: 'gross_as_purchased',
    notes: '生草鱼，带骨带鳞可食部约 58%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_fish_basa',
    foodCode: '121120', // 鲇鱼 proxy (巴沙鱼)
    defaultWeightBasis: 'edible_net',
    notes: '巴沙鱼柳/片，无骨纯肉计算，100% 可食',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_fish_cod',
    foodCode: '121239', // 鳕鱼［鳕狭、明太鱼］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '鳕鱼，带皮带骨可食部约 45%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_fish_mandarin',
    foodCode: '121129', // 鳜鱼［桂鱼、花鲫鱼］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '鳜鱼/桂鱼，带骨带鳞可食部约 61%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_fish_bream',
    foodCode: '121126', // 鳊鱼［鲂鱼、武昌鱼］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '鳊鱼/武昌鱼，带骨带鳞可食部约 59%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_fish_carp',
    foodCode: '121111', // 鲤鱼［鲤拐子］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '鲤鱼，带骨带鳞可食部约 54%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_tofu_silken',
    foodCode: '031304', // 豆腐（内酯）
    defaultWeightBasis: 'edible_net',
    notes: '内酯/嫩豆腐，100% 可食',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_tofu_firm',
    foodCode: '031306', // 豆腐（北豆腐）
    defaultWeightBasis: 'edible_net',
    notes: '老豆腐/北豆腐/卤水豆腐，100% 可食',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_tofu_dried',
    foodCode: '031516', // 豆腐干（香干）
    defaultWeightBasis: 'edible_net',
    notes: '香干/豆腐干，100% 可食',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_pork_belly',
    foodCode: '081108', // 猪肉（奶面）［硬五花］
    defaultWeightBasis: 'edible_net',
    notes: '五花肉，纯肉净重计算',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_pork_lean',
    foodCode: '081110', // 猪肉（瘦）
    defaultWeightBasis: 'edible_net',
    notes: '猪瘦肉，纯瘦肉净重计算',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_beef',
    foodCode: '082101x', // 牛肉（代表值，fat9g）
    defaultWeightBasis: 'edible_net',
    notes: '生鲜牛肉，净肉净重计算',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_luncheon_meat',
    foodCode: '081307', // 午餐肉（北京）
    defaultWeightBasis: 'edible_net',
    notes: '午餐肉，100% 可食',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_pork_minced',
    foodCode: '081108', // 猪肉末 / 肉糜
    defaultWeightBasis: 'edible_net',
    notes: '猪肉末/肉糜，纯肉净重计算',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_pork_generic',
    foodCode: '081108', // 猪肉（代表值 proxy）
    defaultWeightBasis: 'edible_net',
    notes: '猪肉泛称，按家常中位数净重计算',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_fish_generic',
    foodCode: '121102', // 鱼类（淡水鱼代表值 proxy）
    defaultWeightBasis: 'gross_as_purchased',
    notes: '鲜鱼泛称，带骨带鳞可食部约 58%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_tofu_generic',
    foodCode: '031304', // 豆腐代表值
    defaultWeightBasis: 'edible_net',
    notes: '豆腐泛称，100% 可食',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'p_egg_generic',
    foodCode: '111101', // 鲜鸡蛋代表值
    defaultWeightBasis: 'gross_as_purchased',
    notes: '蛋类泛称，带壳可食部约 88%',
    verifiedBy: 'manual_curation'
  },

  // ================= 蔬菜类 (Vegetable) =================
  {
    canonicalId: 'v_tomato',
    foodCode: '043119', // 番茄［西红柿］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '生番茄，去蒂可食部约 95%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_broccoli',
    foodCode: '045217', // 西兰花［绿菜花］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '生西兰花，去根部老茎可食部约 92%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_cucumber',
    foodCode: '043208', // 黄瓜（鲜）［胡瓜］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '生鲜黄瓜，去蒂可食部约 92%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_onion',
    foodCode: '044301', // 洋葱（鲜）［葱头］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '鲜洋葱，去外皮可食部约 90%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_green_bell_pepper',
    foodCode: '043124', // 甜椒［灯笼椒、柿子椒］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '青椒/菜椒/柿子椒，去蒂去籽可食部约 82%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_hot_pepper',
    foodCode: '043123', // 辣椒（青、尖）［尖椒］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '尖椒/鲜辣椒/小米辣，去蒂可食部约 91%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_mushroom_shiitake',
    foodCode: '051019', // 香菇（鲜）［香蕈，冬菇］
    defaultWeightBasis: 'edible_net',
    notes: '鲜香菇，100% 可食',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_mushroom_shimeji',
    foodCode: '051011', // 蘑菇（鲜蘑）
    defaultWeightBasis: 'edible_net',
    notes: '蟹味菇，鲜蘑 proxy，100% 可食',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_mushroom_white_beech',
    foodCode: '051011', // 蘑菇（鲜蘑）
    defaultWeightBasis: 'edible_net',
    notes: '白玉菇，鲜蘑 proxy，100% 可食',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_cabbage',
    foodCode: '045210', // 结球甘蓝（绿）［圆白菜］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '生圆白菜/卷心菜/包菜，去外叶可食部约 86%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_baby_cabbage',
    foodCode: '045123', // 娃娃菜
    defaultWeightBasis: 'gross_as_purchased',
    notes: '生娃娃菜，去根部可食部约 97%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_choy_sum',
    foodCode: '045108', // 白菜薹［菜薹，菜心］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '生鲜菜心/菜薹，去根部老茎可食部约 84%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_celery',
    foodCode: '045312', // 芹菜茎
    defaultWeightBasis: 'gross_as_purchased',
    notes: '生芹菜茎，去叶可食部约 67%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_mushroom_enoki',
    foodCode: '051008', // 金针菇（鲜）［智力菇］
    defaultWeightBasis: 'edible_net',
    notes: '生鲜金针菇，100% 可食',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_lettuce',
    foodCode: '045333', // 生菜［叶用莴苣］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '生菜，去外叶可食部约 94%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_youmaicai',
    foodCode: '045334', // 油麦菜
    defaultWeightBasis: 'gross_as_purchased',
    notes: '油麦菜，去老根可食部约 81%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_spinach',
    foodCode: '045301', // 菠菜（鲜）［赤根菜］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '菠菜，去根部可食部约 89%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_water_spinach',
    foodCode: '045337', // 蕹菜［空心菜、藤藤菜］
    defaultWeightBasis: 'edible_net',
    notes: '空心菜，100% 可食',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_bok_choy',
    foodCode: '045120', // 小白菜［青菜］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '青菜/小白菜，去老根可食部约 94%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_cauliflower',
    foodCode: '045216', // 菜花（白色）［花椰菜］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '菜花/花菜，去外叶根部可食部约 82%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_zucchini',
    foodCode: '043218', // 西葫芦
    defaultWeightBasis: 'gross_as_purchased',
    notes: '西葫芦，去蒂可食部约 73%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_winter_melon',
    foodCode: '043221', // 冬瓜
    defaultWeightBasis: 'gross_as_purchased',
    notes: '冬瓜，去皮去瓤可食部约 80%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_pumpkin',
    foodCode: '043213', // 南瓜（鲜）［倭瓜，番瓜］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '南瓜，去皮去籽可食部约 85%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_asparagus_lettuce',
    foodCode: '045324', // 莴笋（鲜）［莴苣］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '莴笋，去皮可食部约 62%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_garlic_moss',
    foodCode: '044107', // 蒜薹（圆）
    defaultWeightBasis: 'gross_as_purchased',
    notes: '蒜薹，去梢可食部约 90%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_black_fungus',
    foodCode: '051013', // 木耳（干）［黑木耳，云耳］
    defaultWeightBasis: 'edible_net',
    notes: '干木耳，100% 可食',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'v_seaweed',
    foodCode: '052008', // 紫菜（干）
    defaultWeightBasis: 'edible_net',
    notes: '干紫菜，100% 可食',
    verifiedBy: 'manual_curation'
  },

  // ================= 碳水类 (Carb) =================
  {
    canonicalId: 'c_potato',
    foodCode: '021101', // 马铃薯［土豆、洋芋］
    defaultWeightBasis: 'gross_as_purchased',
    notes: '生土豆，去皮可食部约 94%',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'c_rice',
    foodCode: '012401x', // 米饭（蒸，代表值）
    defaultWeightBasis: 'edible_net',
    notes: '熟米饭/白米饭（蒸），100% 可食，每 100g 约 116 kcal',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'c_oats',
    foodCode: '019012', // 燕麦
    defaultWeightBasis: 'edible_net',
    notes: '纯燕麦，100% 可食',
    verifiedBy: 'manual_curation'
  },

  // ================= 其他辅料 (Other) =================
  {
    canonicalId: 'other_peanut',
    foodCode: '072004', // 花生仁（生）
    defaultWeightBasis: 'edible_net',
    notes: '生花生米/花生仁，100% 可食',
    verifiedBy: 'manual_curation'
  },
  {
    canonicalId: 'other_milk',
    foodCode: '101101x', // 纯牛奶（代表值，全脂）
    defaultWeightBasis: 'edible_net',
    notes: '纯牛奶，100% 可食',
    verifiedBy: 'manual_curation'
  }
];

export const CANONICAL_NUTRITION_LOOKUP = new Map<string, CanonicalNutritionMapping>(
  CANONICAL_TO_SANOTSU.map(m => [m.canonicalId, m])
);

/**
 * 调料/油脂厨房映射表 (用于估算模式与油脂兜底)
 */
export const PANTRY_TO_SANOTSU: Record<string, string> = {
  pantry_oil: '192014',          // 色拉油 (898 kcal, 99.8g fat / 100g)
  preset_sesame_oil: '192014',   // 芝麻油/植物油脂 proxy
  preset_sugar: '071001',        // 白砂糖 (fallback food)
  preset_rock_sugar: '071001',   // 冰糖 (fallback food, 400 kcal, 100g carbs / 100g)
  preset_cooking_wine: '161001', // 黄酒/料酒 (120 kcal, 1.2g protein, 5g carbs / 100g)
  preset_starch: '022103'        // 玉米淀粉 (346 kcal, 85g carbs / 100g)
};
