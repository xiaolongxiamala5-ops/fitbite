import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { CookBookKGParser, RawCookBookKGRecipe } from '../scripts/pipeline/CookBookKGParser';
import { Normalizer } from '../scripts/pipeline/Normalizer';
import { RecipeValidator } from '../scripts/pipeline/Validator';
import { evaluateRecipeNutrition } from '../shared/nutrition/recipeEvaluator';

describe('CookBook-KG Pipeline Phase 1 Test Suite', () => {
  const sampleFilePath = path.join(process.cwd(), 'data', 'raw_cookbook_kg', 'recipes_sample.json');
  const sampleJson: Record<string, RawCookBookKGRecipe> = JSON.parse(fs.readFileSync(sampleFilePath, 'utf-8'));

  const SLUG_MAP: Record<string, string> = {
    '香辣水煮鱼': 'spicy_boiled_fish',
    '水煮鱼': 'boiled_fish',
    '凉拌木耳': 'cold_black_fungus',
    '可乐鸡翅': 'coke_chicken_wings',
    '元宝红烧肉': 'yuanbao_braised_pork'
  };

  it('1.1 香辣水煮鱼: 应正确解析质量单位与勺匙单位，且食用油为 50ml', () => {
    const raw = sampleJson['香辣水煮鱼'];
    expect(raw).toBeDefined();

    const source = CookBookKGParser.parse('香辣水煮鱼', raw, {
      sourceId: SLUG_MAP['香辣水煮鱼'],
      sourceUrl: 'https://github.com/ysyamber/CookBook-KG_origin/blob/master/visualization/entities_item.json',
      sourceFile: 'visualization/entities_item.json'
    });

    expect(source.originalTitle).toBe('香辣水煮鱼');
    expect(source.source).toBe('cookbook-kg');
    expect(source.license).toBe('unknown');
    expect(source.rawCalculations).toContain('黄豆芽 = 200克');
    expect(source.rawCalculations).toContain('干辣椒 = 20克');
    expect(source.rawCalculations).toContain('食用油 = 50ml');
    expect(source.rawCalculations).toContain('豆瓣酱 = 2勺');

    const { fitBiteRecipe } = Normalizer.normalize(source);
    const validation = RecipeValidator.validate(fitBiteRecipe);

    expect(validation.isValid).toBe(true);
    expect(fitBiteRecipe.id).toBe('imported_cookbook-kg_spicy_boiled_fish');
    expect(fitBiteRecipe.requiredIngredients.some(i => i.id === 'p_fish_grass_carp' && i.amount === 1 && i.unit === '条')).toBe(true);
    expect(fitBiteRecipe.requiredIngredients.some(i => i.id === 'v_soybean_sprout' && i.amount === 200 && i.unit === '克')).toBe(true);
    const oilItem = fitBiteRecipe.pantryIngredients.find(p => (typeof p === 'string' ? p : p.id) === 'pantry_oil');
    expect(oilItem).toBeDefined();
    expect(typeof oilItem === 'object' ? oilItem.amount : undefined).toBe(50);
    expect(typeof oilItem === 'object' ? oilItem.unit : undefined).toBe('ml');
  });

  it('1.2 水煮鱼: 原食材表缺油，步骤中明确写有40毫升食用油，只能提取该客观事实', () => {
    const raw = sampleJson['水煮鱼'];
    expect(raw).toBeDefined();

    // 原始食材列表确实无油
    const rawList = [...(raw['主料'] || []), ...(raw['辅料'] || [])];
    expect(rawList.some(s => s.includes('油'))).toBe(false);

    const source = CookBookKGParser.parse('水煮鱼', raw, {
      sourceId: SLUG_MAP['水煮鱼'],
      sourceUrl: 'https://github.com/ysyamber/CookBook-KG_origin/blob/master/visualization/entities_item.json',
      sourceFile: 'visualization/entities_item.json'
    });

    // 步骤抽取到了白纸黑字的 40ml
    expect(source.rawCalculations).toContain('食用油 = 40ml');

    const { fitBiteRecipe } = Normalizer.normalize(source);
    const validation = RecipeValidator.validate(fitBiteRecipe);

    expect(validation.isValid).toBe(true);
    const oilItem = fitBiteRecipe.pantryIngredients.find(p => (typeof p === 'string' ? p : p.id) === 'pantry_oil');
    expect(oilItem).toBeDefined();
    expect(typeof oilItem === 'object' ? oilItem.amount : undefined).toBe(40);
    expect(typeof oilItem === 'object' ? oilItem.unit : undefined).toBe('ml');
    expect(fitBiteRecipe.instructions.length).toBe(10);
  });

  it('1.3 可乐鸡翅: 应保留鸡翅中适量与可乐一听，不得擅自换算克重', () => {
    const raw = sampleJson['可乐鸡翅'];
    expect(raw).toBeDefined();

    const source = CookBookKGParser.parse('可乐鸡翅', raw, {
      sourceId: SLUG_MAP['可乐鸡翅'],
      sourceUrl: 'https://github.com/ysyamber/CookBook-KG_origin/blob/master/visualization/entities_item.json',
      sourceFile: 'visualization/entities_item.json'
    });

    // 鸡翅中适量 -> 无 calculation 数量（严禁猜测克重）
    expect(source.rawCalculations.some(c => c.startsWith('鸡翅中 ='))).toBe(false);
    // 可乐一听 -> 保留数量 1，单位 听
    expect(source.rawCalculations).toContain('可乐 = 1听');

    const { fitBiteRecipe } = Normalizer.normalize(source);
    const validation = RecipeValidator.validate(fitBiteRecipe);

    expect(validation.isValid).toBe(true);
    const chickenWing = fitBiteRecipe.requiredIngredients.find(i => i.id === 'p_chicken_wing');
    expect(chickenWing).toBeDefined();
    expect(chickenWing?.amount).toBeUndefined(); // 严禁编造克重

    const cola = fitBiteRecipe.requiredIngredients.find(i => i.id === 'other_cola');
    expect(cola).toBeDefined();
    expect(cola?.amount).toBe(1);
    expect(cola?.unit).toBe('听');
  });

  it('1.4 凉拌木耳: 应保留干木耳 50g、橄榄油一勺、白糖1勺，不得擅自将勺换算为克', () => {
    const raw = sampleJson['凉拌木耳'];
    expect(raw).toBeDefined();

    const source = CookBookKGParser.parse('凉拌木耳', raw, {
      sourceId: SLUG_MAP['凉拌木耳'],
      sourceUrl: 'https://github.com/ysyamber/CookBook-KG_origin/blob/master/visualization/entities_item.json',
      sourceFile: 'visualization/entities_item.json'
    });

    expect(source.rawCalculations).toContain('干木耳 = 50g');
    expect(source.rawCalculations).toContain('橄榄油 = 1勺');
    expect(source.rawCalculations).toContain('白糖 = 1勺');

    const { fitBiteRecipe } = Normalizer.normalize(source);
    const validation = RecipeValidator.validate(fitBiteRecipe);

    expect(validation.isValid).toBe(true);
    const fungus = fitBiteRecipe.requiredIngredients.find(i => i.id === 'v_black_fungus');
    expect(fungus).toBeDefined();
    expect(fungus?.amount).toBe(50);
    expect(fungus?.unit).toBe('g');
  });

  it('1.5 元宝红烧肉: 应正确解析明确质量单位与计数单位', () => {
    const raw = sampleJson['元宝红烧肉'];
    expect(raw).toBeDefined();

    const source = CookBookKGParser.parse('元宝红烧肉', raw, {
      sourceId: SLUG_MAP['元宝红烧肉'],
      sourceUrl: 'https://github.com/ysyamber/CookBook-KG_origin/blob/master/visualization/entities_item.json',
      sourceFile: 'visualization/entities_item.json'
    });

    expect(source.rawCalculations).toContain('带皮五花肉 = 800克');
    expect(source.rawCalculations).toContain('老抽 = 30克');
    expect(source.rawCalculations).toContain('生抽 = 60克');
    expect(source.rawCalculations).toContain('冰糖 = 80克');
    expect(source.rawCalculations).toContain('八角 = 3个');
    expect(source.rawCalculations).toContain('姜 = 5片');
    expect(source.rawCalculations).toContain('葱 = 1根');
    expect(source.rawCalculations).toContain('花椒 = 40粒');
    expect(source.rawCalculations).toContain('香叶 = 3片');

    const { fitBiteRecipe } = Normalizer.normalize(source);
    const validation = RecipeValidator.validate(fitBiteRecipe);

    expect(validation.isValid).toBe(true);
    const porkBelly = fitBiteRecipe.requiredIngredients.find(i => i.id === 'p_pork_belly');
    expect(porkBelly).toBeDefined();
    expect(porkBelly?.amount).toBe(800);
    expect(porkBelly?.unit).toBe('克');
  });

  it('2. Nutrition Evaluator 评估 5 道菜品：独立报告 verified 或 incomplete，不阻碍菜谱准入', () => {
    for (const [name, raw] of Object.entries(sampleJson)) {
      const source = CookBookKGParser.parse(name, raw, {
        sourceId: SLUG_MAP[name],
        sourceUrl: 'https://github.com/ysyamber/CookBook-KG_origin/blob/master/visualization/entities_item.json',
        sourceFile: 'visualization/entities_item.json'
      });
      const { fitBiteRecipe } = Normalizer.normalize(source);
      const validation = RecipeValidator.validate(fitBiteRecipe);
      expect(validation.isValid).toBe(true);

      const evaluation = evaluateRecipeNutrition(fitBiteRecipe);
      expect(['nutrition_verified', 'nutrition_incomplete']).toContain(evaluation.nutritionStatus);
    }
  });

  describe('3. CookBook-KG Phase 1.5 — Ingredient Identity & Quantity Fidelity Tests', () => {
    it('3.1 辣椒体系保真测试：辣椒油、干辣椒、红辣椒、青辣椒绝不等于辣椒粉', () => {
      const mockRaw: RawCookBookKGRecipe = {
        主料: ['干木耳: 50g', '红辣椒: 5个', '青辣椒: 3个'],
        辅料: ['辣椒油: 1勺', '干辣椒: 20克', '辣椒粉: 10克'],
        制作步骤: ['1. 搅拌均匀']
      };

      const source = CookBookKGParser.parse('辣椒测试菜', mockRaw, {
        sourceId: 'chili_test',
        sourceUrl: 'https://test',
        sourceFile: 'test.json'
      });

      const { fitBiteRecipe } = Normalizer.normalize(source);

      // 1. 红辣椒 -> 蔬菜 canonical (尖椒 / v_hot_pepper)，绝非辣椒粉
      const redChili = fitBiteRecipe.requiredIngredients.find(i => i.id === 'v_hot_pepper');
      expect(redChili).toBeDefined();
      expect(redChili?.amount).toBe(5);
      expect(redChili?.unit).toBe('个');

      // 2. 青辣椒 -> 蔬菜 canonical (青椒 / v_green_bell_pepper)，绝非辣椒粉
      const greenChili = fitBiteRecipe.requiredIngredients.find(i => i.id === 'v_green_bell_pepper');
      expect(greenChili).toBeDefined();
      expect(greenChili?.amount).toBe(3);
      expect(greenChili?.unit).toBe('个');

      // 3. 辣椒油 -> 独立高供能调料 preset_chili_oil，绝非辣椒粉
      const chiliOil = fitBiteRecipe.pantryIngredients.find(p => (typeof p === 'string' ? p : p.id) === 'preset_chili_oil');
      expect(chiliOil).toBeDefined();
      expect(typeof chiliOil === 'object' ? chiliOil.amount : undefined).toBe(1);
      expect(typeof chiliOil === 'object' ? chiliOil.unit : undefined).toBe('勺');

      // 4. 干辣椒 -> 独立香辛料 preset_dried_chili，绝非辣椒粉
      const driedChili = fitBiteRecipe.pantryIngredients.find(p => (typeof p === 'string' ? p : p.id) === 'preset_dried_chili');
      expect(driedChili).toBeDefined();
      expect(typeof driedChili === 'object' ? driedChili.amount : undefined).toBe(20);
      expect(typeof driedChili === 'object' ? driedChili.unit : undefined).toBe('克');

      // 5. 辣椒粉 -> preset_chili_powder
      const chiliPowder = fitBiteRecipe.pantryIngredients.find(p => (typeof p === 'string' ? p : p.id) === 'preset_chili_powder');
      expect(chiliPowder).toBeDefined();
      expect(typeof chiliPowder === 'object' ? chiliPowder.amount : undefined).toBe(10);
      expect(typeof chiliPowder === 'object' ? chiliPowder.unit : undefined).toBe('克');
    });

    it('3.2 酱油体系保真测试：老抽与生抽各自保留独立身份，绝不合并', () => {
      const mockRaw: RawCookBookKGRecipe = {
        主料: ['带皮五花肉: 800克'],
        辅料: ['老抽: 30克', '生抽: 60克'],
        制作步骤: ['1. 红烧']
      };

      const source = CookBookKGParser.parse('酱油测试菜', mockRaw, {
        sourceId: 'soy_test',
        sourceUrl: 'https://test',
        sourceFile: 'test.json'
      });

      const { fitBiteRecipe } = Normalizer.normalize(source);

      // 老抽与生抽并存，互不覆盖
      const darkSoy = fitBiteRecipe.pantryIngredients.find(p => (typeof p === 'string' ? p : p.id) === 'preset_dark_soy_sauce');
      const lightSoy = fitBiteRecipe.pantryIngredients.find(p => (typeof p === 'string' ? p : p.id) === 'pantry_soy_sauce');

      expect(darkSoy).toBeDefined();
      expect(typeof darkSoy === 'object' ? darkSoy.amount : undefined).toBe(30);
      expect(typeof darkSoy === 'object' ? darkSoy.unit : undefined).toBe('克');

      expect(lightSoy).toBeDefined();
      expect(typeof lightSoy === 'object' ? lightSoy.amount : undefined).toBe(60);
      expect(typeof lightSoy === 'object' ? lightSoy.unit : undefined).toBe('克');
    });

    it('3.3 糖体系保真测试：冰糖保留 preset_rock_sugar 独立身份与克重', () => {
      const mockRaw: RawCookBookKGRecipe = {
        主料: ['五花肉: 500克'],
        辅料: ['冰糖: 80克', '白糖: 20克'],
        制作步骤: ['1. 炒糖色']
      };

      const source = CookBookKGParser.parse('糖类测试菜', mockRaw, {
        sourceId: 'sugar_test',
        sourceUrl: 'https://test',
        sourceFile: 'test.json'
      });

      const { fitBiteRecipe } = Normalizer.normalize(source);

      const rockSugar = fitBiteRecipe.pantryIngredients.find(p => (typeof p === 'string' ? p : p.id) === 'preset_rock_sugar');
      const whiteSugar = fitBiteRecipe.pantryIngredients.find(p => (typeof p === 'string' ? p : p.id) === 'preset_sugar');

      expect(rockSugar).toBeDefined();
      expect(typeof rockSugar === 'object' ? rockSugar.name : undefined).toBe('冰糖');
      expect(typeof rockSugar === 'object' ? rockSugar.amount : undefined).toBe(80);
      expect(typeof rockSugar === 'object' ? rockSugar.unit : undefined).toBe('克');

      expect(whiteSugar).toBeDefined();
      expect(typeof whiteSugar === 'object' ? whiteSugar.amount : undefined).toBe(20);
      expect(typeof whiteSugar === 'object' ? whiteSugar.unit : undefined).toBe('克');
    });

    it('3.4 Pantry 食用油携带 50ml 数量能被 RecipeEvaluator 正确感知且不误判为食用油未定量', () => {
      const mockRaw: RawCookBookKGRecipe = {
        主料: ['黄豆芽: 200克', '食用油: 50ml'],
        制作步骤: ['1. 炒熟']
      };

      const source = CookBookKGParser.parse('定量油测试菜', mockRaw, {
        sourceId: 'quantified_oil_test',
        sourceUrl: 'https://test',
        sourceFile: 'test.json'
      });

      const { fitBiteRecipe } = Normalizer.normalize(source);
      const evaluation = evaluateRecipeNutrition(fitBiteRecipe);

      // 食用油在 Evaluator 中应被标记为 isQuantified: true
      const oilEval = evaluation.evaluatedIngredients.find(e => e.id === 'pantry_oil');
      expect(oilEval).toBeDefined();
      expect(oilEval?.isQuantified).toBe(true);
      expect(oilEval?.rawAmount).toBe(50);
      expect(oilEval?.rawUnit).toBe('ml');

      // 阻断原因应为非质量单位 (ml 无密度规则)，绝对不能误判为“食用油未定量” (unquantified_oil)
      const oilBlocker = evaluation.blockingCriticalIngredients.find(b => b.ingredientId === 'pantry_oil');
      expect(oilBlocker).toBeDefined();
      expect(oilBlocker?.reason).toBe('unconvertible_unit');
      expect(oilBlocker?.message).toContain('使用了非质量单位 "ml"');
      expect(evaluation.blockingCriticalIngredients.some(b => b.reason === 'unquantified_oil')).toBe(false);
    });

    it('3.5 无数量的 Pantry 食用油仍正确阻断为 unquantified_oil', () => {
      const mockRaw: RawCookBookKGRecipe = {
        主料: ['黄豆芽: 200克'],
        辅料: ['食用油: 适量'],
        制作步骤: ['1. 炒熟']
      };

      const source = CookBookKGParser.parse('未定量油测试菜', mockRaw, {
        sourceId: 'unquantified_oil_test',
        sourceUrl: 'https://test',
        sourceFile: 'test.json'
      });

      const { fitBiteRecipe } = Normalizer.normalize(source);
      const evaluation = evaluateRecipeNutrition(fitBiteRecipe);

      const oilEval = evaluation.evaluatedIngredients.find(e => e.id === 'pantry_oil');
      expect(oilEval).toBeDefined();
      expect(oilEval?.isQuantified).toBe(false);
      expect(oilEval?.rawAmount).toBeUndefined();

      const oilBlocker = evaluation.blockingCriticalIngredients.find(b => b.ingredientId === 'pantry_oil');
      expect(oilBlocker).toBeDefined();
      expect(oilBlocker?.reason).toBe('unquantified_oil');
    });
  });
});
