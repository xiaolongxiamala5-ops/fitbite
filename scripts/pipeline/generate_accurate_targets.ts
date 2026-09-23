import fs from 'fs';

const candidates: Array<{ path: string }> = JSON.parse(fs.readFileSync('data/howtocook_candidates.json', 'utf-8'));

// Desired dish names (pure and lean)
const desiredNames = [
  // Aquatic
  '清蒸生蚝', '水煮鱼', '微波葱姜黑鳕鱼', '葱油桂鱼', '鳊鱼炖豆腐', '蒜香黄油虾', '干煎阿根廷红虾', '鲤鱼炖白菜',
  // Vegetables
  '蚝油生菜', '蒜蓉空心菜', '菠菜炒鸡蛋', '西葫芦炒鸡蛋', '炒青菜', '凉拌木耳', '凉拌金针菇', '凉拌莴笋',
  '凉拌油麦菜', '清炒花菜', '蒜蓉炒芹菜', '韭菜炒蛋', '洋葱炒鸡蛋', '水油焖蔬菜', '清蒸南瓜', '炒滑蛋',
  '葱煎豆腐', '凉拌豆腐',
  // Meat
  '酱牛肉', '孜然牛肉', '尖椒炒牛肉', '西红柿牛腩', '西红柿土豆炖牛肉', '蒜苔炒肉末', '香干肉丝', '香干芹菜炒肉',
  '黄瓜炒肉', '冬瓜酿肉', '冬瓜桑拿鸡', '口水鸡', '姜葱捞鸡', '洋葱炒猪肉', '肉饼炖蛋', '葱烧鸡腿',
  // Soup
  '紫菜蛋花汤', '西红柿鸡蛋汤', '番茄牛肉蛋花汤', '黄瓜皮蛋汤', '金针菇汤', '皮蛋瘦肉粥', '昂刺鱼豆腐汤',
  // Breakfast
  '茶叶蛋', '完美水煮蛋', '温泉蛋', '牛奶燕麦'
];

const slugMap: Record<string, string> = {
  '清蒸生蚝': 'steamed_oysters',
  '水煮鱼': 'boiled_fish_slices',
  '微波葱姜黑鳕鱼': 'microwave_cod',
  '葱油桂鱼': 'scallion_mandarin_fish',
  '鳊鱼炖豆腐': 'braised_carp_tofu',
  '蒜香黄油虾': 'garlic_butter_shrimp',
  '干煎阿根廷红虾': 'pan_fried_red_shrimp',
  '鲤鱼炖白菜': 'carp_with_cabbage',
  '蚝油生菜': 'oyster_sauce_lettuce',
  '蒜蓉空心菜': 'garlic_water_spinach',
  '菠菜炒鸡蛋': 'spinach_scrambled_eggs',
  '西葫芦炒鸡蛋': 'zucchini_scrambled_eggs',
  '炒青菜': 'stir_fried_greens',
  '凉拌木耳': 'cold_black_fungus',
  '凉拌金针菇': 'cold_enoki_mushroom',
  '凉拌莴笋': 'cold_asparagus_lettuce',
  '凉拌油麦菜': 'cold_youmaicai',
  '清炒花菜': 'stir_fried_cauliflower',
  '蒜蓉炒芹菜': 'garlic_celery',
  '韭菜炒蛋': 'chives_scrambled_eggs',
  '洋葱炒鸡蛋': 'onion_scrambled_eggs',
  '水油焖蔬菜': 'water_oil_braised_veg',
  '清蒸南瓜': 'steamed_pumpkin',
  '炒滑蛋': 'scrambled_eggs',
  '葱煎豆腐': 'scallion_pan_fried_tofu',
  '凉拌豆腐': 'cold_tofu',
  '酱牛肉': 'spiced_beef',
  '孜然牛肉': 'cumin_beef',
  '尖椒炒牛肉': 'pepper_stir_fried_beef',
  '西红柿牛腩': 'tomato_beef_sirloin',
  '西红柿土豆炖牛肉': 'tomato_potato_beef',
  '蒜苔炒肉末': 'garlic_moss_minced_pork',
  '香干肉丝': 'dried_tofu_shredded_pork',
  '香干芹菜炒肉': 'dried_tofu_celery_pork',
  '黄瓜炒肉': 'cucumber_stir_fried_pork',
  '冬瓜酿肉': 'winter_melon_stuffed_meat',
  '冬瓜桑拿鸡': 'winter_melon_steamed_chicken',
  '口水鸡': 'saliva_chicken',
  '姜葱捞鸡': 'scallion_oil_chicken',
  '洋葱炒猪肉': 'onion_stir_fried_pork',
  '肉饼炖蛋': 'steamed_meat_patty_egg',
  '葱烧鸡腿': 'scallion_braised_chicken_leg',
  '紫菜蛋花汤': 'seaweed_egg_soup',
  '西红柿鸡蛋汤': 'tomato_egg_soup',
  '番茄牛肉蛋花汤': 'tomato_beef_egg_soup',
  '黄瓜皮蛋汤': 'cucumber_century_egg_soup',
  '金针菇汤': 'enoki_mushroom_soup',
  '皮蛋瘦肉粥': 'century_egg_lean_pork_porridge',
  '昂刺鱼豆腐汤': 'catfish_tofu_soup',
  '茶叶蛋': 'tea_egg',
  '完美水煮蛋': 'perfect_boiled_egg',
  '温泉蛋': 'onsen_tamago',
  '牛奶燕麦': 'milk_oatmeal'
};

const targets: Array<{ slug: string; name: string; sourceFile: string }> = [];

for (const name of desiredNames) {
  const match = candidates.find(c => {
    const filename = c.path.split('/').pop()!.replace('.md', '');
    return filename === name;
  });
  if (match) {
    targets.push({
      slug: slugMap[name] || name,
      name,
      sourceFile: match.path
    });
  } else {
    console.warn('NOT FOUND in repo:', name);
  }
}

console.log('Matched targets count:', targets.length);
fs.writeFileSync('data/harvest_targets.json', JSON.stringify(targets, null, 2), 'utf-8');
