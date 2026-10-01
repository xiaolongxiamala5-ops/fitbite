import fs from 'fs';
import path from 'path';
import { SourceRecipe, NormalizedRecipe, NormalizedIngredient, FitBiteRecipe, FitBiteIngredientItem, FitBitePantryItem, CanonicalOption } from './types';
import { resolveCanonical, resolveCanonicalWithOptions, cleanIngredientRawText } from './canonicalDictionary';
import { resolvePantry, isWaterOrIgnored, isKitchenTool } from './pantryDictionary';
import { evaluateRecipeNutrition } from '../../shared/nutrition';
import { CANONICAL_NUTRITION_LOOKUP, PANTRY_TO_SANOTSU } from '../../data/nutrition/mappings/canonical-to-sanotsu';
import { NutritionFood } from '../../shared/nutrition/types';
import { roundTo } from '../../shared/nutrition/calculator';

let cachedFoodsMap: Map<string, NutritionFood> | null = null;

export interface NormalizerOptions {
  foodLookup?: (idOrName: string) => NutritionFood | undefined;
}

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
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '半': 0.5,
    '一两': 1.5, '两三': 2.5, '三四': 3.5, '四五': 4.5, '五六': 5.5, '六七': 6.5, '七八': 7.5, '八九': 8.5
  };
  if (map[str] !== undefined) return map[str];
  if (str.includes('/')) {
    const [num, den] = str.split('/').map(Number);
    if (den && !isNaN(num) && !isNaN(den)) return num / den;
  }
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
function splitOutsideParentheses(text: string): string[] {
  if (/(或者|或|\/|or)/i.test(text)) return [text];
  const parts: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '（' || char === '(') {
      parenDepth++;
      current += char;
    } else if (char === '）' || char === ')') {
      if (parenDepth > 0) parenDepth--;
      current += char;
    } else if (parenDepth === 0 && (char === '、' || char === ',' || char === '，')) {
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts;
}

/**
 * Parses raw calculation lines supporting both prefix and suffix quantity patterns
 */
export function parseRawCalculationItem(calc: string): { name: string; amount?: number; unit?: string } | null {
  let line = calc.replace(/^[-*•]\s*/, '').trim();
  line = line.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '').trim();
  if (!line) return null;

  // Case A: Explicit delimiter (=, :, ：, 为)
  // e.g. "带皮五花肉 = 800克", "牛肉用量为 250 g/人", "白豆腐的数量 = 份数 * 0.8", "莴笋 = 约 250g"
  const delimMatch = line.match(/(?:用量|数量|量|比例)\s*为|[=：:]|\s+为\s+/);
  if (delimMatch && delimMatch.index !== undefined) {
    const rawName = line.slice(0, delimMatch.index).trim().replace(/(?:用量|数量|量)$/, '');
    let qtyPart = line.slice(delimMatch.index + delimMatch[0].length).trim();
    qtyPart = qtyPart.replace(/^(?:份数|每份)\s*[\*xX×]\s*/, '').trim();
    qtyPart = qtyPart.replace(/[\/\*]\s*(?:per|人|份数|三人|二人|两人).*$/i, '').trim();
    qtyPart = qtyPart.replace(/\s*向上取整.*$/, '').trim();
    qtyPart = qtyPart.replace(/^(?:约|大概|共约|每份约)\s*/, '').trim();

    // Check range in qtyPart: e.g. "10-15ml", "20-30g", "300g 至 500g"
    const range = qtyPart.match(/^([0-9.]+)\s*(?:g|克|ml)?\s*[-~至到]\s*([0-9.]+)\s*([a-zA-Z\u4e00-\u9fa5]+)/);
    if (range) {
      return {
        name: cleanIngredientRawText(rawName),
        amount: (parseFloat(range[1]) + parseFloat(range[2])) / 2,
        unit: range[3].trim()
      };
    }

    const single = qtyPart.match(/^([一二两三四五六七八九十半\d\.\/]+)\s*([a-zA-Z\u4e00-\u9fa5]+)?/);
    if (single) {
      const num = parseChineseNum(single[1]) ?? undefined;
      let unit = single[2] ? single[2].trim() : undefined;
      if (unit) {
        unit = unit.replace(/[，,（(].*$/, '').replace(/[\/\*].*$/, '').trim();
      }
      return {
        name: cleanIngredientRawText(rawName),
        amount: num,
        unit
      };
    }

    return { name: cleanIngredientRawText(rawName) };
  }

  // Check parenthesized or comma-separated gram / ml amount:
  // e.g. "花椒 30 颗(20g)", "花生 10 颗(30g)", "生菜 1 棵( 200 g ± 50 )", "蒜苔 1 扎（每扎蒜苔约 190g）", "黑鳕鱼，带皮，2 片，450g", "五花肉薄片 4 片（约 20g）"
  const parenGrams = line.match(/[（(][^）)]*?([0-9.]+)\s*(g|克|ml|毫升)[^）)]*?[）)]/i);
  if (parenGrams) {
    const mainNamePart = line.replace(/[（(].*[）)]/, '').trim();
    const nameMatch = mainNamePart.match(/^([^\s0-9一二两三四五六七八九十半，,]+)/);
    if (nameMatch) {
      return {
        name: cleanIngredientRawText(nameMatch[1].trim()),
        amount: parseFloat(parenGrams[1]),
        unit: parenGrams[2].toLowerCase() === '克' ? 'g' : parenGrams[2]
      };
    }
  }

  const commaGrams = line.match(/[,，]\s*([0-9.]+)\s*(g|克|ml|毫升)/i);
  if (commaGrams) {
    const nameMatch = line.match(/^([^\s0-9一二两三四五六七八九十半，,]+)/);
    if (nameMatch) {
      return {
        name: cleanIngredientRawText(nameMatch[1].trim()),
        amount: parseFloat(commaGrams[1]),
        unit: commaGrams[2].toLowerCase() === '克' ? 'g' : commaGrams[2]
      };
    }
  }

  // Case B: Leading quantity without delimiter
  // e.g. "1 盒内脂豆腐", "1 枚咸鸭蛋", "20-30g 五花肉", "两瓣大蒜", "2 片生姜", "5 根小米辣"
  const rangeMatch = line.match(/^([0-9.]+)\s*[-~至到]\s*([0-9.]+)\s*(g|kg|ml|克|千克|毫升|瓣|片|块|个|只|条|根|朵|盒|包|枚|支|颗|把|扎)\s*(?:的)?\s*(.+)$/);
  if (rangeMatch) {
    return {
      name: cleanIngredientRawText(rangeMatch[4].trim()),
      amount: (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2,
      unit: rangeMatch[3].trim()
    };
  }

  const leadingNumMatch = line.match(/^([一二两三四五六七八九十半\d\.]+)\s*([个只条根朵瓣盒块包枚支片粒颗把扎叶gkgml克千克毫升]+)\s*(?:的)?\s*(.+)$/);
  if (leadingNumMatch) {
    const num = parseChineseNum(leadingNumMatch[1]) ?? undefined;
    const unit = leadingNumMatch[2].trim();
    const name = cleanIngredientRawText(leadingNumMatch[3].trim());
    return { name, amount: num, unit };
  }

  // Case C: Name first without delimiter
  // Suffix range: e.g. "食用油 10-15ml", "蒜 5-8 瓣", "金针菇 400-500 克"
  const suffixRange = line.match(/^([^\d\s=：:，,]+?)\s+(?:约|大概)?\s*([0-9.]+)\s*[-~至到]\s*([0-9.]+)\s*([a-zA-Z\u4e00-\u9fa5]+)/);
  if (suffixRange) {
    let unit = suffixRange[4].trim().replace(/[\/\*].*$/, '');
    return {
      name: cleanIngredientRawText(suffixRange[1].trim()),
      amount: (parseFloat(suffixRange[2]) + parseFloat(suffixRange[3])) / 2,
      unit
    };
  }

  // Standard match with space: e.g. "五花肉 200 g", "包菜 1 颗", "青椒 5 个，长度在 10-15cm 的最为合适", "鸡蛋 1 个/per"
  const spaceMatch = line.match(/^([^\d\s=：:，,]+?)\s+(?:约|大概)?\s*([一二两三四五六七八九十半\d\.\/]+)\s*([a-zA-Z\u4e00-\u9fa5]+)?/);
  if (spaceMatch) {
    let unit = spaceMatch[3] ? spaceMatch[3].trim() : undefined;
    if (unit) {
      unit = unit.replace(/[，,（(].*$/, '').replace(/[\/\*].*$/, '').trim();
    }
    return {
      name: cleanIngredientRawText(spaceMatch[1].trim()),
      amount: parseChineseNum(spaceMatch[2]) ?? undefined,
      unit
    };
  }

  // Standard match without space: e.g. "土豆两三个", "葱一根", "鸡蛋4个"
  const noSpaceMatch = line.match(/^([^\d\s=：:，,一二两三四五六七八九十半]+)(?:约|大概)?([一二两三四五六七八九十半\d\.\/]+)\s*([a-zA-Z\u4e00-\u9fa5]+)?/);
  if (noSpaceMatch) {
    let unit = noSpaceMatch[3] ? noSpaceMatch[3].trim() : undefined;
    if (unit) {
      unit = unit.replace(/[，,（(].*$/, '').replace(/[\/\*].*$/, '').trim();
    }
    return {
      name: cleanIngredientRawText(noSpaceMatch[1].trim()),
      amount: parseChineseNum(noSpaceMatch[2]) ?? undefined,
      unit
    };
  }

  return null;
}

/**
 * FitBite Normalizer (C.1.1 Refined & Dual-Track Nutrition Evaluation)
 */
export class Normalizer {
  public static normalize(source: SourceRecipe, options?: NormalizerOptions): {
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
      const items = (calc.includes('、') && !/(或者|或|\/|or)/i.test(calc))
        ? calc.split('、').map(s => s.trim())
        : [calc];
      for (const item of items) {
        const parsed = parseRawCalculationItem(item);
        if (parsed) {
          calculationMap.set(parsed.name, { amount: parsed.amount, unit: parsed.unit });
        }
      }
    }

    const seenMainIds = new Set<string>();
    const seenPantryIds = new Set<string>();

    // 预处理：展开单行包含多个食材/调料的情况（如 "葱、姜"、"料酒、盐、冰糖、植物油"）
    // 括号内的逗号/顿号（如"昆布酱油（一种日式的少盐酱油，用于为温泉蛋调味）"）不可拆分
    const expandedRawIngredients: string[] = [];
    for (const rawItem of source.rawIngredients) {
      const cleaned = rawItem.replace(/^[-*•]\s*/, '').trim();
      if (!cleaned) continue;
      const parts = splitOutsideParentheses(cleaned);
      expandedRawIngredients.push(...parts);
    }

    for (const cleanedRaw of expandedRawIngredients) {
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

          // 1. 优先严格完全相等匹配，防止白糖误匹冰糖、干辣椒误匹辣椒粉
          const cleanedName = cleanIngredientRawText(cleanedRaw);
          for (const [calcName, val] of calculationMap.entries()) {
            const cleanCalc = cleanIngredientRawText(calcName);
            const isExact =
              calcName === cleanedName ||
              cleanCalc === pantryDef.name ||
              pantryDef.aliases.some(a => cleanCalc === a);

            if (isExact) {
              amount = val.amount;
              unit = val.unit;
              break;
            }
          }

          // 2. 若未严格匹配，进行无歧义别名匹配（排除“糖”、“油”等易混淆单字别名）
          if (amount === undefined) {
            for (const [calcName, val] of calculationMap.entries()) {
              const cleanCalc = cleanIngredientRawText(calcName);
              const safeAliases = pantryDef.aliases.filter(a => a.length >= 2);
              const isMatch =
                (cleanCalc.length >= 2 && cleanedName.length >= 2 && (calcName.includes(cleanedName) || cleanedName.includes(calcName))) ||
                safeAliases.some(a => (cleanCalc.length >= 2 && (cleanCalc.includes(a) || a.includes(cleanCalc))));

              if (isMatch) {
                amount = val.amount;
                unit = val.unit;
                break;
              }
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
            const sameCanonical = canonicalDef && resolveCanonical(calcName)?.id === canonicalDef.id;
            if (calcName === cleanedName || calcName.includes(cleanedName) || cleanedName.includes(calcName) || sameCanonical) {
              amount = val.amount;
              unit = val.unit;
              break;
            }
          }

          // 增强：若未命中，进行肉类/主要蛋白质跨同义词匹配
          if (amount === undefined) {
            for (const [calcName, val] of calculationMap.entries()) {
              if (canonicalDef.id.startsWith('p_pork') && ['肉', '猪肉', '瘦肉', '肉丝', '肉片', '五花肉'].includes(calcName)) {
                amount = val.amount;
                unit = val.unit;
                break;
              }
              if (canonicalDef.id.startsWith('p_beef') && ['牛肉', '牛肉丝', '牛肉片', '牛腩', '肉'].includes(calcName)) {
                amount = val.amount;
                unit = val.unit;
                break;
              }
              if (canonicalDef.id.startsWith('p_chicken') && ['鸡', '鸡肉', '半只鸡'].includes(calcName)) {
                amount = val.amount;
                unit = val.unit;
                break;
              }
              if (canonicalDef.id.startsWith('p_fish') && ['鱼', '鱼肉', '鱼片'].includes(calcName)) {
                amount = val.amount;
                unit = val.unit;
                break;
              }
            }
          }

          // 若属于可选配料（如"虾仁（个人口味，可加可不加）"、"莴笋（可选）"），跳过不作为主要必备食材
          const isOptional = /（(?:可选|如需要|可加可不加|依个人口味|个人口味)[^）)]*）|\((?:可选|如需要|可加可不加|依个人口味|个人口味)[^)]*\)/.test(cleanedRaw);
          if (isOptional) {
            continue;
          }

          // 厨房配菜未定量时的合理估算（如上汤娃娃菜中的火腿/午餐肉丁、点缀辣椒）
          if (amount === undefined && (cleanedName.includes('午餐肉') || cleanedName.includes('火腿') || canonicalDef.id === 'p_luncheon_meat')) {
            amount = 50;
            unit = 'g';
          }
          if (amount === undefined && canonicalDef.id === 'v_hot_pepper') {
            amount = 1;
            unit = '根';
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

    // ─────────────────────────────────────────────────────────────
    // StepIngredientAligner (C.1.3)
    // 扫描步骤文本中明确量化的调料，对比已解析的 pantryIngredients，
    // 若发现缺失则自动补入，防止"步骤用了但清单没写"的热量漏算。
    // 兼具两种中文烹饪语序：
    // 模式 A (数量在前): "10 ml 食用油"
    // 模式 B (调料在前): "黄酒 30g", "盐 3g", "冰糖 10 克"
    // ─────────────────────────────────────────────────────────────
    const PANTRY_KEYWORDS = '食用油|植物油|菜籽油|花生油|猪油|色拉油|冰糖|白糖|砂糖|黄酒|料酒|绍兴酒|生抽|老抽|蚝油|盐|精盐|食用盐|淀粉|生粉|水淀粉|花椒|八角|香叶|葱|大葱|小葱|香葱|姜|生姜';
    const STEP_PANTRY_PATTERN_A = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(ml|g|克|毫升|大勺|茶匙)\\s*(?:的)?\\s*(${PANTRY_KEYWORDS})`, 'g');
    const STEP_PANTRY_PATTERN_B = new RegExp(`(${PANTRY_KEYWORDS})\\s*(?:约|大概)?\\s*(\\d+(?:\\.\\d+)?)\\s*(ml|g|克|毫升|大勺|茶匙)`, 'g');

    for (const step of source.rawSteps) {
      // 提取匹配结果数组 [amount, unit, ingredient]
      const matches: Array<{ amount: number; unit: string; ingredient: string }> = [];

      let mA: RegExpExecArray | null;
      STEP_PANTRY_PATTERN_A.lastIndex = 0;
      while ((mA = STEP_PANTRY_PATTERN_A.exec(step)) !== null) {
        matches.push({ amount: parseFloat(mA[1]), unit: mA[2], ingredient: mA[3] });
      }

      let mB: RegExpExecArray | null;
      STEP_PANTRY_PATTERN_B.lastIndex = 0;
      while ((mB = STEP_PANTRY_PATTERN_B.exec(step)) !== null) {
        matches.push({ amount: parseFloat(mB[2]), unit: mB[3], ingredient: mB[1] });
      }

      for (const { amount, unit, ingredient } of matches) {
        const pantryDef = resolvePantry(ingredient);
        if (!pantryDef) continue;

        if (!seenPantryIds.has(pantryDef.id)) {
          // 步骤中发现了清单完全缺失的调料，补入
          seenPantryIds.add(pantryDef.id);
          pantryIngredients.push({
            canonicalId: pantryDef.id,
            displayName: pantryDef.name,
            category: 'pantry',
            rawText: `${amount}${unit}${ingredient}（步骤文本对齐补入）`,
            amount,
            unit,
            isPantry: true
          });
        } else {
          // 已有条目，若数量缺失则从步骤补充
          const existing = pantryIngredients.find(p => p.canonicalId === pantryDef.id);
          if (existing && existing.amount === undefined) {
            existing.amount = amount;
            existing.unit = unit;
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 烹调方式用油兜底规则 (C.1.3)
    // 炒/爆炒/煎/炸/油焖类菜谱，若食材与调料中完全无任何油脂类，
    // 注入 10ml 兜底估算值（标注来源，便于审计追溯）。
    // 排除已有麻油的凉拌、清蒸或水煮类菜品。
    // ─────────────────────────────────────────────────────────────
    const isColdOrSteamed = cleanTitle.includes('凉拌') || cleanTitle.includes('清蒸') || cleanTitle.includes('水煮');
    const HOT_OIL_METHODS = ['炒', '煎', '炸', '焖', '爆炒', '油焖'];
    const hasOilInTitle = HOT_OIL_METHODS.some(m => source.originalTitle.includes(m));
    const hasOilInSteps = source.rawSteps.some(s =>
      /起锅烧油|热锅.*油|倒油.*烧热|油温.*成热|下油.*煎/.test(s)
    );
    const hasAnyOilRegistered =
      seenPantryIds.has('pantry_oil') ||
      seenPantryIds.has('preset_sesame_oil') ||
      seenPantryIds.has('preset_chili_oil');

    if (!isColdOrSteamed && (hasOilInTitle || hasOilInSteps) && !hasAnyOilRegistered) {
      seenPantryIds.add('pantry_oil');
      pantryIngredients.push({
        canonicalId: 'pantry_oil',
        displayName: '食用油',
        category: 'pantry',
        rawText: '食用油（烹调方式兜底估算 10ml）',
        amount: 10,
        unit: 'ml',
        isPantry: true
      });
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
    const defaultFoodLookup = (idOrName: string): NutritionFood | undefined => {
      let foodCode: string | undefined = CANONICAL_NUTRITION_LOOKUP.get(idOrName)?.foodCode || PANTRY_TO_SANOTSU[idOrName];
      if (!foodCode) {
        const resolved = resolveCanonicalWithOptions(idOrName)?.primary;
        if (resolved) {
          foodCode = CANONICAL_NUTRITION_LOOKUP.get(resolved.id)?.foodCode;
        }
      }
      return foodCode ? foodsMap.get(foodCode) : undefined;
    };
    const foodLookup = options?.foodLookup ?? defaultFoodLookup;

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
    } else {
      if (process.env.DEBUG_NORMALIZER) {
        console.log(`[DEBUG_NORMALIZER] ${fitBiteRecipe.name}:`, evalResult.blockingCriticalIngredients, evalResult.incompleteReasons);
      }
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
