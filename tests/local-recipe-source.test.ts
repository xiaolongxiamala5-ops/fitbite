import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';
import { LocalRecipeSource } from '../server/data/LocalRecipeSource';
import { RecipeDatabase } from '../server/data/RecipeDatabase';
import { RecipeAdapter } from '../server/data/recipeAdapter';
import { FitBiteRecipe } from '../scripts/pipeline/types';

describe('LocalRecipeSource & SQLite Data Layer Test Suite (C.1.2)', () => {
  const jsonPath = path.join(process.cwd(), 'data', 'recipes_imported.json');
  let source: LocalRecipeSource;

  beforeEach(() => {
    // 每次测试使用独立的内存数据库，保证完全隔离
    source = new LocalRecipeSource({ dbPath: ':memory:' });
  });

  afterEach(() => {
    source.close();
  });

  describe('1. Schema & In-Memory Database Initialization', () => {
    it('1.1 内存数据库初始化成功，初始菜谱数为 0', () => {
      expect(source.count()).toBe(0);
      expect(source.getAllRecipes()).toEqual([]);
    });

    it('1.2 严格遵守无动态时间戳护栏：数据表结构中不得含有 created_at 或 updated_at', () => {
      const recipeDb = new RecipeDatabase(':memory:');
      recipeDb.init();

      // 查询 SQLite 表元数据
      const rawDb = (recipeDb as any).db as DatabaseSyncType;
      const columns = rawDb.prepare('PRAGMA table_info(recipes)').all() as Array<{ name: string }>;
      const columnNames = columns.map(c => c.name);

      expect(columnNames).not.toContain('created_at');
      expect(columnNames).not.toContain('updated_at');

      // 验证核心字段存在
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('content_hash');
      expect(columnNames).toContain('required_ingredients_json');
      expect(columnNames).toContain('provenance_json');

      recipeDb.close();
    });

    it('1.3 recipe_ingredients 复合主键包含 group_index 与 option_index，避免同食材冲突', () => {
      const recipeDb = new RecipeDatabase(':memory:');
      recipeDb.init();

      const rawDb = (recipeDb as any).db as DatabaseSyncType;
      const columns = rawDb.prepare('PRAGMA table_info(recipe_ingredients)').all() as Array<{ name: string; pk: number }>;

      // 验证复合主键由 (recipe_id, group_index, option_index) 组成
      const pkColumns = columns.filter(c => c.pk > 0).map(c => c.name);
      expect(pkColumns).toContain('recipe_id');
      expect(pkColumns).toContain('group_index');
      expect(pkColumns).toContain('option_index');
      // canonical_id 绝不是唯一主键，仅作为普通检索字段
      expect(pkColumns).not.toContain('canonical_id');

      recipeDb.close();
    });
  });

  describe('2. JSON to SQLite Import & Idempotency Guardrails', () => {
    it('2.1 正确将 15 道真实菜谱导入 SQLite，入库数与文件完全一致', () => {
      const summary = source.importFromJson(jsonPath);

      expect(summary.totalInJson).toBe(15);
      expect(summary.inserted).toBe(15);
      expect(summary.updated).toBe(0);
      expect(summary.skipped).toBe(0);
      expect(source.count()).toBe(15);
    });

    it('2.2 幂等性强断言：重复导入相同 content_hash 的菜谱时，必须完全跳过且不产生重复数据', () => {
      const firstRun = source.importFromJson(jsonPath);
      expect(firstRun.inserted).toBe(15);
      expect(source.count()).toBe(15);

      // 第二次导入
      const secondRun = source.importFromJson(jsonPath);
      expect(secondRun.totalInJson).toBe(15);
      expect(secondRun.inserted).toBe(0);
      expect(secondRun.updated).toBe(0);
      expect(secondRun.skipped).toBe(15);

      // 记录总数依然严格保持 15，绝不膨胀翻倍
      expect(source.count()).toBe(15);
    });
  });

  describe('3. High Fidelity Data Roundtrip & Provenance Preservation', () => {
    it('3.1 宫保鸡丁完整字段往返转换无损：保留 anyOf、独立数量单位、出处与空营养素', () => {
      source.importFromJson(jsonPath);

      const kungPao = source.getRecipeById('imported_howtocook_kung_pao_chicken');
      expect(kungPao).not.toBeNull();
      if (!kungPao) return;

      expect(kungPao.id).toBe('imported_howtocook_kung_pao_chicken');
      expect(kungPao.name).toBe('宫保鸡丁');
      expect(kungPao.category).toBe('家常热菜');
      expect(kungPao.cookingMethod).toBe('炒');
      expect(kungPao.difficulty).toBe('困难');
      expect(kungPao.rawDifficulty).toBe('★★★★');

      // 营养估算脱困验证
      expect(kungPao.nutrition).not.toBeNull();
      expect(kungPao.nutrition?.confidence).toBe('estimated');
      expect(kungPao.nutrition?.calories).toBeGreaterThan(0);

      // 出处严格保留
      expect(kungPao.provenance.source).toBe('howtocook');
      expect(kungPao.provenance.sourceId).toBe('kung_pao_chicken');
      expect(kungPao.provenance.license).toBe('CC-BY-4.0');
      expect(kungPao.provenance.contentHash).toMatch(/^[a-f0-9]{64}$/);

      // anyOf 食材替代组及独立单位数量核对
      expect(kungPao.requiredIngredients.length).toBe(2);
      const chickenItem = kungPao.requiredIngredients[0];
      expect(chickenItem.originalRawText).toBe('手枪腿（或者鸡胸脯肉）');
      expect(chickenItem.mode).toBe('anyOf');
      expect(chickenItem.alternatives).toBeDefined();
      expect(chickenItem.alternatives?.length).toBe(2);

      const legOption = chickenItem.alternatives?.find(a => a.id === 'p_chicken_leg');
      expect(legOption).toBeDefined();
      expect(legOption?.name).toBe('鸡腿肉');
      expect(legOption?.amount).toBe(1);
      expect(legOption?.unit).toBe('支');

      const breastOption = chickenItem.alternatives?.find(a => a.id === 'p_chicken_breast');
      expect(breastOption).toBeDefined();
      expect(breastOption?.name).toBe('鸡胸肉');
      expect(breastOption?.amount).toBeUndefined();
      expect(breastOption?.unit).toBeUndefined();

      // 花生米（普通 single 食材，厨房合理配比 30g）
      const peanutItem = kungPao.requiredIngredients[1];
      expect(peanutItem.id).toBe('other_peanut');
      expect(peanutItem.amount).toBe(30);
      expect(peanutItem.unit).toBe('g');

      // 步骤与调料
      expect(kungPao.instructions.length).toBe(21);
      expect(kungPao.pantryIngredients.length).toBe(13);
    });

    it('3.2 Adapter 单独验证：FitBiteRecipe 与 SQLite Row 双向转换具备 100% 幂等与保真性', () => {
      const rawJson = fs.readFileSync(jsonPath, 'utf-8');
      const allOriginal = JSON.parse(rawJson) as FitBiteRecipe[];

      allOriginal.forEach(original => {
        const { recipeRow } = RecipeAdapter.toDatabaseRows(original);
        const restored = RecipeAdapter.toFitBiteRecipe(recipeRow);

        expect(restored.id).toBe(original.id);
        expect(restored.name).toBe(original.name);
        expect(restored.requiredIngredients).toEqual(original.requiredIngredients);
        expect(restored.pantryIngredients).toEqual(original.pantryIngredients);
        expect(restored.instructions).toEqual(original.instructions);
        expect(restored.provenance).toEqual(original.provenance);
        expect(restored.nutrition).toEqual(original.nutrition);
      });
    });
  });

  describe('4. Canonical Inverted Index & Ingredient Querying', () => {
    beforeEach(() => {
      source.importFromJson(jsonPath);
    });

    it('4.1 按主选食材 p_chicken_leg 查询，能准确命中宫保鸡丁', () => {
      const matches = source.findRecipesByCanonicalIds(['p_chicken_leg']);
      const names = matches.map(r => r.name);

      expect(names).toContain('宫保鸡丁');
    });

    it('4.2 按替代食材 p_chicken_breast 查询，能同时命中宫保鸡丁（二选一替代）与凉拌鸡丝（主食材）', () => {
      const matches = source.findRecipesByCanonicalIds(['p_chicken_breast']);
      const names = matches.map(r => r.name);

      expect(names).toContain('宫保鸡丁');
      expect(names).toContain('凉拌鸡丝');
    });

    it('4.3 按鲜虾 p_shrimp_whole 查询，能命中所有鲜虾类菜谱', () => {
      const matches = source.findRecipesByCanonicalIds(['p_shrimp_whole']);
      const names = matches.map(r => r.name);

      expect(names).toContain('白灼虾');
      expect(names).toContain('油焖大虾');
      expect(names).toContain('蒜蓉虾');
    });

    it('4.4 查询不存在的食材 canonical ID 时返回空数组，不报错', () => {
      const matches = source.findRecipesByCanonicalIds(['non_existent_ingredient_key']);
      expect(matches).toEqual([]);
    });

    it('4.5 空数组入参直接返回空数组', () => {
      const matches = source.findRecipesByCanonicalIds([]);
      expect(matches).toEqual([]);
    });
  });

  describe('5. Clean-Slate File-Based Database Lifecycle & Idempotency', () => {
    const tempDbPath = path.join(process.cwd(), 'data', `temp_test_${Date.now()}.db`);

    afterEach(() => {
      // 必须在测试完成后彻底清理临时数据库及 journal 文件
      if (fs.existsSync(tempDbPath)) {
        try {
          fs.unlinkSync(tempDbPath);
        } catch {
          // ignore
        }
      }
      const journalPath = `${tempDbPath}-journal`;
      if (fs.existsSync(journalPath)) {
        try {
          fs.unlinkSync(journalPath);
        } catch {
          // ignore
        }
      }
    });

    it('5.1 从零开始创建基于文件的数据库：验证创建、15 道菜导入、索引反查、幂等性与测试后清理', () => {
      // 1. 强断言：开始前临时文件绝不存在
      expect(fs.existsSync(tempDbPath)).toBe(false);

      // 2. 初始化本地数据源并导入数据
      const fileSource = new LocalRecipeSource({ dbPath: tempDbPath });
      try {
        expect(fs.existsSync(tempDbPath)).toBe(true);

        const summary1 = fileSource.importFromJson(jsonPath);
        expect(summary1.totalInJson).toBe(15);
        expect(summary1.inserted).toBe(15);
        expect(fileSource.count()).toBe(15);

        // 3. 验证 anyOf 关系与 canonical 索引在新创建的文件数据库中正常工作
        const chickenMatches = fileSource.findRecipesByCanonicalIds(['p_chicken_breast']);
        expect(chickenMatches.map(r => r.name)).toContain('宫保鸡丁');
        expect(chickenMatches.map(r => r.name)).toContain('凉拌鸡丝');

        const kungPao = fileSource.getRecipeById('imported_howtocook_kung_pao_chicken');
        expect(kungPao).not.toBeNull();
        expect(kungPao?.provenance.source).toBe('howtocook');
        expect(kungPao?.requiredIngredients[0].mode).toBe('anyOf');
        expect(kungPao?.nutrition).not.toBeNull();
        expect(kungPao?.nutrition?.confidence).toBe('estimated');
        expect(kungPao?.nutrition?.calories).toBeGreaterThan(0);

        // 4. 验证文件数据库上的重复导入幂等性
        const summary2 = fileSource.importFromJson(jsonPath);
        expect(summary2.inserted).toBe(0);
        expect(summary2.skipped).toBe(15);
        expect(fileSource.count()).toBe(15);
      } finally {
        fileSource.close();
      }

      // 5. 验证清理
      fs.unlinkSync(tempDbPath);
      expect(fs.existsSync(tempDbPath)).toBe(false);
    });
  });
});
