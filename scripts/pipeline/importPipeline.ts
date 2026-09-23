import fs from 'fs';
import path from 'path';
import { RecipeParser } from './RecipeParser';
import { Normalizer } from './Normalizer';
import { RecipeValidator } from './Validator';
import { FitBiteRecipe } from './types';

interface RecipeManifestItem {
  slug: string;
  sourceFile: string;
  sourceUrl: string;
}

const MANIFEST: RecipeManifestItem[] = [
  {
    slug: 'tomato_scrambled_eggs',
    sourceFile: 'dishes/vegetable_dish/西红柿炒鸡蛋.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/vegetable_dish/%E8%A5%BF%E7%BA%A2%E6%9F%BF%E7%82%92%E9%B8%A1%E8%9B%8B.md'
  },
  {
    slug: 'garlic_broccoli',
    sourceFile: 'dishes/vegetable_dish/蒜蓉西兰花.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/vegetable_dish/%E8%92%9C%E8%93%89%E8%A5%BF%E5%85%B0%E8%8A%B1.md'
  },
  {
    slug: 'cold_shredded_chicken',
    sourceFile: 'dishes/meat_dish/凉拌鸡丝/凉拌鸡丝.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/meat_dish/%E5%87%89%E6%8B%8C%E9%B8%A1%E4%B8%9D/%E5%87%89%E6%8B%8C%E9%B8%A1%E4%B8%9D.md'
  },
  {
    slug: 'kung_pao_chicken',
    sourceFile: 'dishes/meat_dish/宫保鸡丁/宫保鸡丁.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/meat_dish/%E5%AE%AB%E4%BF%9D%E9%B8%A1%E4%B8%81/%E5%AE%AB%E4%BF%9D%E9%B8%A1%E4%B8%81.md'
  },
  {
    slug: 'boiled_shrimp',
    sourceFile: 'dishes/aquatic/白灼虾/白灼虾.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/aquatic/%E7%99%BD%E7%81%BC%E8%99%BE/%E7%99%BD%E7%81%BC%E8%99%BE.md'
  },
  {
    slug: 'braised_prawns',
    sourceFile: 'dishes/aquatic/油焖大虾/油焖大虾.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/aquatic/%E6%B2%B9%E7%84%96%E5%A4%A7%E8%99%BE/%E6%B2%B9%E7%84%96%E5%A4%A7%E8%99%BE.md'
  },
  {
    slug: 'garlic_shrimp',
    sourceFile: 'dishes/aquatic/蒜蓉虾/蒜蓉虾.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/aquatic/%E8%92%9C%E8%93%89%E8%99%BE/%E8%92%9C%E8%93%89%E8%99%BE.md'
  },
  {
    slug: 'mapo_tofu',
    sourceFile: 'dishes/meat_dish/麻婆豆腐/麻婆豆腐.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/meat_dish/%E9%BA%BB%E5%A9%86%E8%B1%86%E8%85%90/%E9%BA%BB%E5%A9%86%E8%B1%86%E8%85%90.md'
  },
  {
    slug: 'century_egg_tofu',
    sourceFile: 'dishes/vegetable_dish/皮蛋豆腐.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/vegetable_dish/%E7%9A%AE%E8%9B%8B%E8%B1%86%E8%85%90.md'
  },
  {
    slug: 'pepper_potato_pork',
    sourceFile: 'dishes/meat_dish/青椒土豆炒肉/青椒土豆炒肉.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/meat_dish/%E9%9D%92%E6%84%92%E5%9C%9F%E8%B1%86%E7%82%92%E8%82%89/%E9%9D%92%E6%84%92%E5%9C%9F%E8%B1%86%E7%82%92%E8%82%89.md'
  },
  {
    slug: 'tiger_skin_pepper',
    sourceFile: 'dishes/vegetable_dish/虎皮青椒/虎皮青椒.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/vegetable_dish/%E8%99%8E%E7%9A%AE%E9%9D%92%E6%84%92/%E8%99%8E%E7%9A%AE%E9%9D%92%E6%84%92.md'
  },
  {
    slug: 'steamed_egg_custard',
    sourceFile: 'dishes/vegetable_dish/鸡蛋羹/鸡蛋羹.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/vegetable_dish/%E9%B8%A1%E8%9B%8B%E7%BE%B9/%E9%B8%A1%E8%9B%8B%E7%BE%B9.md'
  },
  {
    slug: 'cold_cucumber',
    sourceFile: 'dishes/vegetable_dish/凉拌黄瓜.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/vegetable_dish/%E5%87%89%E6%8B%8C%E9%BB%84%E7%瓜.md'
  },
  {
    slug: 'steamed_sea_bass',
    sourceFile: 'dishes/aquatic/清蒸鲈鱼/清蒸鲈鱼.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/aquatic/%E6%B8%85%E8%92%B8%E9%B2%88%E9%B1%BC/%E6%B8%85%E8%92%B8%E9%B2%88%E9%B1%BC.md'
  },
  {
    slug: 'oyster_sauce_mushrooms',
    sourceFile: 'dishes/vegetable_dish/蚝油三鲜菇/蚝油三鲜菇.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/vegetable_dish/%E8%90%BD%E6%B2%B9%E4%B8%89%E9%B2%9C%E8%8F%87/%E8%90%BD%E6%B2%B9%E4%B8%89%E9%B2%9C%E8%8F%87.md'
  },
  {
    slug: 'black_pepper_beef',
    sourceFile: 'dishes/meat_dish/黑椒牛柳/黑椒牛柳.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/meat_dish/%E9%BB%91%E6%84%92%E7%89%9B%E6%9F%B3/%E9%BB%91%E6%84%92%E7%89%9B%E6%9F%B3.md'
  },
  {
    slug: 'stir_fried_beef',
    sourceFile: 'dishes/meat_dish/小炒黄牛肉/小炒黄牛肉.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/meat_dish/%E5%B0%8F%E7%82%92%E9%BB%84%E7%89%9B%E8%82%89/%E5%B0%8F%E7%82%92%E9%BB%84%E7%89%9B%E8%82%89.md'
  },
  {
    slug: 'chicken_with_mushrooms',
    sourceFile: 'dishes/meat_dish/香菇滑鸡/香菇滑鸡.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/meat_dish/%E9%A6%99%E8%8F%87%E6%BB%91%E9%B8%A1/%E9%A6%99%E8%8F%87%E6%BB%91%E9%B8%A1.md'
  },
  {
    slug: 'boiled_choy_sum',
    sourceFile: 'dishes/vegetable_dish/白灼菜心/白灼菜心.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/vegetable_dish/%E7%99%BD%E7%81%BC%E8%8F%9C%E5%BF%83/%E7%99%BD%E7%81%BC%E8%8F%9C%E5%BF%83.md'
  },
  {
    slug: 'shredded_cabbage',
    sourceFile: 'dishes/vegetable_dish/手撕包菜/手撕包菜.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/vegetable_dish/%E6%89%8B%E6%92%95%E5%8C%85%E8%8F%9C/%E6%89%8B%E6%92%95%E5%8C%85%E8%8F%9C.md'
  },
  {
    slug: 'baby_cabbage_in_broth',
    sourceFile: 'dishes/vegetable_dish/上汤娃娃菜/上汤娃娃菜.md',
    sourceUrl: 'https://github.com/Anduin2017/HowToCook/blob/master/dishes/vegetable_dish/%E4%B8%8A%E6%B1%A4%E5%A8%83%E5%A8%83%E8%8F%9C/%E4%B8%8A%E6%B1%A4%E5%A8%83%E5%A8%83%E8%8F%9C.md'
  }
];

export function runPipeline(): {
  success: boolean;
  total: number;
  imported: FitBiteRecipe[];
  failed: Array<{ slug: string; errors: string[] }>;
} {
  const rootDir = process.cwd();
  const rawDir = path.join(rootDir, 'data', 'raw_howtocook');

  const importedList: FitBiteRecipe[] = [];
  const failedList: Array<{ slug: string; errors: string[] }> = [];

  console.log(`\n=== FitBite Recipe Import Pipeline MVP (C.1.1) ===`);
  console.log(`Starting import for ${MANIFEST.length} real HowToCook recipes...\n`);

  for (const item of MANIFEST) {
    const filePath = path.join(rawDir, `${item.slug}.md`);
    if (!fs.existsSync(filePath)) {
      console.error(`[FAIL] File not found: ${filePath}`);
      failedList.push({ slug: item.slug, errors: [`文件不存在: ${filePath}`] });
      continue;
    }

    const rawMarkdown = fs.readFileSync(filePath, 'utf-8');

    // 1. Parser (Markdown -> SourceRecipe with SHA-256)
    const sourceRecipe = RecipeParser.parse(rawMarkdown, {
      sourceId: item.slug,
      sourceUrl: item.sourceUrl,
      sourceFile: item.sourceFile
    });

    // 2. Normalizer (SourceRecipe -> NormalizedRecipe + FitBiteRecipe)
    const { fitBiteRecipe } = Normalizer.normalize(sourceRecipe);

    // 3. Validator (FitBiteRecipe schema, safety & provenance checks)
    const validation = RecipeValidator.validate(fitBiteRecipe);

    if (validation.isValid) {
      importedList.push(fitBiteRecipe);
      console.log(
        `[PASS] ${fitBiteRecipe.name} (${fitBiteRecipe.id}) | 食材: ${fitBiteRecipe.requiredIngredients.map(i => i.name).join(', ')} | 调料数: ${fitBiteRecipe.pantryIngredients.length} | 步骤: ${fitBiteRecipe.instructions.length}`
      );
    } else {
      console.error(`[FAIL] ${fitBiteRecipe.name} (${item.slug}):`, validation.errors);
      failedList.push({ slug: item.slug, errors: validation.errors });
    }
  }

  // 输出统计信息
  console.log(`\n=== Import Pipeline Summary ===`);
  console.log(`Total scanned: ${MANIFEST.length}`);
  console.log(`Success: ${importedList.length}`);
  console.log(`Failed: ${failedList.length}`);

  // 4. 写入 recipes_imported.json (统一单一收口至 data 目录)
  const outputPathData = path.join(rootDir, 'data', 'recipes_imported.json');

  const jsonString = JSON.stringify(importedList, null, 2);
  fs.writeFileSync(outputPathData, jsonString, 'utf-8');

  console.log(`\nWritten to: ${outputPathData}`);

  return {
    success: failedList.length === 0,
    total: MANIFEST.length,
    imported: importedList,
    failed: failedList
  };
}

// CLI 执行入口
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('importPipeline.ts')) {
  runPipeline();
}
