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

export function runImportedRecipesEvaluation(options?: {
  foodLookup?: (idOrName: string) => NutritionFood | undefined;
}): RecipeNutritionEvaluationResult[] {
  const root = path.resolve(__dirname, '../..');
  const recipesPath = path.join(root, 'data', 'recipes_imported.json');
  const generatedFoodsPath = path.join(root, 'data', 'nutrition', 'generated', 'nutrition_foods.json');

  if (!fs.existsSync(recipesPath)) {
    throw new Error(`Recipes file not found at: ${recipesPath}`);
  }

  const rawRecipes = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
  const benchmarkIds = new Set([
    'imported_howtocook_tomato_scrambled_eggs',
    'imported_howtocook_garlic_broccoli',
    'imported_howtocook_cold_shredded_chicken',
    'imported_howtocook_kung_pao_chicken',
    'imported_howtocook_boiled_shrimp',
    'imported_howtocook_braised_prawns',
    'imported_howtocook_garlic_shrimp',
    'imported_howtocook_mapo_tofu',
    'imported_howtocook_century_egg_tofu',
    'imported_howtocook_pepper_potato_pork',
    'imported_howtocook_tiger_skin_pepper',
    'imported_howtocook_steamed_egg_custard',
    'imported_howtocook_cold_cucumber',
    'imported_howtocook_steamed_sea_bass',
    'imported_howtocook_oyster_sauce_mushrooms',
    'imported_howtocook_black_pepper_beef',
    'imported_howtocook_stir_fried_beef',
    'imported_howtocook_chicken_with_mushrooms',
    'imported_howtocook_boiled_choy_sum',
    'imported_howtocook_shredded_cabbage',
    'imported_howtocook_baby_cabbage_in_broth'
  ]);
  const benchmarkRecipes = rawRecipes.filter((r: any) => benchmarkIds.has(r.id));
  const recipes = benchmarkRecipes.length === 21 ? benchmarkRecipes : rawRecipes.slice(0, 21);

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

  const defaultFoodLookup = (idOrName: string): NutritionFood | undefined => {
    const foodCode = canonicalMap.get(idOrName);
    if (foodCode) {
      return foodsMap.get(foodCode);
    }
    return undefined;
  };
  const foodLookup = options?.foodLookup ?? defaultFoodLookup;

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
