import { SourceRecipe, NormalizedRecipe, NormalizedIngredient, FitBiteRecipe, FitBiteIngredientItem, CanonicalOption } from './types';
import { resolveCanonicalWithOptions, cleanIngredientRawText } from './canonicalDictionary';
import { resolvePantry, isWaterOrIgnored, isKitchenTool } from './pantryDictionary';

/**
 * FitBite Normalizer (C.1.1 Refined)
 *
 * Strict Architectural Guardrails:
 * 1. ONLY true synonyms are merged into canonical keys. Meat cuts, fish species, and mushroom varieties
 *    preserve distinct canonical IDs.
 * 2. Ingredient alternatives (A or B / A（或者B）) are explicitly preserved as `mode: 'anyOf'` with `alternatives` array.
 * 3. NO hallucination of nutrition facts: nutrition remains strictly null.
 * 4. NO guessing of estimatedMinutes: ONLY parsed when source explicitly contains dedicated fields like
 *    "预计耗时" / "总耗时" / "烹饪时间" / "制作时间", otherwise strictly null.
 * 5. Difficulty preserves source fact `rawDifficulty` and deterministic level mapping `difficulty`.
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
      const match = calc.match(/^([^=：:\s]+)\s*(=|:|：)?\s*([0-9.]+)?\s*([a-zA-Z\u4e00-\u9fa5]+)?/);
      if (match) {
        const ingName = match[1].trim();
        const num = match[3] ? parseFloat(match[3]) : undefined;
        const unit = match[4] ? match[4].trim() : undefined;
        calculationMap.set(ingName, { amount: num, unit });
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
          pantryIngredients.push({
            canonicalId: pantryDef.id,
            displayName: pantryDef.name,
            category: 'pantry',
            rawText: cleanedRaw,
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
            if (calcName.includes(cleanedName) || cleanedName.includes(calcName)) {
              amount = val.amount;
              unit = val.unit;
              break;
            }
          }

          // 核心护栏：为 anyOf 的每个选项精确分配自身的数量与单位
          // 严禁将主项特定单位（如“1 支”手枪腿）自动借给替代项（鸡胸肉）！
          let optionsWithAmounts: CanonicalOption[] | undefined = undefined;
          if (resolved.mode === 'anyOf' && resolved.alternatives) {
            optionsWithAmounts = resolved.alternatives.map((opt, idx) => {
              if (idx === 0) {
                // 主选项绑定主数量与单位（如：1 支）
                return {
                  id: opt.id,
                  name: opt.name,
                  amount,
                  unit
                };
              }

              // 替代选项：只有当计算表中存在针对该替代项的独立单独声明（非联合替代行）时才赋值，否则严格保持 undefined
              let altAmount: number | undefined;
              let altUnit: string | undefined;
              for (const [calcName, val] of calculationMap.entries()) {
                // 若此计算行为复合替代行或直接匹配原始组名，则属于主项所属行，严禁作为替代项的独立数量
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

    // 6. 预估烹饪时长（严格收紧事实来源：只有存在明确“预计耗时/总耗时/烹饪时间/制作时间”字段时才解析，否则为 null）
    const estimatedMinutes = Normalizer.parseEstimatedMinutes(source.rawEstimatedTimeText);

    // 7. 份数（完全依据原文计算说明，未指明时为 null）
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

    const fitBitePantryIds = pantryIngredients.map(p => p.canonicalId);

    const fitBiteRecipe: FitBiteRecipe = {
      id: `imported_howtocook_${source.sourceId}`,
      name: cleanTitle,
      category,
      provenance: {
        source: 'howtocook',
        sourceId: source.sourceId,
        sourceUrl: source.sourceUrl,
        sourceFile: source.sourceFile,
        license: source.license,
        contentHash: source.contentHash
      },
      requiredIngredients: fitBiteIngredients,
      pantryIngredients: fitBitePantryIds,
      instructions: source.rawSteps,
      tags,
      cookingMethod,
      nutrition: null, // 严格置空，绝不生成或猜测热量与宏量营养素
      servings,
      difficulty: difficultyLevel,
      rawDifficulty,
      estimatedMinutes
    };

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
    if (trimmed.includes('★★★★') || trimmed.includes('★★★★★')) return '困难';
    if (trimmed.includes('★★★')) return '中等';
    if (trimmed.includes('★★') || trimmed.includes('★')) return '简单';
    return null;
  }

  /**
   * 严格收紧事实来源：只有当源文存在明确的整道菜耗时字段（如“预计耗时：30 分钟”）时才解析
   * 严禁从普通步骤或段落描述中抓取步骤时长！
   */
  public static parseEstimatedMinutes(rawTimeText?: string): number | null {
    if (!rawTimeText) return null;

    const match = rawTimeText.match(/(?:预计耗时|总耗时|烹饪时间|制作时间)[：:]\s*([0-9.]+)?\s*(分钟|小时)/);
    if (match) {
      const val = parseFloat(match[1] || '0');
      const unit = match[2];
      if (unit === '小时') {
        return Math.round(val * 60);
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
