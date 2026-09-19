import { createRequire } from 'module';
import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';
import { RecipeRow, RecipeIngredientRow } from './types';

const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync } = nodeRequire('node:sqlite') as { DatabaseSync: typeof DatabaseSyncType };

/**
 * SQLite database wrapper for FitBite Local Recipe Storage (C.1.2)
 *
 * Design features:
 * - Uses Node.js 24 native `node:sqlite` (zero third-party C++ dependencies)
 * - Deterministic schema without dynamic timestamp columns (no created_at/updated_at diffs)
 * - Composite primary key `(recipe_id, group_index, option_index)` preserving multi-group & anyOf slots
 * - Atomic transaction support for idempotent batch imports
 */
export class RecipeDatabase {
  private db: DatabaseSyncType;
  private readonly dbPath: string;

  constructor(dbPath: string = ':memory:') {
    this.dbPath = dbPath;
    this.db = new DatabaseSync(dbPath);
    this.init();
  }

  public init(): void {
    // 1. 菜谱核心主表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        cooking_method TEXT,
        difficulty TEXT,
        raw_difficulty TEXT,
        servings INTEGER,
        estimated_minutes INTEGER,
        source TEXT NOT NULL,
        source_id TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        instructions_json TEXT NOT NULL,
        pantry_ingredients_json TEXT NOT NULL,
        required_ingredients_json TEXT NOT NULL,
        provenance_json TEXT NOT NULL,
        nutrition_json TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_recipes_source_id ON recipes(source, source_id);
      CREATE INDEX IF NOT EXISTS idx_recipes_content_hash ON recipes(content_hash);
      CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
    `);

    // 2. 食材倒排索引表（主键基于 recipe + group_index + option_index，避免同菜谱多次出现相同 canonical_id 导致冲突）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        recipe_id TEXT NOT NULL,
        group_index INTEGER NOT NULL,
        option_index INTEGER NOT NULL,
        canonical_id TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'single',
        is_primary INTEGER NOT NULL DEFAULT 1,
        original_text TEXT NOT NULL,
        PRIMARY KEY (recipe_id, group_index, option_index),
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_canonical ON recipe_ingredients(canonical_id);
      CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_lookup ON recipe_ingredients(recipe_id, canonical_id);
    `);
  }

  public getRecipeById(id: string): RecipeRow | null {
    const stmt = this.db.prepare('SELECT * FROM recipes WHERE id = ?');
    const row = stmt.get(id) as RecipeRow | undefined;
    return row ?? null;
  }

  public getAllRecipes(): RecipeRow[] {
    const stmt = this.db.prepare('SELECT * FROM recipes ORDER BY id ASC');
    return stmt.all() as unknown as RecipeRow[];
  }

  public count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as cnt FROM recipes');
    const res = stmt.get() as { cnt: number } | undefined;
    return res ? res.cnt : 0;
  }

  public saveRecipe(
    recipeRow: RecipeRow,
    ingredientRows: RecipeIngredientRow[]
  ): 'inserted' | 'updated' | 'skipped' {
    const existing = this.getRecipeById(recipeRow.id);

    if (existing) {
      // 幂等去重：相同 content_hash 跳过写入，避免无意义 I/O
      if (existing.content_hash === recipeRow.content_hash) {
        return 'skipped';
      }

      this.db.exec('BEGIN');
      try {
        const updateStmt = this.db.prepare(`
          UPDATE recipes SET
            name = ?, category = ?, cooking_method = ?, difficulty = ?, raw_difficulty = ?,
            servings = ?, estimated_minutes = ?, source = ?, source_id = ?, content_hash = ?,
            tags_json = ?, instructions_json = ?, pantry_ingredients_json = ?,
            required_ingredients_json = ?, provenance_json = ?, nutrition_json = ?
          WHERE id = ?
        `);
        updateStmt.run(
          recipeRow.name,
          recipeRow.category,
          recipeRow.cooking_method,
          recipeRow.difficulty,
          recipeRow.raw_difficulty,
          recipeRow.servings,
          recipeRow.estimated_minutes,
          recipeRow.source,
          recipeRow.source_id,
          recipeRow.content_hash,
          recipeRow.tags_json,
          recipeRow.instructions_json,
          recipeRow.pantry_ingredients_json,
          recipeRow.required_ingredients_json,
          recipeRow.provenance_json,
          recipeRow.nutrition_json,
          recipeRow.id
        );

        const deleteIngStmt = this.db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?');
        deleteIngStmt.run(recipeRow.id);

        const insertIngStmt = this.db.prepare(`
          INSERT INTO recipe_ingredients (
            recipe_id, group_index, option_index, canonical_id, mode, is_primary, original_text
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const ing of ingredientRows) {
          insertIngStmt.run(
            ing.recipe_id,
            ing.group_index,
            ing.option_index,
            ing.canonical_id,
            ing.mode,
            ing.is_primary,
            ing.original_text
          );
        }

        this.db.exec('COMMIT');
        return 'updated';
      } catch (err) {
        this.db.exec('ROLLBACK');
        throw err;
      }
    } else {
      this.db.exec('BEGIN');
      try {
        const insertStmt = this.db.prepare(`
          INSERT INTO recipes (
            id, name, category, cooking_method, difficulty, raw_difficulty,
            servings, estimated_minutes, source, source_id, content_hash,
            tags_json, instructions_json, pantry_ingredients_json,
            required_ingredients_json, provenance_json, nutrition_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insertStmt.run(
          recipeRow.id,
          recipeRow.name,
          recipeRow.category,
          recipeRow.cooking_method,
          recipeRow.difficulty,
          recipeRow.raw_difficulty,
          recipeRow.servings,
          recipeRow.estimated_minutes,
          recipeRow.source,
          recipeRow.source_id,
          recipeRow.content_hash,
          recipeRow.tags_json,
          recipeRow.instructions_json,
          recipeRow.pantry_ingredients_json,
          recipeRow.required_ingredients_json,
          recipeRow.provenance_json,
          recipeRow.nutrition_json
        );

        const insertIngStmt = this.db.prepare(`
          INSERT INTO recipe_ingredients (
            recipe_id, group_index, option_index, canonical_id, mode, is_primary, original_text
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const ing of ingredientRows) {
          insertIngStmt.run(
            ing.recipe_id,
            ing.group_index,
            ing.option_index,
            ing.canonical_id,
            ing.mode,
            ing.is_primary,
            ing.original_text
          );
        }

        this.db.exec('COMMIT');
        return 'inserted';
      } catch (err) {
        this.db.exec('ROLLBACK');
        throw err;
      }
    }
  }

  public findRecipeIdsByCanonicalIds(canonicalIds: string[]): string[] {
    if (!canonicalIds || canonicalIds.length === 0) return [];
    const placeholders = canonicalIds.map(() => '?').join(',');
    const stmt = this.db.prepare(
      `SELECT DISTINCT recipe_id FROM recipe_ingredients WHERE canonical_id IN (${placeholders}) ORDER BY recipe_id ASC`
    );
    const rows = stmt.all(...canonicalIds) as unknown as { recipe_id: string }[];
    return rows.map(r => r.recipe_id);
  }

  public close(): void {
    this.db.close();
  }

  public getDbPath(): string {
    return this.dbPath;
  }
}
