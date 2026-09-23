import fs from 'fs';
import path from 'path';
import { RecipeParser } from './RecipeParser';
import { Normalizer } from './Normalizer';
import { RecipeValidator } from './Validator';

const targets: Array<{ slug: string; name: string; sourceFile: string }> = JSON.parse(
  fs.readFileSync('data/harvest_targets.json', 'utf-8')
);

async function main() {
  const rootDir = process.cwd();
  const rawDir = path.join(rootDir, 'data', 'raw_howtocook');

  const unmappedIngredients = new Set<string>();
  const failedRecipes: Array<{ name: string; slug: string; errors: string[] }> = [];
  const successRecipes: Array<{ name: string; slug: string; calories: number; protein: number }> = [];

  for (const t of targets) {
    const filePath = path.join(rawDir, `${t.slug}.md`);
    if (!fs.existsSync(filePath)) {
      console.error(`File missing: ${filePath}`);
      continue;
    }
    const md = fs.readFileSync(filePath, 'utf-8');
    const source = RecipeParser.parse(md, {
      sourceId: t.slug,
      sourceUrl: `https://github.com/Anduin2017/HowToCook/blob/master/${encodeURI(t.sourceFile)}`,
      sourceFile: t.sourceFile
    });

    const { fitBiteRecipe } = Normalizer.normalize(source);
    const validation = RecipeValidator.validate(fitBiteRecipe);

    // Check ingredients
    for (const ing of fitBiteRecipe.requiredIngredients) {
      if (!ing.id || ing.id.startsWith('unrecognized')) {
        unmappedIngredients.add(ing.name || ing.originalRawText || '');
      }
      if (ing.amount && ing.unit) {
        // test convertToGrams
      }
    }

    if (!validation.isValid || !fitBiteRecipe.nutrition) {
      failedRecipes.push({
        name: fitBiteRecipe.name,
        slug: t.slug,
        errors: validation.errors
      });
      console.log(`[FAIL] ${fitBiteRecipe.name} (${t.slug})`);
      if (validation.errors.length) console.log('  Validation errors:', validation.errors);
      if (!fitBiteRecipe.nutrition) console.log('  Nutrition is NULL! Ingredients:', fitBiteRecipe.requiredIngredients);
    } else {
      successRecipes.push({
        name: fitBiteRecipe.name,
        slug: t.slug,
        calories: fitBiteRecipe.nutrition.calories,
        protein: fitBiteRecipe.nutrition.protein
      });
      console.log(`[PASS] ${fitBiteRecipe.name} (${t.slug}) - ${fitBiteRecipe.nutrition.calories} kcal, ${fitBiteRecipe.nutrition.protein}g protein`);
    }
  }

  console.log('\n=== BATCH HARVEST TEST SUMMARY ===');
  console.log(`Total tested: ${targets.length}`);
  console.log(`Success: ${successRecipes.length}`);
  console.log(`Failed/Needs mapping: ${failedRecipes.length}`);
  console.log(`Unmapped ingredients: ${unmappedIngredients.size}`);
}

main().catch(console.error);
