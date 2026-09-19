import fs from 'fs';
import { FitBiteRecipe } from '../../scripts/pipeline/types';
import { RecipeDatabase } from './RecipeDatabase';
import { RecipeAdapter } from './recipeAdapter';
import { IRecipeSource, ImportSummary, LocalRecipeSourceOptions } from './types';

/**
 * LocalRecipeSource (Node-side Data Source)
 *
 * Provides high-level query and idempotent import interfaces over the SQLite database.
 */
export class LocalRecipeSource implements IRecipeSource {
  public readonly id = 'local_sqlite';
  public readonly name = 'Local SQLite Recipe Source';
  private db: RecipeDatabase;

  constructor(options?: LocalRecipeSourceOptions) {
    const dbPath = options?.dbPath ?? ':memory:';
    this.db = new RecipeDatabase(dbPath);
  }

  public init(): void {
    this.db.init();
  }

  public close(): void {
    this.db.close();
  }

  public count(): number {
    return this.db.count();
  }

  /**
   * Reads a JSON export (e.g. data/recipes_imported.json) and imports into SQLite idempotently.
   */
  public importFromJson(jsonPath: string): ImportSummary {
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON file not found at path: ${jsonPath}`);
    }

    const content = fs.readFileSync(jsonPath, 'utf-8');
    const recipes = JSON.parse(content) as FitBiteRecipe[];

    const summary: ImportSummary = {
      totalInJson: recipes.length,
      inserted: 0,
      updated: 0,
      skipped: 0
    };

    for (const recipe of recipes) {
      const { recipeRow, ingredientRows } = RecipeAdapter.toDatabaseRows(recipe);
      const res = this.db.saveRecipe(recipeRow, ingredientRows);

      if (res === 'inserted') {
        summary.inserted++;
      } else if (res === 'updated') {
        summary.updated++;
      } else if (res === 'skipped') {
        summary.skipped++;
      }
    }

    return summary;
  }

  public getAllRecipes(): FitBiteRecipe[] {
    const rows = this.db.getAllRecipes();
    return rows.map(r => RecipeAdapter.toFitBiteRecipe(r));
  }

  public getRecipeById(id: string): FitBiteRecipe | null {
    const row = this.db.getRecipeById(id);
    return row ? RecipeAdapter.toFitBiteRecipe(row) : null;
  }

  public findRecipesByCanonicalIds(canonicalIds: string[]): FitBiteRecipe[] {
    const recipeIds = this.db.findRecipeIdsByCanonicalIds(canonicalIds);
    return recipeIds
      .map(id => this.getRecipeById(id))
      .filter((r): r is FitBiteRecipe => r !== null);
  }
}
