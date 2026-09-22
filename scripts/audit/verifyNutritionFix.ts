/**
 * 营养与热量真实核算机制校验脚本 (C.1.3)
 *
 * 验证《蒜蓉西兰花》与《油焖大虾》等食谱的调料对齐、真实热量、脂肪及健康标签判定结果。
 */

import fs from 'fs';
import path from 'path';
import { getCalorieTier, CALORIE_TIER_CONFIG } from '../../shared/nutrition/healthTier';

interface RecipeItem {
  id: string;
  name: string;
  cookingMethod?: string | null;
  tags?: string[];
  pantryIngredients: string[];
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    isEstimated?: boolean;
  };
}

const jsonPath = path.join(process.cwd(), 'data', 'recipes_imported.json');
const recipes: RecipeItem[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║  FitBite 营养真实核算与减脂优选黑名单校验报告 (C.1.3)                    ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

const targets = ['蒜蓉西兰花', '油焖大虾', '西红柿炒鸡蛋', '凉拌黄瓜', '宫保鸡丁'];

for (const name of targets) {
  const recipe = recipes.find(r => r.name === name);
  if (!recipe) {
    console.log(`未找到食谱：${name}`);
    continue;
  }

  const { calories, fat, protein, carbs } = recipe.nutrition;
  const fatEnergy = fat * 9;
  const fatEnergyRatio = (fatEnergy / calories) * 100;
  const tier = getCalorieTier(recipe.nutrition, calories, {
    name: recipe.name,
    cookingMethod: recipe.cookingMethod,
    tags: recipe.tags
  });
  const tierInfo = CALORIE_TIER_CONFIG[tier];

  console.log(`┌─ 【${recipe.name}】 (${recipe.id})`);
  console.log(`│  调料清单: [${recipe.pantryIngredients.join(', ')}]`);
  console.log(`│  热量数据: ${calories} kcal | 蛋白质: ${protein}g | 脂肪: ${fat}g | 碳水: ${carbs}g`);
  console.log(`│  脂肪供能比: ${fatEnergyRatio.toFixed(1)}%`);
  console.log(`│  标签判定: [${tierInfo.label}] (${tier}) - ${tierInfo.description}`);
  console.log('└─────────────────────────────────────────────────────────────────────────');
}

// 统计全部 15 道食谱的分布
console.log('\n── 全部 15 道导入食谱健康标签分布 ─────────────────────────────────────');
const counts = { lean_choice: 0, balanced: 0, cheat_or_share: 0 };
for (const r of recipes) {
  const tier = getCalorieTier(r.nutrition, r.nutrition?.calories, {
    name: r.name,
    cookingMethod: r.cookingMethod,
    tags: r.tags
  });
  counts[tier]++;
  const mark = tier === 'lean_choice' ? '🟢 减脂优选' : tier === 'cheat_or_share' ? '🔴 建议分食' : '⚪ 家常均衡';
  console.log(`  ${mark} - ${r.name} (${r.nutrition?.calories} kcal, 脂肪 ${r.nutrition?.fat}g)`);
}

console.log(`\n统计汇总：减脂优选: ${counts.lean_choice} | 家常均衡: ${counts.balanced} | 建议分食: ${counts.cheat_or_share}\n`);
