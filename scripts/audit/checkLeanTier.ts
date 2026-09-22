/**
 * 临时脚本：打印所有导入菜谱当前的 calorieTier，
 * 并验证油焖/炸类菜品是否被错误标为 lean_choice
 */
import fs from 'fs';
import path from 'path';

interface NutritionData {
  calories?: number;
  fat?: number;
  protein?: number;
  carbs?: number;
}

function getCalorieTier(nutrition?: NutritionData | null, fallback = 0): string {
  const calories = nutrition?.calories ?? fallback;
  const fat = nutrition?.fat ?? 0;
  if (calories > 550 || fat > 25) return 'cheat_or_share';
  if (calories > 0) {
    const fatEnergyRatio = (fat * 9 / calories) * 100;
    if (calories <= 200 || (calories <= 350 && fatEnergyRatio <= 35)) return 'lean_choice';
  }
  return 'balanced';
}

// 油焖/炸/拔丝类禁止打 lean_choice 的关键词集合
const HEAVY_OIL_KEYWORDS = ['油焖', '油炸', '炸', '拔丝', '锅包', '红烧', '扣肉', '东坡'];

const jsonPath = path.join(process.cwd(), 'data', 'recipes_imported.json');
const recipes = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as any[];

const SEPARATOR = '──────────────────────────────────────────────────────────';

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║  减脂优选标签审计报告 (C.1.3)                            ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

const problemRecipes: string[] = [];

for (const r of recipes) {
  const tier = getCalorieTier(r.nutrition);
  const isHeavyOil = HEAVY_OIL_KEYWORDS.some(k => r.name.includes(k) || (r.cookingMethod || '').includes(k));
  const wrongLean = tier === 'lean_choice' && isHeavyOil;

  const icon = wrongLean ? '❌' : tier === 'lean_choice' ? '✅' : tier === 'cheat_or_share' ? '🔴' : '⚪';
  const tierLabel = { lean_choice: '减脂优选', balanced: '家常均衡', cheat_or_share: '高能分食' }[tier as string] || tier;
  
  const cal = r.nutrition?.calories ?? 'N/A';
  const fat = r.nutrition?.fat ?? 'N/A';
  const method = r.cookingMethod ?? '-';
  
  console.log(`${icon} ${r.name}`);
  console.log(`   tier=${tierLabel}  calories=${cal} kcal  fat=${fat}g  method=${method}`);
  if (wrongLean) {
    console.log(`   🚨 BUG: 重油类菜品被错误标为「减脂优选」！`);
    problemRecipes.push(r.name);
  }
}

console.log(`\n${SEPARATOR}`);
if (problemRecipes.length === 0) {
  console.log('🎉 所有菜品的「减脂优选」标签均合法，无错标问题。');
} else {
  console.log(`❌ 发现 ${problemRecipes.length} 道菜品错标：`);
  problemRecipes.forEach(n => console.log(`   - ${n}`));
}
console.log('');
