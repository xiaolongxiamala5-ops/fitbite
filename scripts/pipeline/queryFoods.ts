import fs from 'fs';

const foods: Array<{ foodCode: string; name: string; edibleFraction: number; per100g: any }> = JSON.parse(
  fs.readFileSync('data/nutrition/generated/nutrition_foods.json', 'utf-8')
);

const queries = [
  '巴沙', '龙利', '鲇鱼', '鲶鱼', '草鱼', '鱼类'
];

for (const q of queries) {
  const matches: any[] = [];
  for (const food of foods) {
    if (food.name && food.name.includes(q)) {
      matches.push({
        code: food.foodCode,
        name: food.name,
        cal: food.per100g?.calories,
        protein: food.per100g?.protein,
        fat: food.per100g?.fat,
        carbs: food.per100g?.carbs,
        edible: food.edibleFraction
      });
    }
  }
  console.log(`\nQuery: [${q}] found ${matches.length} matches:`);
  for (const m of matches.slice(0, 5)) {
    console.log(`  foodCode: '${m.code}', name: '${m.name}', cal: ${m.cal}, P: ${m.protein}, F: ${m.fat}, C: ${m.carbs}, edible: ${m.edible}`);
  }
}
