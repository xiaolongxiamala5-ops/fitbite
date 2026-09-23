import fs from 'fs';

// Let's filter top ~50 cleanest lean dishes across categories:
const LEAN_DISH_PATHS: string[] = [
  // Aquatic (10)
  'dishes/aquatic/清蒸生蚝.md',
  'dishes/aquatic/水煮鱼.md',
  'dishes/aquatic/微波葱姜黑鳕鱼.md',
  'dishes/aquatic/葱油桂鱼.md',
  'dishes/aquatic/香煎翘嘴鱼.md',
  'dishes/aquatic/鳊鱼炖豆腐.md',
  'dishes/aquatic/干煎阿根廷红虾/干煎阿根廷红虾.md',
  'dishes/aquatic/蒜香黄油虾.md',
  'dishes/aquatic/阳朔啤酒鱼.md',
  'dishes/aquatic/鲤鱼炖白菜.md',

  // Vegetables & Greens (18)
  'dishes/vegetable_dish/蚝油生菜.md',
  'dishes/vegetable_dish/蒜蓉空心菜.md',
  'dishes/vegetable_dish/菠菜炒鸡蛋.md',
  'dishes/vegetable_dish/西葫芦炒鸡蛋.md',
  'dishes/vegetable_dish/炒青菜.md',
  'dishes/vegetable_dish/凉拌木耳.md',
  'dishes/vegetable_dish/凉拌金针菇.md',
  'dishes/vegetable_dish/凉拌莴笋.md',
  'dishes/vegetable_dish/凉拌油麦菜.md',
  'dishes/vegetable_dish/清炒花菜.md',
  'dishes/vegetable_dish/蒜蓉炒芹菜.md',
  'dishes/vegetable_dish/韭菜炒蛋.md',
  'dishes/vegetable_dish/洋葱炒鸡蛋.md',
  'dishes/vegetable_dish/水油焖蔬菜.md',
  'dishes/vegetable_dish/清蒸南瓜.md',
  'dishes/vegetable_dish/炒滑蛋.md',
  'dishes/vegetable_dish/葱煎豆腐.md',
  'dishes/vegetable_dish/凉拌豆腐.md',

  // Meat / Poultry / Lean Stir Fry (15)
  'dishes/meat_dish/酱牛肉/酱牛肉.md',
  'dishes/meat_dish/孜然牛肉/孜然牛肉.md',
  'dishes/meat_dish/尖椒炒牛肉/尖椒炒牛肉.md',
  'dishes/meat_dish/西红柿牛腩/西红柿牛腩.md',
  'dishes/meat_dish/蒜苔炒肉末/蒜苔炒肉末.md',
  'dishes/meat_dish/香干肉丝/香干肉丝.md',
  'dishes/meat_dish/香干芹菜炒肉/香干芹菜炒肉.md',
  'dishes/meat_dish/黄瓜炒肉/黄瓜炒肉.md',
  'dishes/meat_dish/冬瓜酿肉/冬瓜酿肉.md',
  'dishes/meat_dish/口水鸡/口水鸡.md',
  'dishes/meat_dish/姜葱捞鸡/姜葱捞鸡.md',
  'dishes/meat_dish/冬瓜桑拿鸡/冬瓜桑拿鸡.md',
  'dishes/meat_dish/洋葱炒猪肉/洋葱炒猪肉.md',
  'dishes/meat_dish/西红柿土豆炖牛肉/西红柿土豆炖牛肉.md',
  'dishes/meat_dish/肉饼炖蛋/肉饼炖蛋.md',

  // Soups & Porridge (8)
  'dishes/soup/紫菜蛋花汤/紫菜蛋花汤.md',
  'dishes/soup/西红柿鸡蛋汤/西红柿鸡蛋汤.md',
  'dishes/soup/番茄牛肉蛋花汤/番茄牛肉蛋花汤.md',
  'dishes/soup/黄瓜皮蛋汤/黄瓜皮蛋汤.md',
  'dishes/soup/金针菇汤/金针菇汤.md',
  'dishes/soup/皮蛋瘦肉粥/皮蛋瘦肉粥.md',
  'dishes/soup/昂刺鱼豆腐汤/昂刺鱼豆腐汤.md',
  'dishes/soup/山药南瓜炖鸡汤/山药南瓜炖鸡汤.md',

  // Breakfast (4)
  'dishes/breakfast/茶叶蛋/茶叶蛋.md',
  'dishes/breakfast/完美水煮蛋.md',
  'dishes/breakfast/温泉蛋.md',
  'dishes/breakfast/牛奶燕麦.md'
];

console.log('Total proposed new dishes:', LEAN_DISH_PATHS.length);
fs.writeFileSync('data/proposed_lean_dishes.json', JSON.stringify(LEAN_DISH_PATHS, null, 2), 'utf-8');
