import crypto from 'crypto';
import { SourceRecipe } from './types';

/**
 * RecipeParser (C.1.1)
 *
 * Parses raw HowToCook markdown into a factual, lossless SourceRecipe object.
 * Computes SHA-256 content hash and captures original sections without hallucination.
 */
export class RecipeParser {
  public static parse(
    markdown: string,
    meta: { sourceId: string; sourceUrl: string; sourceFile: string }
  ): SourceRecipe {
    const contentHash = crypto.createHash('sha256').update(markdown, 'utf-8').digest('hex');
    const lines = markdown.split(/\r?\n/);

    let originalTitle = '';
    let rawDescription = '';
    let rawDifficulty = '';
    let rawEstimatedTimeText = '';
    const rawIngredients: string[] = [];
    const rawCalculations: string[] = [];
    const rawSteps: string[] = [];

    let currentSection: 'header' | 'ingredients' | 'calculations' | 'steps' | 'other' = 'header';
    let isSubOptional = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // 提取标题 (# ...)
      if (line.startsWith('# ') && !originalTitle) {
        originalTitle = line.replace(/^#\s*/, '').trim();
        continue;
      }

      // 提取明确的整道菜总耗时字段（如：“预计耗时：30 分钟”或“总耗时：1 小时”）
      if (line.includes('预计耗时') || line.includes('总耗时') || line.includes('烹饪时间') || line.includes('制作时间')) {
        const timeMatch = line.match(/(?:预计耗时|总耗时|烹饪时间|制作时间)[：:]\s*([0-9.]+)?\s*(分钟|小时)/);
        if (timeMatch) {
          rawEstimatedTimeText = line;
        }
      }

      // 判断节标题
      if (line.startsWith('## ')) {
        isSubOptional = false;
        const headerText = line.replace(/^##\s*/, '').trim();
        if (headerText.includes('原料') || headerText.includes('工具') || headerText.includes('食材')) {
          currentSection = 'ingredients';
        } else if (headerText.includes('计算') || headerText.includes('用量') || headerText.includes('配比')) {
          currentSection = 'calculations';
        } else if (headerText.includes('操作') || headerText.includes('步骤') || headerText.includes('做法')) {
          currentSection = 'steps';
        } else {
          currentSection = 'other';
        }
        continue;
      }

      // 子标题：如 "### 可选原料"、"### 选配食材"
      if (line.startsWith('### ')) {
        const subHeaderText = line.replace(/^###\s*/, '').trim();
        if (subHeaderText.includes('可选') || subHeaderText.includes('选配') || subHeaderText.includes('附加')) {
          isSubOptional = true;
        } else {
          isSubOptional = false;
        }
        continue;
      }

      // 提取预估难度
      if (line.includes('预估烹饪难度：') || line.includes('难度：')) {
        const diffMatch = line.match(/(★+)/);
        if (diffMatch) {
          rawDifficulty = diffMatch[1];
        }
        continue;
      }

      // 收集章节内容
      if (currentSection === 'header') {
        // 如果不是图片行，也不是预估难度/卡路里行，则作为简介
        if (!line.startsWith('![') && !line.startsWith('预估')) {
          rawDescription += (rawDescription ? ' ' : '') + line;
        }
      } else if (currentSection === 'ingredients') {
        if (line.startsWith('- ') || line.startsWith('* ')) {
          let item = line.replace(/^[-*]\s*/, '').trim();
          if (isSubOptional && !item.includes('可选')) {
            item += '（可选）';
          }
          rawIngredients.push(item);
        }
      } else if (currentSection === 'calculations') {
        if (line.startsWith('- ') || line.startsWith('* ')) {
          rawCalculations.push(line.replace(/^[-*]\s*/, '').trim());
        }
      } else if (currentSection === 'steps') {
        // 过滤纯 markdown 图片行
        if (line.startsWith('![')) {
          continue;
        }

        // 匹配主步骤，如 "1. " 或 "12. "
        const stepMatch = line.match(/^(\d+)[\.、\s]\s*(.*)$/);
        if (stepMatch) {
          const stepText = stepMatch[2].trim();
          // 过滤形如 "4. ![改刀](./改刀.jpg)" 的纯图片行
          if (stepText && !stepText.startsWith('![')) {
            rawSteps.push(stepText);
          }
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          // 子步骤：附加到上一步
          if (rawSteps.length > 0) {
            const lastIdx = rawSteps.length - 1;
            rawSteps[lastIdx] = `${rawSteps[lastIdx]}（${line.replace(/^[-*]\s*/, '').trim()}）`;
          }
        }
      }
    }

    return {
      originalTitle: originalTitle || meta.sourceId,
      source: 'howtocook',
      sourceId: meta.sourceId,
      sourceUrl: meta.sourceUrl,
      sourceFile: meta.sourceFile,
      license: 'CC-BY-4.0',
      contentHash,
      rawIngredients,
      rawCalculations,
      rawSteps,
      rawDescription: rawDescription.trim() || undefined,
      rawDifficulty: rawDifficulty || undefined,
      rawEstimatedTimeText: rawEstimatedTimeText || undefined
    };
  }
}
