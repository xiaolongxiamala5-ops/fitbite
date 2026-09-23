import fs from 'fs';
import path from 'path';
import { RecipeParser } from './RecipeParser';
import { Normalizer } from './Normalizer';
import { RecipeValidator } from './Validator';
import { evaluateRecipeNutrition as _evaluateRecipeNutrition } from '../../shared/nutrition';

const targets: Array<{ slug: string; name: string; sourceFile: string }> = JSON.parse(
  fs.readFileSync('data/harvest_targets.json', 'utf-8')
);

async function main() {
  const rootDir = process.cwd();
  const rawDir = path.join(rootDir, 'data', 'raw_howtocook');

  let failCount = 0;
  let passCount = 0;

  for (const t of targets) {
    const filePath = path.join(rawDir, `${t.slug}.md`);
    const md = fs.readFileSync(filePath, 'utf-8');
    const source = RecipeParser.parse(md, {
      sourceId: t.slug,
      sourceUrl: `https://github.com/Anduin2017/HowToCook/blob/master/${encodeURI(t.sourceFile)}`,
      sourceFile: t.sourceFile
    });

    const { fitBiteRecipe } = Normalizer.normalize(source);
    const validation = RecipeValidator.validate(fitBiteRecipe);

    const missingAmountIngs = fitBiteRecipe.requiredIngredients.filter(i => !i.amount || !i.unit);

    if (!validation.isValid || !fitBiteRecipe.nutrition || missingAmountIngs.length > 0) {
      failCount++;
      console.log(`[FAIL #${failCount}] ${fitBiteRecipe.name} (${t.slug})`);
      if (validation.errors.length) console.log(`  Validation: ${validation.errors.join('; ')}`);
      if (missingAmountIngs.length) console.log(`  Missing amount/unit: ${missingAmountIngs.map(i => `${i.name} (raw: ${i.originalRawText})`).join(', ')}`);
      if (!fitBiteRecipe.nutrition) console.log(`  Nutrition is null`);
      console.log(`  Required: ${fitBiteRecipe.requiredIngredients.map(i => `${i.name}(${i.amount}${i.unit})`).join(', ')}`);
      console.log(`  Raw calcs: ${source.rawCalculations.slice(0, 5).join(' | ')}`);
    } else {
      passCount++;
    }
  }
  console.log(`\nSummary: ${passCount} PASSED, ${failCount} FAILED out of ${targets.length}`);
}

main().catch(console.error);
