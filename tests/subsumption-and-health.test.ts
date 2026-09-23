import { describe, it, expect } from 'vitest';
import {
  isIngredientFulfilled,
  isSubsumedBy,
  findDisambiguation,
  getSubsumedChildIds
} from '../shared/ingredients/taxonomy';
import { resolveAlias } from '../shared/ingredients/aliasResolver';
import { getCalorieTier, getHealthGuidanceTips } from '../shared/nutrition/healthTier';
import { matchRecipes, searchRecipesByKeyword } from '../src/core/matcher/matcher';
import { ALL_APP_RECIPES } from '../src/data/recipes';

describe('Pantry Subsumption, Disambiguation & Health Calorie Tiering Suite', () => {

  // =========================================================================
  // 1. 食材上位词拓扑与包含匹配 (Subsumption & Taxonomy)
  // =========================================================================
  describe('1. 食材上位词拓扑与包含匹配 (Subsumption)', () => {
    it('1.1 上位词“鱼”成功满足“鲈鱼”与“草鱼”，但不满足“五花肉”', () => {
      expect(isSubsumedBy('p_fish_seabass', 'p_fish_generic')).toBe(true);
      expect(isSubsumedBy('p_fish_grass_carp', 'p_fish_generic')).toBe(true);
      expect(isSubsumedBy('p_pork_belly', 'p_fish_generic')).toBe(false);
    });

    it('1.2 上位词“豆腐”成功满足“内酯豆腐”与“老豆腐”', () => {
      expect(isSubsumedBy('p_tofu_silken', 'p_tofu_generic')).toBe(true);
      expect(isSubsumedBy('p_tofu_firm', 'p_tofu_generic')).toBe(true);
    });

    it('1.3 上位词“猪肉/肉”成功满足“五花肉”、“猪瘦肉”与“肉末”', () => {
      expect(isSubsumedBy('p_pork_belly', 'p_pork_generic')).toBe(true);
      expect(isSubsumedBy('p_pork_lean', 'p_pork_generic')).toBe(true);
      expect(isSubsumedBy('p_pork_minced', 'p_pork_generic')).toBe(true);
    });

    it('1.4 用户冰箱仅有“鱼”（p_fish_generic），匹配“清蒸鲈鱼”判定为已满足且 0 缺失主料', () => {
      const fishRecipe = ALL_APP_RECIPES.find(r => r.name === '清蒸鲈鱼');
      expect(fishRecipe).toBeDefined();

      const groups = matchRecipes({
        fridgeIngredients: ['p_fish_generic'],
        pantryIngredients: fishRecipe!.pantryIngredients,
        recipes: [fishRecipe!]
      });

      const matched = groups.canMakeNow.find(r => r.recipe.name === '清蒸鲈鱼');
      expect(matched).toBeDefined();
      expect(matched?.missingIngredients.length).toBe(0);
      expect(matched?.matchedCount).toBe(1);
    });

    it('1.5 用户冰箱仅有“豆腐”，麻婆豆腐与皮蛋豆腐的豆腐原料均判定为已满足', () => {
      expect(isIngredientFulfilled('p_tofu_silken', ['p_tofu_generic'])).toBe(true);
      expect(isIngredientFulfilled('p_tofu_firm', ['p_tofu_generic'])).toBe(true);
    });

    it('1.6 别名解析支持泛称直达：输入“鱼”-> p_fish_generic，输入“豆腐”-> p_tofu_generic', () => {
      expect(resolveAlias('鱼')?.id).toBe('p_fish_generic');
      expect(resolveAlias('豆腐')?.id).toBe('p_tofu_generic');
      expect(resolveAlias('肉')?.id).toBe('p_pork_generic');
      expect(resolveAlias('猪肉')?.id).toBe('p_pork_generic');
      expect(resolveAlias('蛋')?.id).toBe('p_egg_generic');
    });

    it('1.7 getSubsumedChildIds 正确获取上位词的全部子食材', () => {
      const fishChildren = getSubsumedChildIds('p_fish_generic');
      expect(fishChildren).toContain('p_fish_seabass');
      expect(fishChildren).toContain('p_fish_grass_carp');
      expect(fishChildren.length).toBeGreaterThanOrEqual(4);
    });
  });

  // =========================================================================
  // 2. 输入框消歧字典检测 (Disambiguation Pills)
  // =========================================================================
  describe('2. 输入框消歧建议胶囊检测 (Disambiguation)', () => {
    it('2.1 输入“鱼”命中消歧字典，提供[鲈鱼, 草鱼, 三文鱼, 巴沙鱼]细分胶囊', () => {
      const dis = findDisambiguation('鱼');
      expect(dis).not.toBeNull();
      expect(dis?.name).toBe('鱼');
      const pillNames = dis?.disambiguationPills.map(p => p.name);
      expect(pillNames).toContain('鲈鱼');
      expect(pillNames).toContain('草鱼');
    });

    it('2.2 输入“豆腐”命中消歧字典，提供[内酯豆腐, 老豆腐]等质地细分胶囊', () => {
      const dis = findDisambiguation('豆腐');
      expect(dis).not.toBeNull();
      const pillNames = dis?.disambiguationPills.map(p => p.name);
      expect(pillNames).toContain('内酯豆腐');
      expect(pillNames).toContain('老豆腐');
    });

    it('2.3 输入“肉”命中消歧字典，提供[五花肉, 里脊肉, 肉末]等部位细分胶囊', () => {
      const dis = findDisambiguation('肉');
      expect(dis).not.toBeNull();
      const pillNames = dis?.disambiguationPills.map(p => p.name);
      expect(pillNames).toContain('五花肉');
      expect(pillNames).toContain('里脊肉');
      expect(pillNames).toContain('肉末');
    });

    it('2.4 输入具体食材（如“鸡蛋”、“鲈鱼”）不触发泛称消歧', () => {
      expect(findDisambiguation('鸡蛋')).toBeNull();
      expect(findDisambiguation('鲈鱼')).toBeNull();
      expect(findDisambiguation('五花肉')).toBeNull();
    });

    it('2.5 虾类消歧：输入“虾”、“鲜虾”、“大虾”命中，胶囊覆盖[基围虾, 虾仁, 对虾, 白对虾]', () => {
      for (const input of ['虾', '鲜虾', '大虾', '  大虾  ']) {
        const dis = findDisambiguation(input);
        expect(dis).not.toBeNull();
        const pills = dis?.disambiguationPills.map(p => p.name);
        expect(pills).toEqual(expect.arrayContaining(['基围虾', '虾仁', '对虾', '白对虾']));
      }
    });

    it('2.6 鸡肉类消歧：输入“鸡”、“鸡肉”命中，胶囊覆盖[鸡胸肉, 鸡腿肉, 鸡翅, 鸡爪]', () => {
      for (const input of ['鸡', '鸡肉']) {
        const dis = findDisambiguation(input);
        expect(dis).not.toBeNull();
        const pills = dis?.disambiguationPills.map(p => p.name);
        expect(pills).toEqual(expect.arrayContaining(['鸡胸肉', '鸡腿肉', '鸡翅', '鸡爪']));
      }
    });

    it('2.7 牛肉类消歧：输入“牛”、“牛肉”命中，胶囊覆盖[牛里脊, 牛腩, 肥牛片, 牛排]', () => {
      for (const input of ['牛', '牛肉']) {
        const dis = findDisambiguation(input);
        expect(dis).not.toBeNull();
        const pills = dis?.disambiguationPills.map(p => p.name);
        expect(pills).toEqual(expect.arrayContaining(['牛里脊', '牛腩', '肥牛片', '牛排']));
      }
    });

    it('2.8 蛋类消歧：输入“蛋”命中，胶囊覆盖[鸡蛋, 鸭蛋, 鹌鹑蛋]', () => {
      const dis = findDisambiguation('蛋');
      expect(dis).not.toBeNull();
      const pills = dis?.disambiguationPills.map(p => p.name);
      expect(pills).toEqual(expect.arrayContaining(['鸡蛋', '鸭蛋', '鹌鹑蛋']));
    });

    it('2.9 菇类消歧：输入“蘑菇”、“菌菇”、“菇”命中，胶囊覆盖[香菇, 金针菇, 杏鲍菇, 口蘑]', () => {
      for (const input of ['蘑菇', '菌菇', '菇']) {
        const dis = findDisambiguation(input);
        expect(dis).not.toBeNull();
        const pills = dis?.disambiguationPills.map(p => p.name);
        expect(pills).toEqual(expect.arrayContaining(['香菇', '金针菇', '杏鲍菇', '口蘑']));
      }
    });

    it('2.10 椒类消歧：输入“椒”、“辣椒”命中，胶囊覆盖[青椒, 红椒, 彩椒, 朝天椒]', () => {
      for (const input of ['椒', '辣椒']) {
        const dis = findDisambiguation(input);
        expect(dis).not.toBeNull();
        const pills = dis?.disambiguationPills.map(p => p.name);
        expect(pills).toEqual(expect.arrayContaining(['青椒', '红椒', '彩椒', '朝天椒']));
      }
    });

    it('2.11 边界防护：细分具体食材绝不误触发消歧', () => {
      const specificLeaves = [
        '青椒', '红椒', '彩椒', '朝天椒', '香菇', '金针菇', '杏鲍菇', '口蘑',
        '基围虾', '虾仁', '对虾', '白对虾', '鸡胸肉', '鸡腿肉', '鸡翅', '鸡爪',
        '牛里脊', '牛腩', '肥牛片', '牛排', '猪里脊', '排骨', '鸭蛋', '鹌鹑蛋',
        '嫩豆腐', '老豆腐', '内酯豆腐', '冻豆腐'
      ];
      for (const item of specificLeaves) {
        expect(findDisambiguation(item)).toBeNull();
      }
    });
  });

  // =========================================================================
  // 3. 搜索框分词与包含检索 (Search Filter & Reverse Lookup)
  // =========================================================================
  describe('3. 搜索框包含检索与原料反查 (Search Filter)', () => {
    it('3.1 搜索“鱼”不仅匹配标题，同时反查子类食材，成功召回“清蒸鲈鱼”', () => {
      const results = searchRecipesByKeyword('鱼', ALL_APP_RECIPES);
      const names = results.map(r => r.name);
      expect(names).toContain('清蒸鲈鱼');
    });

    it('3.2 搜索“豆腐”召回“麻婆豆腐”与“皮蛋豆腐”', () => {
      const results = searchRecipesByKeyword('豆腐', ALL_APP_RECIPES);
      const names = results.map(r => r.name);
      expect(names).toContain('麻婆豆腐');
      expect(names).toContain('皮蛋豆腐');
    });

    it('3.3 搜索“西红柿”召回“西红柿炒鸡蛋”', () => {
      const results = searchRecipesByKeyword('西红柿', ALL_APP_RECIPES);
      const names = results.map(r => r.name);
      expect(names).toContain('西红柿炒鸡蛋');
    });

    it('3.4 搜索不存在的火星食材返回空数组', () => {
      const results = searchRecipesByKeyword('不存在的火星石头', ALL_APP_RECIPES);
      expect(results.length).toBe(0);
    });
  });

  // =========================================================================
  // 4. 高热量菜谱健康分流体系 (Calorie Tiering & Health Guidance)
  // =========================================================================
  describe('4. 高热量菜谱健康分流与改良建议', () => {
    it('4.1 710 kcal 宫保鸡丁 与 550+ kcal 菜谱正确划分为 cheat_or_share', () => {
      const kungPao = ALL_APP_RECIPES.find(r => r.name === '宫保鸡丁')!;
      expect(getCalorieTier(kungPao.nutrition, kungPao.calories)).toBe('cheat_or_share');

      // 569 kcal, 48g 脂肪的重油麻婆豆腐
      expect(getCalorieTier({ calories: 569, fat: 48, protein: 26.6, carbs: 11.2 })).toBe('cheat_or_share');

      // 脂肪 > 25g 的青椒土豆炒肉
      const pepperPork = ALL_APP_RECIPES.find(r => r.name === '青椒土豆炒肉')!;
      expect(getCalorieTier(pepperPork.nutrition, pepperPork.calories)).toBe('cheat_or_share');
    });

    it('4.2 149 kcal 西红柿炒鸡蛋 与 284 kcal 凉拌鸡丝 正确划分为 lean_choice', () => {
      const tomatoEgg = ALL_APP_RECIPES.find(r => r.name === '西红柿炒鸡蛋')!;
      const coldChicken = ALL_APP_RECIPES.find(r => r.name === '凉拌鸡丝')!;

      // 149 kcal <= 200
      expect(getCalorieTier(tomatoEgg.nutrition, tomatoEgg.calories)).toBe('lean_choice');
      // 284 kcal <= 350, 脂肪 9g (供能比 28.5% <= 35%)
      expect(getCalorieTier(coldChicken.nutrition, coldChicken.calories)).toBe('lean_choice');
      // 纯轻食低脂 204 kcal (脂肪供能比 11.5%)
      expect(getCalorieTier({ calories: 204, fat: 2.6, protein: 38.6, carbs: 5.6 })).toBe('lean_choice');
    });

    it('4.3 408 kcal 清蒸鲈鱼 划分为 balanced', () => {
      const seaBass = ALL_APP_RECIPES.find(r => r.name === '清蒸鲈鱼')!;
      expect(getCalorieTier(seaBass.nutrition, seaBass.calories)).toBe('balanced');
    });

    it('4.4 宫保鸡丁生成控油喷雾建议与坚果/花生减半建议', () => {
      const kungPao = ALL_APP_RECIPES.find(r => r.name === '宫保鸡丁')!;
      const tips = getHealthGuidanceTips(kungPao);

      expect(tips.length).toBeGreaterThanOrEqual(2);
      expect(tips.some(t => t.includes('控油喷雾'))).toBe(true);
      expect(tips.some(t => t.includes('坚果/油炸花生减半'))).toBe(true);
    });

    it('4.5 569 kcal 重油麻婆豆腐生成控油喷雾建议与瘦肉替换五花肉建议', () => {
      const mapo = ALL_APP_RECIPES.find(r => r.name === '麻婆豆腐')!;
      const heavyMapo = {
        ...mapo,
        calories: 569,
        nutrition: { calories: 569, fat: 48, protein: 26, carbs: 11 }
      };
      const tips = getHealthGuidanceTips(heavyMapo);

      expect(tips.length).toBeGreaterThanOrEqual(2);
      expect(tips.some(t => t.includes('控油喷雾'))).toBe(true);
      expect(tips.some(t => t.includes('选用瘦肉或去皮鸡腿肉替代'))).toBe(true);
    });

    it('4.6 减脂菜谱（如西红柿炒鸡蛋）不生成高能量警示改良建议', () => {
      const tomatoEgg = ALL_APP_RECIPES.find(r => r.name === '西红柿炒鸡蛋')!;
      const tips = getHealthGuidanceTips(tomatoEgg);
      expect(tips.length).toBe(0);
    });

    it('4.7 推荐列表排序健康加权：同等可做状态下，lean_choice 排序优先于 cheat_or_share', () => {
      const tomatoEgg = ALL_APP_RECIPES.find(r => r.name === '西红柿炒鸡蛋')!;
      const kungPao = ALL_APP_RECIPES.find(r => r.name === '宫保鸡丁')!;

      // 假设用户同时拥有西红柿、鸡蛋、鸡腿肉、花生米与相关调料（两者均可做）
      const groups = matchRecipes({
        fridgeIngredients: ['v_tomato', 'p_egg', 'p_chicken_leg', 'other_peanut'],
        pantryIngredients: Array.from(new Set([...tomatoEgg.pantryIngredients, ...kungPao.pantryIngredients])),
        recipes: [kungPao, tomatoEgg]
      });

      const canMakeNames = groups.canMakeNow.map(r => r.recipe.name);
      expect(canMakeNames).toContain('西红柿炒鸡蛋');
      expect(canMakeNames).toContain('宫保鸡丁');

      // 检查排序：西红柿炒鸡蛋（lean_choice, +15）排在 宫保鸡丁（cheat_or_share, -30% 降权）之前
      const tomatoIndex = canMakeNames.indexOf('西红柿炒鸡蛋');
      const kungPaoIndex = canMakeNames.indexOf('宫保鸡丁');
      expect(tomatoIndex).toBeLessThan(kungPaoIndex);
    });
  });

});
