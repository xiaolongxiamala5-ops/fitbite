import fs from 'fs';
import path from 'path';

export interface HarvestTarget {
  slug: string;
  sourceFile: string;
}

export const HARVEST_TARGETS: HarvestTarget[] = [
  // Aquatic (8)
  { slug: 'steamed_oysters', sourceFile: 'dishes/aquatic/清蒸生蚝.md' },
  { slug: 'boiled_fish_slices', sourceFile: 'dishes/aquatic/水煮鱼.md' },
  { slug: 'microwave_cod', sourceFile: 'dishes/aquatic/微波葱姜黑鳕鱼.md' },
  { slug: 'scallion_mandarin_fish', sourceFile: 'dishes/aquatic/葱油桂鱼.md' },
  { slug: 'braised_carp_tofu', sourceFile: 'dishes/aquatic/鳊鱼炖豆腐.md' },
  { slug: 'garlic_butter_shrimp', sourceFile: 'dishes/aquatic/蒜香黄油虾.md' },
  { slug: 'pan_fried_red_shrimp', sourceFile: 'dishes/aquatic/干煎阿根廷红虾/干煎阿根廷红虾.md' },
  { slug: 'carp_with_cabbage', sourceFile: 'dishes/aquatic/鲤鱼炖白菜.md' },

  // Vegetables & Greens (18)
  { slug: 'oyster_sauce_lettuce', sourceFile: 'dishes/vegetable_dish/蚝油生菜.md' },
  { slug: 'garlic_water_spinach', sourceFile: 'dishes/vegetable_dish/蒜蓉空心菜.md' },
  { slug: 'spinach_scrambled_eggs', sourceFile: 'dishes/vegetable_dish/菠菜炒鸡蛋.md' },
  { slug: 'zucchini_scrambled_eggs', sourceFile: 'dishes/vegetable_dish/西葫芦炒鸡蛋.md' },
  { slug: 'stir_fried_greens', sourceFile: 'dishes/vegetable_dish/炒青菜.md' },
  { slug: 'cold_black_fungus', sourceFile: 'dishes/vegetable_dish/凉拌木耳.md' },
  { slug: 'cold_enoki_mushroom', sourceFile: 'dishes/vegetable_dish/凉拌金针菇.md' },
  { slug: 'cold_asparagus_lettuce', sourceFile: 'dishes/vegetable_dish/凉拌莴笋.md' },
  { slug: 'cold_youmaicai', sourceFile: 'dishes/vegetable_dish/凉拌油麦菜.md' },
  { slug: 'stir_fried_cauliflower', sourceFile: 'dishes/vegetable_dish/清炒花菜.md' },
  { slug: 'garlic_celery', sourceFile: 'dishes/vegetable_dish/蒜蓉炒芹菜.md' },
  { slug: 'chives_scrambled_eggs', sourceFile: 'dishes/vegetable_dish/韭菜炒蛋.md' },
  { slug: 'onion_scrambled_eggs', sourceFile: 'dishes/vegetable_dish/洋葱炒鸡蛋.md' },
  { slug: 'water_oil_braised_veg', sourceFile: 'dishes/vegetable_dish/水油焖蔬菜.md' },
  { slug: 'steamed_pumpkin', sourceFile: 'dishes/vegetable_dish/清蒸南瓜.md' },
  { slug: 'scrambled_eggs', sourceFile: 'dishes/vegetable_dish/炒滑蛋.md' },
  { slug: 'scallion_pan_fried_tofu', sourceFile: 'dishes/vegetable_dish/葱煎豆腐.md' },
  { slug: 'cold_tofu', sourceFile: 'dishes/vegetable_dish/凉拌豆腐.md' },

  // Meat / Poultry / Lean Stir Fry (16)
  { slug: 'spiced_beef', sourceFile: 'dishes/meat_dish/酱牛肉/酱牛肉.md' },
  { slug: 'cumin_beef', sourceFile: 'dishes/meat_dish/孜然牛肉/孜然牛肉.md' },
  { slug: 'pepper_stir_fried_beef', sourceFile: 'dishes/meat_dish/尖椒炒牛肉/尖椒炒牛肉.md' },
  { slug: 'tomato_beef_sirloin', sourceFile: 'dishes/meat_dish/西红柿牛腩/西红柿牛腩.md' },
  { slug: 'tomato_potato_beef', sourceFile: 'dishes/meat_dish/西红柿土豆炖牛肉/西红柿土豆炖牛肉.md' },
  { slug: 'garlic_moss_minced_pork', sourceFile: 'dishes/meat_dish/蒜苔炒肉末/蒜苔炒肉末.md' },
  { slug: 'dried_tofu_shredded_pork', sourceFile: 'dishes/meat_dish/香干肉丝/香干肉丝.md' },
  { slug: 'dried_tofu_celery_pork', sourceFile: 'dishes/meat_dish/香干芹菜炒肉/香干芹菜炒肉.md' },
  { slug: 'cucumber_stir_fried_pork', sourceFile: 'dishes/meat_dish/黄瓜炒肉/黄瓜炒肉.md' },
  { slug: 'winter_melon_stuffed_meat', sourceFile: 'dishes/meat_dish/冬瓜酿肉/冬瓜酿肉.md' },
  { slug: 'winter_melon_steamed_chicken', sourceFile: 'dishes/meat_dish/冬瓜桑拿鸡/冬瓜桑拿鸡.md' },
  { slug: 'saliva_chicken', sourceFile: 'dishes/meat_dish/口水鸡/口水鸡.md' },
  { slug: 'scallion_oil_chicken', sourceFile: 'dishes/meat_dish/姜葱捞鸡/姜葱捞鸡.md' },
  { slug: 'onion_stir_fried_pork', sourceFile: 'dishes/meat_dish/洋葱炒猪肉/洋葱炒猪肉.md' },
  { slug: 'steamed_meat_patty_egg', sourceFile: 'dishes/meat_dish/肉饼炖蛋/肉饼炖蛋.md' },
  { slug: 'scallion_braised_chicken_leg', sourceFile: 'dishes/meat_dish/葱烧鸡腿/葱烧鸡腿.md' },

  // Soup (7)
  { slug: 'seaweed_egg_soup', sourceFile: 'dishes/soup/紫菜蛋花汤/紫菜蛋花汤.md' },
  { slug: 'tomato_egg_soup', sourceFile: 'dishes/soup/西红柿鸡蛋汤/西红柿鸡蛋汤.md' },
  { slug: 'tomato_beef_egg_soup', sourceFile: 'dishes/soup/番茄牛肉蛋花汤/番茄牛肉蛋花汤.md' },
  { slug: 'cucumber_century_egg_soup', sourceFile: 'dishes/soup/黄瓜皮蛋汤/黄瓜皮蛋汤.md' },
  { slug: 'enoki_mushroom_soup', sourceFile: 'dishes/soup/金针菇汤/金针菇汤.md' },
  { slug: 'century_egg_lean_pork_porridge', sourceFile: 'dishes/soup/皮蛋瘦肉粥/皮蛋瘦肉粥.md' },
  { slug: 'catfish_tofu_soup', sourceFile: 'dishes/soup/昂刺鱼豆腐汤/昂刺鱼豆腐汤.md' },

  // Breakfast (4)
  { slug: 'tea_egg', sourceFile: 'dishes/breakfast/茶叶蛋/茶叶蛋.md' },
  { slug: 'perfect_boiled_egg', sourceFile: 'dishes/breakfast/完美水煮蛋.md' },
  { slug: 'onsen_tamago', sourceFile: 'dishes/breakfast/温泉蛋.md' },
  { slug: 'milk_oatmeal', sourceFile: 'dishes/breakfast/牛奶燕麦.md' }
];

async function downloadDish(target: HarvestTarget, rawDir: string): Promise<boolean> {
  const targetPath = path.join(rawDir, `${target.slug}.md`);
  if (fs.existsSync(targetPath)) {
    return true;
  }
  const encodedPath = target.sourceFile.split('/').map(encodeURIComponent).join('/');
  const url = `https://raw.githubusercontent.com/Anduin2017/HowToCook/master/${encodedPath}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'FitBite-Harvester' } });
    if (!res.ok) {
      console.error(`Failed ${target.slug} (${res.status}): ${url}`);
      return false;
    }
    const text = await res.text();
    fs.writeFileSync(targetPath, text, 'utf-8');
    console.log(`[DOWNLOADED] ${target.slug} -> ${targetPath}`);
    return true;
  } catch (err) {
    console.error(`Error downloading ${target.slug}:`, err);
    return false;
  }
}

async function main() {
  const rootDir = process.cwd();
  const rawDir = path.join(rootDir, 'data', 'raw_howtocook');
  if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
  }

  console.log(`Harvesting ${HARVEST_TARGETS.length} lean dishes from HowToCook...`);
  let successCount = 0;
  for (const target of HARVEST_TARGETS) {
    const ok = await downloadDish(target, rawDir);
    if (ok) successCount++;
  }
  console.log(`Harvest complete: ${successCount} / ${HARVEST_TARGETS.length} available locally.`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('harvestHowToCook.ts')) {
  main().catch(console.error);
}
