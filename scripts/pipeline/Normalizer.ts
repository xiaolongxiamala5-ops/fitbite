import fs from 'fs';
import path from 'path';
import { SourceRecipe, NormalizedRecipe, NormalizedIngredient, FitBiteRecipe, FitBiteIngredientItem, FitBitePantryItem, CanonicalOption } from './types';
import { resolveCanonicalWithOptions, cleanIngredientRawText } from './canonicalDictionary';
import { resolvePantry, isWaterOrIgnored, isKitchenTool } from './pantryDictionary';
import { evaluateRecipeNutrition } from '../../shared/nutrition';
import { CANONICAL_NUTRITION_LOOKUP, PANTRY_TO_SANOTSU } from '../../data/nutrition/mappings/canonical-to-sanotsu';
import { NutritionFood } from '../../shared/nutrition/types';
import { roundTo } from '../../shared/nutrition/calculator';

let cachedFoodsMap: Map<string, NutritionFood> | null = null;
function getFoodsMap(): Map<string, NutritionFood> {
  if (cachedFoodsMap) return cachedFoodsMap;
  cachedFoodsMap = new Map();
  try {
    const root = process.cwd();
    const foodsPath = path.join(root, 'data', 'nutrition', 'generated', 'nutrition_foods.json');
    if (fs.existsSync(foodsPath)) {
      const foods: NutritionFood[] = JSON.parse(fs.readFileSync(foodsPath, 'utf8'));
      for (const f of foods) {
        cachedFoodsMap.set(f.foodCode, f);
      }
    }
  } catch {
    // fallback gracefully
  }
  return cachedFoodsMap;
}

function parseChineseNum(str: string): number | null {
  const map: Record<string, number> = {
    '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '半': 0.5
  };
  if (map[str] !== undefined) return map[str];
  const num = parseFloat(str);
  return Number.isFinite(num) ? num : null;
}

/**
 * Parses raw calculation lines supporting both prefix and suffix quantity patterns
 * Examples:
 * - "西兰花 约 200 g （约 1/2 中等大小的西兰花）"
 * - "青椒 2 个（共约 200g）"
 * - "1 盒内脂豆腐"
 * - "20-30g 五花肉"
 * - "两瓣大蒜"
 * - "2 片生姜"
 * - "黄瓜 200 克 * 份数"
 */
function parseRawCalculationItem(calc: string): { name: string; amount?: number; unit?: string } | null {
  const line = calc.replace(/^[-*•]\s*/, '').trim();
  if (!line) return null;

  // Case A: Explicit delimiter (=, :, ：)
  // e.g. "带皮五花肉 = 800克", "手枪腿（或者鸡胸脯肉） = 1 支（约 350g）", "冰糖 = 80克", "八角 = 3个"
  if (/[=：:]/.test(line)) {
    const parts = line.split(/[=：:]/);
    const rawName = parts[0].trim();
    const qtyPart = parts.slice(1).join('=').trim();

    // Check range in qtyPart: e.g. "10-15ml", "20-30g"
    const range = qtyPart.match(/^([0-9.]+)\s*[-~至到]\s*([0-9.]+)\s*([a-zA-Z\u4e00-\u9fa5]+)/);
    if (range) {
      return {
        name: cleanIngredientRawText(rawName),
        amount: (parseFloat(range[1]) + parseFloat(range[2])) / 2,
        unit: range[3].trim()
      };
    }

    const single = qtyPart.match(/^([一二两三四五六七八九十半\d\.]+)\s*([a-zA-Z\u4e00-\u9fa5]+)?/);
    if (single) {
      const num = parseChineseNum(single[1]) ?? undefined;
      const unit = single[2] ? single[2].trim() : undefined;
      return {
        name: cleanIngredientRawText(rawName),
        amount: num,
        unit
      };
    }

    return { name: cleanIngredientRawText(rawName) };
  }

  // Case B: Leading quantity without delimiter
  // e.g. "1 盒内脂豆腐", "1 枚咸鸭蛋", "20-30g 五花肉", "两瓣大蒜", "2 片生姜", "5 根小米辣"
  const rangeMatch = line.match(/^([0-9.]+)\s*[-~至到]\s*([0-9.]+)\s*(g|kg|ml|克|千克|毫升|瓣|片|块|个|只|条|根|朵|盒|包|枚|支)\s*(?:的)?\s*(.+)$/);
  if (rangeMatch) {
    return {
      name: cleanIngredientRawText(rangeMatch[4].trim()),
      amount: (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2,
      unit: rangeMatch[3].trim()
    };
  }

  const leadingNumMatch = line.match(/^([一二两三四五六七八九十半\d\.]+)\s*([个只条根朵瓣盒块包枚支片粒gkgml克千克毫升]+)\s*(?:的)?\s*(.+)$/);
  if (leadingNumMatch) {
    const num = parseChineseNum(leadingNumMatch[1]) ?? undefined;
    const unit = leadingNumMatch[2].trim();
    const name = cleanIngredientRawText(leadingNumMatch[3].trim());
    return { name, amount: num, unit };
  }

  // Case C: Name first without delimiter
  // e.g. "西兰花 约 200 g （约 1/2...）", "青椒 2 个（共约 200g）", "虾 250g * 份数", "虾 10 只", "黄瓜 200 克", "鲈鱼 一条"
  const parenGrams = line.match(/（(?:共约|约)?\s*([0-9.]+)\s*(g|克)）/);
  if (parenGrams) {
    const mainNamePart = line.replace(/（.*）/, '').trim();
    const nameMatch = mainNamePart.match(/^([^\s0-9一二两三四五六七八九十半]+)/);
    if (nameMatch) {
      return {
        name: cleanIngredientRawText(nameMatch[1].trim()),
        amount: parseFloat(parenGrams[1]),
        unit: parenGrams[2]
      };
    }
  }

  // Check suffix range: e.g. "食用油 10-15ml", "蒜 5-8 瓣"
  const suffixRange = line.match(/^([^\d一二两三四五六七八九十半\s]+)\s+(?:约|大概)?\s*([0-9.]+)\s*[-~至到]\s*([0-9.]+)\s*([a-zA-Z\u4e00-\u9fa5]+)/);
  if (suffixRange) {
    return {
      name: cleanIngredientRawText(suffixRange[1].trim()),
      amount: (parseFloat(suffixRange[2]) + parseFloat(suffixRange[3])) / 2,
      unit: suffixRange[4].trim()
    };
  }

  const standardMatch = line.match(/^([^\d一二两三四五六七八九十半\s]+)\s*(?:约|大概)?\s*([一二两三四五六七八九十半\d\.]+)\s*([a-zA-Z\u4e00-\u9fa5]+)?/);
  if (standardMatch) {
    return {
      name: cleanIngredientRawText(standardMatch[1].trim()),
      amount: parseChineseNum(standardMatch[2]) ?? undefined,
      unit: standardMatch[3] ? standardMatch[3].trim() : undefined
    };
  }

  return null;
}

/**
 * FitBite Normalizer (C.1.1 Refined & Dual-Track Nutrition Evaluation)
 */
export class Normalizer {
  public static normalize(source: SourceRecipe): {
    normalized: NormalizedRecipe;
    fitBiteRecipe: FitBiteRecipe;
  } {
    // 1. 规范化菜名（去除“的做法”等冗余字样）
    const cleanTitle = source.originalTitle.replace(/的做法$/, '').replace(/【.*?】/g, '').trim();

    // 2. 分离与标准化食材 (Main Ingredients vs Pantry Seasonings)
    const mainIngredients: NormalizedIngredient[] = [];
    const pantryIngredients: NormalizedIngredient[] = [];
    const unrecognizedItems: string[] = [];

    // 建立 calculation 快速检索映射，用于提取真实存在的克数或数量
    const calculationMap = new Map<string, { amount?: number; unit?: string }>();
    for (const calc of source.rawCalculations) {
      const parsed = parseRawCalculationItem(calc);
      if (parsed) {
        calculationMap.set(parsed.name, { amount: parsed.amount, unit: parsed.unit });
      }
    }

    const seenMainIds = new Set<string>();
    const seenPantryIds = new Set<string>();

    for (const rawItem of source.rawIngredients) {
      const cleanedRaw = rawItem.replace(/^[-*•]\s*/, '').trim();
      if (!cleanedRaw) continue;

      // 过滤水介质与厨房工具/器皿
      if (isWaterOrIgnored(cleanedRaw) || isKitchenTool(cleanedRaw)) {
        continue;
      }

      // 调料类处理
      const pantryDef = resolvePantry(cleanedRaw);
      if (pantryDef) {
        if (!seenPantryIds.has(pantryDef.id)) {
          seenPantryIds.add(pantryDef.id);

          // 从 calculationMap 中提取真实存在的数量与单位，绝不编造
          let amount: number | undefined;
          let unit: string | undefined;

          const cleanedName = cleanIngredientRawText(cleanedRaw);
          for (const [calcName, val] of calculationMap.entries()) {
            if (calcName === cleanedName || calcName.includes(cleanedName) || cleanedName.includes(calcName)) {
              amount = val.amount;
              unit = val.unit;
              break;
            }
          }

          pantryIngredients.push({
            canonicalId: pantryDef.id,
            displayName: pantryDef.name,
            category: 'pantry',
            rawText: cleanedRaw,
            amount,
            unit,
            isPantry: true
          });
        }
        continue;
      }

      // 核心主食材处理（保留替代事实，严禁跨部位泛化）
      const resolved = resolveCanonicalWithOptions(cleanedRaw);
      if (resolved) {
        const canonicalDef = resolved.primary;
        if (!seenMainIds.has(canonicalDef.id)) {
          seenMainIds.add(canonicalDef.id);

          // 仅从 raw calculations 提取真实存在的数量，绝不编造
          let amount: number | undefined;
          let unit: string | undefined;

          const cleanedName = cleanIngredientRawText(cleanedRaw);
          for (const [calcName, val] of calculationMap.entries()) {
            if (calcName === cleanedName || calcName.includes(cleanedName) || cleanedName.includes(calcName)) {
              amount = val.amount;
              unit = val.unit;
              break;
            }
          }

          // 核心护栏：为 anyOf 的每个选项精确分配自身的数量与单位
          let optionsWithAmounts: CanonicalOption[] | undefined = undefined;
          if (resolved.mode === 'anyOf' && resolved.alternatives) {
            optionsWithAmounts = resolved.alternatives.map((opt, idx) => {
              if (idx === 0) {
                return {
                  id: opt.id,
                  name: opt.name,
                  amount,
                  unit
                };
              }

              let altAmount: number | undefined;
              let altUnit: string | undefined;
              for (const [calcName, val] of calculationMap.entries()) {
                if (/(或者|或|\/|or)/.test(calcName) || calcName.includes(cleanedName) || cleanedName.includes(calcName)) {
                  continue;
                }
                const cleanCalc = cleanIngredientRawText(calcName);
                if (cleanCalc === opt.name || cleanCalc.includes(opt.name)) {
                  altAmount = val.amount;
                  altUnit = val.unit;
                  break;
                }
              }

              return {
                id: opt.id,
                name: opt.name,
                amount: altAmount,
                unit: altUnit
              };
            });
          }

          mainIngredients.push({
            canonicalId: canonicalDef.id,
            displayName: canonicalDef.name,
            category: canonicalDef.category,
            rawText: cleanedRaw,
            amount,
            unit,
            isPantry: false,
            mode: resolved.mode,
            alternatives: optionsWithAmounts
          });
        }
        continue;
      }

      unrecognizedItems.push(cleanedRaw);
    }

    // 3. 烹饪方式（属于标准化元数据，若无明确依据则设为 null）
    const cookingMethod = Normalizer.parseCookingMethod(cleanTitle, source.rawSteps);

    // 4. 标签体系与分类（标准化元数据）
    const tags: string[] = ['家常菜'];
    if (cookingMethod) {
      tags.push(cookingMethod);
    }
    if (source.rawSteps.length <= 6) {
      tags.push('快手菜');
    }

    let category = '家常热菜';
    if (cookingMethod === '拌') {
      category = '清爽凉菜';
      tags.push('凉菜');
    } else if (mainIngredients.some(m => m.canonicalId.startsWith('p_fish') || m.canonicalId.startsWith('p_shrimp'))) {
      category = '水产海鲜';
      tags.push('高蛋白');
    } else if (mainIngredients.some(m => m.canonicalId === 'p_chicken_breast')) {
      category = '低脂禽肉';
      tags.push('低脂高蛋白');
    } else if (mainIngredients.some(m => m.canonicalId.startsWith('p_tofu'))) {
      category = '豆品素食';
      tags.push('植物蛋白');
    }

    // 5. 难度判断（保留 rawDifficulty 事实，映射简单/中等/困难；缺失时严格为 null）
    const rawDifficulty = source.rawDifficulty ? source.rawDifficulty.trim() : null;
    const difficultyLevel = Normalizer.mapDifficultyLevel(rawDifficulty);

    // 6. 预估烹饪时长
    const estimatedMinutes = Normalizer.parseEstimatedMinutes(source.rawEstimatedTimeText);

    // 7. 份数
    const servings = Normalizer.parseServingsFromText(source.rawCalculations, source.rawDescription);

    // 构建 NormalizedRecipe
    const normalized: NormalizedRecipe = {
      source,
      normalizedTitle: cleanTitle,
      category,
      mainIngredients,
      pantryIngredients,
      unrecognizedItems,
      cookingMethod,
      cuisine: '中餐家常',
      tasteTags: [],
      tags,
      difficulty: difficultyLevel,
      rawDifficulty,
      servings,
      estimatedMinutes
    };

    // 构建 FitBiteRecipe
    const fitBiteIngredients: FitBiteIngredientItem[] = mainIngredients.map(item => ({
      id: item.canonicalId,
      name: item.displayName,
      amount: item.amount,
      unit: item.unit,
      originalRawText: item.rawText,
      mode: item.mode,
      alternatives: item.alternatives
    }));

    const fitBitePantryItems: Array<string | FitBitePantryItem> = source.source === 'howtocook'
      ? pantryIngredients.map(p => p.canonicalId)
      : pantryIngredients.map(p => ({
          id: p.canonicalId,
          name: p.displayName,
          amount: p.amount,
          unit: p.unit,
          originalRawText: p.rawText
        }));

    const fitBiteRecipe: FitBiteRecipe = {
      id: `imported_${source.source}_${source.sourceId}`,
      name: cleanTitle,
      category,
      provenance: {
        source: source.source,
        sourceId: source.sourceId,
        sourceUrl: source.sourceUrl,
        sourceFile: source.sourceFile,
        license: source.license,
        contentHash: source.contentHash
      },
      requiredIngredients: fitBiteIngredients,
      pantryIngredients: fitBitePantryItems,
      instructions: source.rawSteps,
      tags,
      cookingMethod,
      nutrition: null,
      servings,
      difficulty: difficultyLevel,
      rawDifficulty,
      estimatedMinutes
    };

    // 8. 营养计算引擎双轨估算注入 (Dual-Track Nutrition Feasibility)
    const foodsMap = getFoodsMap();
    const foodLookup = (idOrName: string): NutritionFood | undefined => {
      let foodCode: string | undefined = CANONICAL_NUTRITION_LOOKUP.get(idOrName)?.foodCode || PANTRY_TO_SANOTSU[idOrName];
      if (!foodCode) {
        const resolved = resolveCanonicalWithOptions(idOrName)?.primary;
        if (resolved) {
          foodCode = CANONICAL_NUTRITION_LOOKUP.get(resolved.id)?.foodCode;
        }
      }
      return foodCode ? foodsMap.get(foodCode) : undefined;
    };

    const evalResult = evaluateRecipeNutrition(
      {
        id: fitBiteRecipe.id,
        name: fitBiteRecipe.name,
        servings: fitBiteRecipe.servings,
        requiredIngredients: fitBiteIngredients.map(ing => ({
          id: ing.id,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          originalRawText: ing.originalRawText
        })),
        pantryIngredients: pantryIngredients.map(p => ({
          id: p.canonicalId,
          name: p.displayName,
          amount: p.amount,
          unit: p.unit
        }))
      },
      {
        foodLookup,
        allowEstimated: true,
        mode: 'dual'
      }
    );

    if (evalResult.total) {
      fitBiteRecipe.nutrition = {
        calories: Math.round(evalResult.total.caloriesKcal),
        protein: roundTo(evalResult.total.proteinGrams, 1),
        fat: roundTo(evalResult.total.fatGrams, 1),
        carbs: roundTo(evalResult.total.carbGrams, 1),
        confidence: evalResult.confidence,
        calorieRange: evalResult.calorieRange,
        isEstimated: evalResult.isEstimated
      };
    }

    return { normalized, fitBiteRecipe };
  }

  public static parseCookingMethod(title: string, steps: string[]): string | null {
    if (title.includes('炒') || steps.some(s => s.includes('翻炒') || s.includes('大火炒'))) {
      return '炒';
    }
    if (title.includes('蒸') || steps.some(s => s.includes('清蒸') || s.includes('大火蒸'))) {
      return '蒸';
    }
    if (title.includes('拌') || title.includes('凉拌') || steps.some(s => s.includes('搅拌均匀') || s.includes('拌匀'))) {
      return '拌';
    }
    if (title.includes('焖') || title.includes('油焖')) {
      return '焖';
    }
    if (title.includes('煎') || steps.some(s => s.includes('煎至'))) {
      return '煎';
    }
    if (title.includes('汤') || title.includes('煮') || steps.some(s => s.includes('煮熟') || s.includes('煮制'))) {
      return '煮';
    }
    return null;
  }

  public static mapDifficultyLevel(rawDiff?: string | null): string | null {
    if (!rawDiff) return null;
    const trimmed = rawDiff.trim();
    if (trimmed.includes('★★★★') || trimmed.includes('★★★★★') || trimmed === '困难' || trimmed === '高级') return '困难';
    if (trimmed.includes('★★★') || trimmed === '中等' || trimmed === '普通') return '中等';
    if (trimmed.includes('★★') || trimmed.includes('★') || trimmed === '简单') return '简单';
    return null;
  }

  public static parseEstimatedMinutes(rawTimeText?: string): number | null {
    if (!rawTimeText) return null;

    const match = rawTimeText.match(/(?:预计耗时|总耗时|烹饪时间|制作时间|耗时)[：:]\s*([0-9.一二两三四五六七八九十廿半]+)?\s*(分钟|小时|刻钟)?/);
    if (match) {
      const rawNum = match[1] || '';
      const unit = match[2];

      let val = 0;
      if (rawNum === '十分钟' || rawNum === '十') val = 10;
      else if (rawNum === '廿' || rawNum === '二十') val = 20;
      else if (rawNum === '半') val = 0.5;
      else if (rawNum === '一' || rawNum === '1') val = 1;
      else if (rawNum === '两' || rawNum === '二' || rawNum === '2') val = 2;
      else if (rawNum === '三' || rawNum === '3') val = 3;
      else val = parseFloat(rawNum || '0');

      if (unit === '小时') {
        return Math.round(val * 60);
      }
      if (unit === '刻钟') {
        return Math.round(val * 15);
      }
      return Math.round(val);
    }

    return null;
  }

  public static parseServingsFromText(calculations: string[], description?: string): number | null {
    const fullText = (description || '') + ' ' + calculations.join(' ');
    if (/(两|2|二)\s*个人/.test(fullText)) return 2;
    if (/(一|1)\s*(个人|人份|人版本)/.test(fullText)) return 1;
    if (/(三|3)\s*个人/.test(fullText)) return 3;
    return null;
  }
}
