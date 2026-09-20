import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  evaluateRecipeNutrition,
  RecipeNutritionEvaluationResult
} from '../../shared/nutrition';
import { CANONICAL_TO_SANOTSU } from '../../data/nutrition/mappings/canonical-to-sanotsu';
import { NutritionFood } from '../../shared/nutrition/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runImportedRecipesEvaluation(): RecipeNutritionEvaluationResult[] {
  const root = path.resolve(__dirname, '../..');
  const recipesPath = path.join(root, 'data', 'recipes_imported.json');
  const generatedFoodsPath = path.join(root, 'data', 'nutrition', 'generated', 'nutrition_foods.json');

  if (!fs.existsSync(recipesPath)) {
    throw new Error(`Recipes file not found at: ${recipesPath}`);
  }

  const recipes = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));

  // Load food lookup if available
  let foodsMap = new Map<string, NutritionFood>();
  if (fs.existsSync(generatedFoodsPath)) {
    const foods: NutritionFood[] = JSON.parse(fs.readFileSync(generatedFoodsPath, 'utf8'));
    for (const f of foods) {
      foodsMap.set(f.foodCode, f);
    }
  }

  // Canonical mapping lookup
  const canonicalMap = new Map<string, string>();
  for (const m of CANONICAL_TO_SANOTSU) {
    canonicalMap.set(m.canonicalId, m.foodCode);
  }

  const foodLookup = (idOrName: string): NutritionFood | undefined => {
    const foodCode = canonicalMap.get(idOrName);
    if (foodCode) {
      return foodsMap.get(foodCode);
    }
    return undefined;
  };

  const results: RecipeNutritionEvaluationResult[] = [];

  for (const r of recipes) {
    // HowToCook recipes currently lack explicit WeightBasis evidence in source text.
    // Do not inject canonical mapping defaultWeightBasis; unevidenced items must evaluate to 'unknown'.
    const evaluation = evaluateRecipeNutrition(r, {
      foodLookup
    });
    results.push(evaluation);
  }

  return results;
}

// CLI execution
const results = runImportedRecipesEvaluation();
console.log(`\n=== FitBite Imported Recipes Nutrition Evaluation (15 Recipes) ===\n`);

results.forEach((res, i) => {
  console.log(`${i + 1}. [${res.nutritionStatus.toUpperCase()}] ${res.recipeName} (${res.recipeId})`);
  console.log(`   Macro Feasibility:  ${res.canEstimateMacros ? 'ESTIMABLE' : 'BLOCKED'} (Macro Complete: ${res.isMacroComplete ? 'YES' : 'NO'})`);
  console.log(`   Sodium Complete:    ${res.isSodiumComplete ? 'YES' : 'NO'}`);
  if (res.total) {
    console.log(`   Estimated Calories: ${res.total.caloriesKcal} kcal | P: ${res.total.proteinGrams}g, F: ${res.total.fatGrams}g, C: ${res.total.carbGrams}g, Fiber: ${res.total.fiberGrams ?? 'null'}g, Na: ${res.total.sodiumMg ?? 'null'}mg`);
  }
  if (res.incompleteReasons.length > 0) {
    console.log(`   Incomplete Reasons:`);
    res.incompleteReasons.forEach(reason => console.log(`     - ${reason}`));
  }
  if (res.ignoredMinorSeasonings.length > 0) {
    console.log(`   Ignored Minor Seasonings: ${res.ignoredMinorSeasonings.map(s => s.ingredientName).join(', ')}`);
  }
  if (res.unquantifiedSodiumSeasonings.length > 0) {
    console.log(`   Unquantified Sodium Seasonings: ${res.unquantifiedSodiumSeasonings.join(', ')}`);
  }
  console.log('');
});
