import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { resolveCanonical, resolveCanonicalWithOptions } from '../scripts/pipeline/canonicalDictionary';
import { RecipeParser } from '../scripts/pipeline/RecipeParser';
import { Normalizer } from '../scripts/pipeline/Normalizer';
import { RecipeValidator } from '../scripts/pipeline/Validator';
import { runPipeline } from '../scripts/pipeline/importPipeline';
import { FitBiteRecipe, SourceRecipe } from '../scripts/pipeline/types';
import { NutritionFood } from '../shared/nutrition';

// E2E 管线只验证营养注入机制，不依赖被 .gitignore 排除的本地全量营养库。
const pipelineNutritionFixture: NutritionFood = {
  id: 'test:generic-food',
  foodCode: 'test-generic',
  name: '测试食材',
  englishName: null,
  category: 'test-fixture',
  edibleFraction: 1,
  per100g: {
    calories: 100,
    protein: 10,
    fat: 5,
    carbs: 8,
    fiber: 1,
    sodium: 10
  },
  provenance: {
    source: 'china_food_composition_v6',
    commit: 'test-fixture',
    sourceFile: 'tests/pipeline.test.ts',
    rawEdible: '100',
    hasTraceValues: false
  }
};

const pipelineOptions = {
  foodLookup: () => pipelineNutritionFixture
};

describe('FitBite Recipe Import Pipeline Test Suite', () => {

  describe('1. Canonical Ingredient Mapping & Part Separation', () => {
    it('1.1 鸡胸脯肉正确归一化为 p_chicken_breast', () => {
      const res = resolveCanonical('鸡胸脯肉');
      expect(res).not.toBeNull();
      expect(res?.id).toBe('p_chicken_breast');
      expect(res?.name).toBe('鸡胸肉');
    });

    it('1.2 手枪腿属于鸡腿部位，严禁映射为鸡胸肉 p_chicken_breast', () => {
      const res = resolveCanonical('手枪腿');
      expect(res).not.toBeNull();
      expect(res?.id).not.toBe('p_chicken_breast');
      expect(res?.id).toBe('p_chicken_leg');
      expect(res?.name).toBe('鸡腿肉');
    });

    it('1.3 不同鸡肉部位（鸡胸、鸡腿、鸡翅）各自独立，严禁语义泛化合并', () => {
      const breast = resolveCanonical('鸡胸肉');
      const leg = resolveCanonical('鸡腿');
      const wing = resolveCanonical('鸡翅中');

      expect(breast?.id).toBe('p_chicken_breast');
      expect(leg?.id).toBe('p_chicken_leg');
      expect(wing?.id).toBe('p_chicken_wing');

      // 互不相等
      expect(breast?.id).not.toBe(leg?.id);
      expect(breast?.id).not.toBe(wing?.id);
      expect(leg?.id).not.toBe(wing?.id);
    });

    it('1.4 西红柿与番茄为纯同义词，必须归一化到同一个 Canonical ID (v_tomato)', () => {
      const tomato1 = resolveCanonical('西红柿');
      const tomato2 = resolveCanonical('番茄');
      const tomato3 = resolveCanonical('蕃茄');

      expect(tomato1?.id).toBe('v_tomato');
      expect(tomato2?.id).toBe('v_tomato');
      expect(tomato3?.id).toBe('v_tomato');
    });

    it('1.5 鲜虾与剥皮虾仁形态不同，不可互相泛化', () => {
      const whole = resolveCanonical('活虾');
      const peeled = resolveCanonical('虾仁');

      expect(whole?.id).toBe('p_shrimp_whole');
      expect(peeled?.id).toBe('p_shrimp_peeled');
      expect(whole?.id).not.toBe(peeled?.id);
    });

    it('1.6 香菇、蟹味菇、白玉菇不同菇类各自独立，严禁被压缩合并为单个菌菇', () => {
      const shiitake = resolveCanonical('香菇');
      const shimeji = resolveCanonical('蟹味菇');
      const beech = resolveCanonical('白玉菇');

      expect(shiitake?.id).toBe('v_mushroom_shiitake');
      expect(shimeji?.id).toBe('v_mushroom_shimeji');
      expect(beech?.id).toBe('v_mushroom_white_beech');

      expect(shiitake?.id).not.toBe(shimeji?.id);
      expect(shimeji?.id).not.toBe(beech?.id);
    });

    it('1.7 “手枪腿（或者鸡胸脯肉）”必须同时保留 chicken_leg 和 chicken_breast，原始 ingredient text 必须完整保留', () => {
      const rawText = '手枪腿（或者鸡胸脯肉）';
      const resolved = resolveCanonicalWithOptions(rawText);

      expect(resolved).not.toBeNull();
      expect(resolved?.mode).toBe('anyOf');
      expect(resolved?.alternatives).toBeDefined();
      expect(resolved?.alternatives?.length).toBe(2);

      const altIds = resolved?.alternatives?.map(a => a.id);
      expect(altIds).toContain('p_chicken_leg');
      expect(altIds).toContain('p_chicken_breast');
    });

    it('1.8 不允许只保留其中一个 canonical，二选一必须完整沉淀于 FitBiteRecipe', () => {
      const raw: SourceRecipe = {
        originalTitle: '宫保鸡丁',
        source: 'howtocook',
        sourceId: 'test_kungpao',
        sourceUrl: 'https://github.com/test',
        sourceFile: 'dishes/test.md',
        license: 'Unlicense',
        contentHash: 'c'.repeat(64),
        rawIngredients: ['- 手枪腿（或者鸡胸脯肉）'],
        rawCalculations: ['手枪腿（或者鸡胸脯肉） = 1 支'],
        rawSteps: ['1. 切丁翻炒']
      };

      const { fitBiteRecipe } = Normalizer.normalize(raw);
      expect(fitBiteRecipe.requiredIngredients.length).toBe(1);

      const chickenItem = fitBiteRecipe.requiredIngredients[0];
      expect(chickenItem.originalRawText).toBe('手枪腿（或者鸡胸脯肉）');
      expect(chickenItem.mode).toBe('anyOf');
      expect(chickenItem.alternatives).toBeDefined();

      const altIds = chickenItem.alternatives?.map(a => a.id);
      expect(altIds).toContain('p_chicken_leg');
      expect(altIds).toContain('p_chicken_breast');
      // 绝不丢失任一选项
      expect(altIds?.length).toBe(2);
    });

    it('1.9 手枪腿保留 1 支，明确作为主选项自身的数量与单位', () => {
      const raw: SourceRecipe = {
        originalTitle: '宫保鸡丁',
        source: 'howtocook',
        sourceId: 'test_kungpao',
        sourceUrl: 'https://github.com/test',
        sourceFile: 'dishes/test.md',
        license: 'Unlicense',
        contentHash: 'c'.repeat(64),
        rawIngredients: ['- 手枪腿（或者鸡胸脯肉）'],
        rawCalculations: ['手枪腿（或者鸡胸脯肉） = 1 支（约 350g）'],
        rawSteps: ['1. 切丁翻炒']
      };

      const { fitBiteRecipe } = Normalizer.normalize(raw);
      const chickenItem = fitBiteRecipe.requiredIngredients[0];
      const legOpt = chickenItem.alternatives?.find(a => a.id === 'p_chicken_leg');

      expect(legOpt).toBeDefined();
      expect(legOpt?.amount).toBe(1);
      expect(legOpt?.unit).toBe('支');
    });

    it('1.10 鸡胸肉 alternative 不得继承“1 支”，严禁跨项借用数量单位', () => {
      const raw: SourceRecipe = {
        originalTitle: '宫保鸡丁',
        source: 'howtocook',
        sourceId: 'test_kungpao',
        sourceUrl: 'https://github.com/test',
        sourceFile: 'dishes/test.md',
        license: 'Unlicense',
        contentHash: 'c'.repeat(64),
        rawIngredients: ['- 手枪腿（或者鸡胸脯肉）'],
        rawCalculations: ['手枪腿（或者鸡胸脯肉） = 1 支（约 350g）'],
        rawSteps: ['1. 切丁翻炒']
      };

      const { fitBiteRecipe } = Normalizer.normalize(raw);
      const chickenItem = fitBiteRecipe.requiredIngredients[0];
      const breastOpt = chickenItem.alternatives?.find(a => a.id === 'p_chicken_breast');

      expect(breastOpt).toBeDefined();
      expect(breastOpt?.amount).not.toBe(1);
      expect(breastOpt?.unit).not.toBe('支');
      expect(breastOpt?.amount).toBeUndefined();
      expect(breastOpt?.unit).toBeUndefined();
    });

    it('1.11 缺少替代项数量时不得脑补克数或随意估计', () => {
      const raw: SourceRecipe = {
        originalTitle: '宫保鸡丁',
        source: 'howtocook',
        sourceId: 'test_kungpao',
        sourceUrl: 'https://github.com/test',
        sourceFile: 'dishes/test.md',
        license: 'Unlicense',
        contentHash: 'c'.repeat(64),
        rawIngredients: ['- 手枪腿（或者鸡胸脯肉）'],
        rawCalculations: ['手枪腿（或者鸡胸脯肉） = 1 支（约 350g）'],
        rawSteps: ['1. 切丁翻炒']
      };

      const { fitBiteRecipe } = Normalizer.normalize(raw);
      const chickenItem = fitBiteRecipe.requiredIngredients[0];
      const breastOpt = chickenItem.alternatives?.find(a => a.id === 'p_chicken_breast');

      // 绝不脑补 350g、200g 或任何未在计算表中独立声明的数据
      expect(breastOpt?.amount).toBeUndefined();
      expect(breastOpt?.unit).toBeUndefined();
    });
  });

  describe('2. RecipeParser Lossless Provenance & Fact Extraction', () => {
    const sampleMarkdown = `# 测试家常菜的做法

这是一道简单的快手菜。大约只需 15 分钟。

预估烹饪难度：★★

预计耗时：30 分钟

## 必备原料和工具

- 西红柿 1 个
- 鸡蛋 2 个
- 水果刀

## 计算

- 西红柿 = 1 个（约 150g）
- 鸡蛋 = 2 个

## 操作

1. 西红柿洗净切块
2. 鸡蛋打散翻炒
`;

    it('2.1 Parser 忠实保留原始 ingredient 文本', () => {
      const parsed = RecipeParser.parse(sampleMarkdown, {
        sourceId: 'test_dish',
        sourceUrl: 'https://github.com/test',
        sourceFile: 'dishes/test.md'
      });

      expect(parsed.rawIngredients).toContain('西红柿 1 个');
      expect(parsed.rawIngredients).toContain('鸡蛋 2 个');
      expect(parsed.rawIngredients).toContain('水果刀');
    });

    it('2.2 Parser 忠实保留原始制作步骤 steps', () => {
      const parsed = RecipeParser.parse(sampleMarkdown, {
        sourceId: 'test_dish',
        sourceUrl: 'https://github.com/test',
        sourceFile: 'dishes/test.md'
      });

      expect(parsed.rawSteps.length).toBe(2);
      expect(parsed.rawSteps[0]).toBe('西红柿洗净切块');
      expect(parsed.rawSteps[1]).toBe('鸡蛋打散翻炒');
    });

    it('2.3 contentHash 严格为原始 Markdown 的标准 SHA-256 哈希', () => {
      const expectedHash = crypto.createHash('sha256').update(sampleMarkdown, 'utf-8').digest('hex');
      const parsed = RecipeParser.parse(sampleMarkdown, {
        sourceId: 'test_dish',
        sourceUrl: 'https://github.com/test',
        sourceFile: 'dishes/test.md'
      });

      expect(parsed.contentHash).toBe(expectedHash);
      expect(parsed.contentHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('3. Normalizer Strict Guardrails (No Guessing / Fabrication)', () => {
    it('3.1 严格数据护栏：nutrition 必须恒为 null，严禁瞎猜热量与宏量营养素', () => {
      const raw: SourceRecipe = {
        originalTitle: '测试菜',
        source: 'howtocook',
        sourceId: 'test_nutr',
        sourceUrl: 'https://github.com/test',
        sourceFile: 'test.md',
        license: 'Unlicense',
        contentHash: 'a'.repeat(64),
        rawIngredients: ['- 西红柿'],
        rawCalculations: [],
        rawSteps: ['1. 洗净切块']
      };

      const { fitBiteRecipe } = Normalizer.normalize(raw);
      expect(fitBiteRecipe.nutrition).toBeNull();
    });

    it('3.2 source 未提供 quantity 时不得生成 quantity (amount/unit 保持 undefined)', () => {
      const raw: SourceRecipe = {
        originalTitle: '测试菜',
        source: 'howtocook',
        sourceId: 'test_no_qty',
        sourceUrl: 'https://github.com/test',
        sourceFile: 'test.md',
        license: 'Unlicense',
        contentHash: 'a'.repeat(64),
        rawIngredients: ['- 西红柿'], // 无克数描述
        rawCalculations: [], // 无 calculations
        rawSteps: ['1. 洗净切块']
      };

      const { fitBiteRecipe } = Normalizer.normalize(raw);
      const tomato = fitBiteRecipe.requiredIngredients.find(i => i.id === 'v_tomato');
      expect(tomato).toBeDefined();
      expect(tomato?.amount).toBeUndefined();
      expect(tomato?.unit).toBeUndefined();
    });

    it('3.3 Markdown 只有“煮 5 分钟”时，estimatedMinutes 必须为 null', () => {
      const rawMarkdownOnlyStepTime = `# 测试炖肉

## 必备原料和工具
- 猪肉

## 操作
1. 下锅大火煮 5 分钟
2. 捞出备用
`;
      const parsed = RecipeParser.parse(rawMarkdownOnlyStepTime, {
        sourceId: 'test_step_time',
        sourceUrl: 'https://test',
        sourceFile: 'test.md'
      });
      const { fitBiteRecipe } = Normalizer.normalize(parsed);

      expect(fitBiteRecipe.estimatedMinutes).toBeNull();
    });

    it('3.4 Markdown 明确写“预计耗时：30 分钟”时，estimatedMinutes 才能为 30', () => {
      const rawMarkdownWithDedicatedField = `# 测试炖肉

预估烹饪难度：★★
预计耗时：30 分钟

## 必备原料和工具
- 猪肉

## 操作
1. 下锅大火煮 5 分钟
`;
      const parsed = RecipeParser.parse(rawMarkdownWithDedicatedField, {
        sourceId: 'test_explicit_time',
        sourceUrl: 'https://test',
        sourceFile: 'test.md'
      });
      const { fitBiteRecipe } = Normalizer.normalize(parsed);

      expect(fitBiteRecipe.estimatedMinutes).toBe(30);
    });

    it('3.5 source 未提供 difficulty 时不得脑补默认值，必须为 null', () => {
      const raw: SourceRecipe = {
        originalTitle: '无难度测试菜',
        source: 'howtocook',
        sourceId: 'test_no_diff',
        sourceUrl: 'https://github.com/test',
        sourceFile: 'test.md',
        license: 'Unlicense',
        contentHash: 'a'.repeat(64),
        rawIngredients: ['- 西红柿'],
        rawCalculations: [],
        rawSteps: ['1. 洗净切块']
      };

      const { fitBiteRecipe } = Normalizer.normalize(raw);
      expect(fitBiteRecipe.difficulty).toBeNull();
      expect(fitBiteRecipe.rawDifficulty).toBeNull();
    });

    it('3.6 Difficulty 保留来源事实 rawDifficulty 并提供确定性级别映射', () => {
      const rawWithDiff: SourceRecipe = {
        originalTitle: '带难度测试菜',
        source: 'howtocook',
        sourceId: 'test_with_diff',
        sourceUrl: 'https://github.com/test',
        sourceFile: 'test.md',
        license: 'Unlicense',
        contentHash: 'a'.repeat(64),
        rawIngredients: ['- 西红柿'],
        rawCalculations: [],
        rawSteps: ['1. 洗净切块'],
        rawDifficulty: '★★'
      };

      const { fitBiteRecipe } = Normalizer.normalize(rawWithDiff);
      expect(fitBiteRecipe.rawDifficulty).toBe('★★');
      expect(fitBiteRecipe.difficulty).toBe('简单');
    });
  });

  describe('4. RecipeValidator Schema & Integrity Guardrails', () => {
    const validBaseRecipe: FitBiteRecipe = {
      id: 'imported_howtocook_sample',
      name: '示例菜品',
      category: '家常热菜',
      provenance: {
        source: 'howtocook',
        sourceId: 'sample',
        sourceUrl: 'https://github.com/sample',
        sourceFile: 'dishes/sample.md',
        license: 'Unlicense',
        contentHash: 'b'.repeat(64)
      },
      requiredIngredients: [
        { id: 'v_tomato', name: '西红柿', originalRawText: '西红柿' }
      ],
      pantryIngredients: ['pantry_salt'],
      instructions: ['1. 制作第一步'],
      tags: ['家常菜'],
      cookingMethod: '炒',
      nutrition: null,
      servings: 1,
      difficulty: '简单',
      rawDifficulty: '★★',
      estimatedMinutes: 15
    };

    it('4.1 完整合规的菜谱能顺利通过验证', () => {
      const res = RecipeValidator.validate(validBaseRecipe);
      expect(res.isValid).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    it('4.2 缺失 provenance 时必须报错拦截', () => {
      const bad = { ...validBaseRecipe, provenance: undefined as any };
      const res = RecipeValidator.validate(bad);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.includes('provenance'))).toBe(true);
    });

    it('4.3 instructions 为空数组时必须报错拦截', () => {
      const bad = { ...validBaseRecipe, instructions: [] };
      const res = RecipeValidator.validate(bad);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.includes('制作步骤'))).toBe(true);
    });

    it('4.4 违背安全护栏（存在编造的 nutrition 数据）时必须报错拦截', () => {
      const bad = { ...validBaseRecipe, nutrition: { calories: 200 } as any };
      const res = RecipeValidator.validate(bad);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.includes('nutrition'))).toBe(true);
    });
  });

  describe('5. Full Pipeline End-to-End Verification', () => {
    let backupContent: string | null = null;

    beforeAll(() => {
      const dataOutputPath = path.join(process.cwd(), 'data', 'recipes_imported.json');
      if (fs.existsSync(dataOutputPath)) {
        backupContent = fs.readFileSync(dataOutputPath, 'utf-8');
      }
    });

    afterAll(() => {
      const dataOutputPath = path.join(process.cwd(), 'data', 'recipes_imported.json');
      if (backupContent !== null) {
        fs.writeFileSync(dataOutputPath, backupContent, 'utf-8');
      }
    });

    it('5.1 21 道真实 HowToCook 菜谱全流程导入必须 100% 通过验证且零失败', () => {
      const result = runPipeline(pipelineOptions);
      expect(result.total).toBe(21);
      expect(result.imported.length).toBe(21);
      expect(result.failed.length).toBe(0);
      expect(result.success).toBe(true);

      // 每道菜必须具备 100% 完整的出处溯源和合规字段
      result.imported.forEach(recipe => {
        expect(recipe.provenance).toBeDefined();
        expect(recipe.provenance.contentHash).toMatch(/^[a-f0-9]{64}$/);
        expect(recipe.nutrition).not.toBeNull();
        expect(recipe.nutrition?.confidence).toBe('estimated');
        expect(recipe.nutrition?.calories).toBeGreaterThan(0);
        expect(recipe.requiredIngredients.length).toBeGreaterThanOrEqual(1);
        expect(recipe.instructions.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('5.2 正式输出统一收口至 data/recipes_imported.json，且根目录不存在冗余 recipes_imported.json', () => {
      const rootOutputPath = path.join(process.cwd(), 'recipes_imported.json');
      const dataOutputPath = path.join(process.cwd(), 'data', 'recipes_imported.json');

      expect(fs.existsSync(rootOutputPath)).toBe(false);
      expect(fs.existsSync(dataOutputPath)).toBe(true);

      const fileContent = fs.readFileSync(dataOutputPath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(21);
      expect(parsed.every((r: any) => r.id && r.name && r.provenance)).toBe(true);
    });

    it('5.3 严格保证 Deterministic Build：相同输入连续多次运行 pipeline 输出内容与 SHA-256 完全一致', () => {
      const dataOutputPath = path.join(process.cwd(), 'data', 'recipes_imported.json');

      const run1 = runPipeline(pipelineOptions);
      const content1 = fs.readFileSync(dataOutputPath, 'utf-8');
      const hash1 = crypto.createHash('sha256').update(content1).digest('hex');

      const run2 = runPipeline(pipelineOptions);
      const content2 = fs.readFileSync(dataOutputPath, 'utf-8');
      const hash2 = crypto.createHash('sha256').update(content2).digest('hex');

      // 数据结构完全一致
      expect(run1.imported).toEqual(run2.imported);
      // 导出的文件内容必须 100% 逐字节一致，零 diff
      expect(content1).toBe(content2);
      expect(hash1).toBe(hash2);
      // 确认不再含有动态生成的时间戳字段
      expect(content1).not.toContain('"importedAt"');
    });
  });
});
