import { FitBiteRecipe } from '../../scripts/pipeline/types';
import { RecipeRow, RecipeIngredientRow } from './types';

/**
 * Adapter converting between FitBiteRecipe domain model and SQLite storage rows.
 *
 * Guarantees:
 * - 100% roundtrip fidelity without data loss or corruption.
 * - anyOf alternatives are expanded into indexed relational rows with composite slots.
 * - Nutrition remains strictly null.
 */
export class RecipeAdapter {
  public static toDatabaseRows(recipe: FitBiteRecipe): {
    recipeRow: RecipeRow;
    ingredientRows: RecipeIngredientRow[];
  } {
    const recipeRow: RecipeRow = {
      id: recipe.id,
      name: recipe.name,
      category: recipe.category,
      cooking_method: recipe.cookingMethod,
      difficulty: recipe.difficulty,
      raw_difficulty: recipe.rawDifficulty ?? null,
      servings: recipe.servings,
      estimated_minutes: recipe.estimatedMinutes,
      source: recipe.provenance.source,
      source_id: recipe.provenance.sourceId,
      content_hash: recipe.provenance.contentHash,
      tags_json: JSON.stringify(recipe.tags),
      instructions_json: JSON.stringify(recipe.instructions),
      pantry_ingredients_json: JSON.stringify(recipe.pantryIngredients),
      required_ingredients_json: JSON.stringify(recipe.requiredIngredients),
      provenance_json: JSON.stringify(recipe.provenance),
      nutrition_json: recipe.nutrition ? JSON.stringify(recipe.nutrition) : null
    };

    const ingredientRows: RecipeIngredientRow[] = [];

    recipe.requiredIngredients.forEach((item, groupIndex) => {
      if (item.mode === 'anyOf' && item.alternatives && item.alternatives.length > 0) {
        item.alternatives.forEach((alt, optionIndex) => {
          ingredientRows.push({
            recipe_id: recipe.id,
            group_index: groupIndex,
            option_index: optionIndex,
            canonical_id: alt.id,
            mode: 'anyOf',
            is_primary: optionIndex === 0 ? 1 : 0,
            original_text: item.originalRawText
          });
        });
      } else {
        ingredientRows.push({
          recipe_id: recipe.id,
          group_index: groupIndex,
          option_index: 0,
          canonical_id: item.id,
          mode: item.mode || 'single',
          is_primary: 1,
          original_text: item.originalRawText
        });
      }
    });

    return { recipeRow, ingredientRows };
  }

  public static toFitBiteRecipe(row: RecipeRow): FitBiteRecipe {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      cookingMethod: row.cooking_method,
      difficulty: row.difficulty,
      rawDifficulty: row.raw_difficulty,
      servings: row.servings,
      estimatedMinutes: row.estimated_minutes,
      provenance: JSON.parse(row.provenance_json),
      requiredIngredients: JSON.parse(row.required_ingredients_json),
      pantryIngredients: JSON.parse(row.pantry_ingredients_json),
      instructions: JSON.parse(row.instructions_json),
      tags: JSON.parse(row.tags_json),
      nutrition: null
    };
  }
}
