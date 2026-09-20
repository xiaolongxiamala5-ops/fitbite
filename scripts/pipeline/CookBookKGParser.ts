import crypto from 'crypto';
import { SourceRecipe } from './types';

export interface RawCookBookKGRecipe {
  主料: string[];
  辅料?: string[];
  配料?: string[];
  调料?: string[];
  鱼香调料?: string[];
  特色?: string[];
  制作步骤: string[];
}

export interface CookBookKGMeta {
  sourceId: string;
  sourceUrl: string;
  sourceFile: string;
}

const PURE_OIL_REGEX = /^(食用油|植物油|花生油|调和油|菜籽油|色拉油|大豆油|玉米油|橄榄油|猪油|芝麻油|香油|红油|花椒油|辣椒油|清油|熟油|油)$/;

/**
 * CookBookKGParser (Phase 1)
 *
 * Lossless parser converting CookBook-KG JSON recipe objects into FitBite's SourceRecipe.
 * Adheres strictly to:
 * 1. Factual extraction only: no guessing weights or hallucinating numbers.
 * 2. Limited Step Quantity Extraction: strictly when oil is absent from ingredient list AND
 *    step text explicitly writes exact numerical amount and unit (e.g. "40毫升左右的食用油").
 */
export class CookBookKGParser {
  public static parse(
    dishName: string,
    rawRecipe: RawCookBookKGRecipe,
    meta: CookBookKGMeta
  ): SourceRecipe {
    const jsonString = JSON.stringify(rawRecipe);
    const contentHash = crypto.createHash('sha256').update(jsonString, 'utf-8').digest('hex');

    const rawIngredients: string[] = [];
    const rawCalculations: string[] = [];

    // 1. 合并各原料分区 (主料、辅料、配料、调料)
    const combinedRawLines = [
      ...(rawRecipe['主料'] || []),
      ...(rawRecipe['辅料'] || []),
      ...(rawRecipe['配料'] || []),
      ...(rawRecipe['调料'] || []),
      ...(rawRecipe['鱼香调料'] || [])
    ];

    let hasOilInIngredients = false;

    for (const line of combinedRawLines) {
      if (!line || !line.trim()) continue;
      const parts = line.split(/[:：]/).map(s => s.trim());
      const ingName = parts[0];
      const rawQty = parts[1] || '';

      if (!ingName) continue;
      rawIngredients.push(ingName);

      if (PURE_OIL_REGEX.test(ingName)) {
        hasOilInIngredients = true;
      }

      // 解析数量与单位
      const parsedQty = CookBookKGParser.normalizeRawQuantity(rawQty);
      if (parsedQty) {
        rawCalculations.push(`${ingName} = ${parsedQty}`);
      }
    }

    // 2. 清洗制作步骤 (移除开头的数字序号，如 "1: ")
    const rawSteps = (rawRecipe['制作步骤'] || []).map(step => {
      return step.replace(/^[0-9]+[：:\.]\s*/, '').trim();
    }).filter(s => s.length > 0);

    // 3. 受限的 Step Quantity Extraction：仅在食材表缺油时从步骤中提取白纸黑字的明确事实
    if (!hasOilInIngredients) {
      const fullStepText = rawSteps.join(' ');

      // 模式 A: 原文明确写有具体数值与单位 (如 "倒入40毫升左右的食用油" 或 "50毫升的油")
      const explicitOilMatch = fullStepText.match(/(?:倒入|加入|放入|下入|加|取)\s*([0-9.]+)\s*(毫升|ml|克|g|千克|kg|斤|两)(?:左右|上下)?的?(?:食用油|植物油|色拉油|花生油|菜籽油|油)/);
      if (explicitOilMatch) {
        const num = explicitOilMatch[1];
        let unit = explicitOilMatch[2];
        if (unit === '毫升') unit = 'ml';
        rawIngredients.push('食用油');
        rawCalculations.push(`食用油 = ${num}${unit}`);
      } else {
        // 模式 B: 步骤明确使用了油，但为模糊表述 (如 "锅中放油", "少许油", "适量油")
        // 规则：只记录存在食用油，严禁捏造任何克重/数字！
        const fuzzyOilMatch = /(?:锅中放油|放少许油|少许油|少许食油|适量油|适量食用油|热油|底油|淋油|热锅凉油)/.test(fullStepText);
        if (fuzzyOilMatch) {
          rawIngredients.push('食用油');
          // 不添加 rawCalculations，保持 amount: undefined
        }
      }
    }

    // 4. 解析特色元数据 (特色: ["口味: 麻辣", "工艺: 煮", "耗时: 十分钟", "难度: 普通"])
    let rawDifficulty: string | undefined = undefined;
    let rawEstimatedTimeText: string | undefined = undefined;

    for (const feat of (rawRecipe['特色'] || [])) {
      if (feat.startsWith('难度:') || feat.startsWith('难度：')) {
        rawDifficulty = feat.replace(/^难度[：:]\s*/, '').trim();
      } else if (feat.startsWith('耗时:') || feat.startsWith('耗时：')) {
        rawEstimatedTimeText = feat;
      }
    }

    return {
      originalTitle: dishName.trim(),
      source: 'cookbook-kg',
      sourceId: meta.sourceId,
      sourceUrl: meta.sourceUrl,
      sourceFile: meta.sourceFile,
      license: 'unknown',
      contentHash,
      rawIngredients,
      rawCalculations,
      rawSteps,
      rawDifficulty,
      rawEstimatedTimeText
    };
  }

  /**
   * 将食材用量字符串转为标准计算格式，或在模糊量时返回 null
   * 严禁猜重量，严禁把勺匙自动换算为克！
   */
  public static normalizeRawQuantity(rawQty: string): string | null {
    if (!rawQty) return null;
    const trimmed = rawQty.trim();
    if (/^(适量|少许|若干|适量即可|少许即可|酌量|适度|根据个人口味|一点)$/.test(trimmed)) {
      return null;
    }

    // 分数单位 (如 1/2勺 -> 0.5勺)
    const fracMatch = trimmed.match(/^([0-9]+)\/([0-9]+)\s*([a-zA-Z\u4e00-\u9fa5]+)$/);
    if (fracMatch) {
      const num = parseFloat(fracMatch[1]) / parseFloat(fracMatch[2]);
      const unit = fracMatch[3];
      return `${num}${unit}`;
    }

    // 中文数字单字 (如 一勺 -> 1勺, 半勺 -> 0.5勺, 两勺 -> 2勺, 一听 -> 1听)
    const cnMap: Record<string, number> = {
      '半': 0.5,
      '一': 1,
      '两': 2,
      '二': 2,
      '三': 3,
      '四': 4,
      '五': 5,
      '六': 6,
      '七': 7,
      '八': 8,
      '九': 9,
      '十': 10
    };

    const cnMatch = trimmed.match(/^([半一两二三四五六七八九十])\s*([a-zA-Z\u4e00-\u9fa5]+)$/);
    if (cnMatch) {
      const num = cnMap[cnMatch[1]];
      const unit = cnMatch[2];
      return `${num}${unit}`;
    }

    // 阿拉伯数字 + 单位 (如 200克, 50ml, 50g, 4块, 1条, 2勺, 3瓣, 40粒)
    const numMatch = trimmed.match(/^([0-9.]+)\s*([a-zA-Z\u4e00-\u9fa5]+)$/);
    if (numMatch) {
      return `${numMatch[1]}${numMatch[2]}`;
    }

    return null;
  }
}
