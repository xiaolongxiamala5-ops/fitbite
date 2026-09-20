import { FitBiteRecipe } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * FitBite Recipe Validator (C.1.1)
 *
 * Enforces provenance completeness, canonical ingredient integrity, step validity,
 * and safety guardrails (preventing hallucinated nutrition data).
 */
export class RecipeValidator {
  public static validate(recipe: FitBiteRecipe): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. 基础标识验证
    if (!recipe.id || (!recipe.id.startsWith('imported_howtocook_') && !recipe.id.startsWith('imported_cookbook-kg_'))) {
      errors.push(`菜谱 ID 格式非法或缺失: ${recipe.id}`);
    }
    if (!recipe.name || recipe.name.trim().length === 0) {
      errors.push(`菜谱名称缺失`);
    }

    // 2. Provenance 出处校验
    const prov = recipe.provenance;
    if (!prov) {
      errors.push('完全缺失 provenance 出处信息');
    } else {
      if (prov.source === 'howtocook') {
        if (!prov.sourceFile || !prov.sourceFile.endsWith('.md')) {
          errors.push(`非法 sourceFile: ${prov.sourceFile}`);
        }
        if (prov.license !== 'CC-BY-4.0') {
          errors.push(`许可证必须为 CC-BY-4.0，当前为: ${prov.license}`);
        }
      } else if (prov.source === 'cookbook-kg') {
        if (!prov.sourceFile || !prov.sourceFile.endsWith('.json')) {
          errors.push(`非法 sourceFile: ${prov.sourceFile}`);
        }
        if (prov.license !== 'unknown' && prov.license !== null) {
          errors.push(`CookBook-KG 来源无明确许可证，license 必须为 'unknown' 或 null，当前为: ${prov.license}`);
        }
      } else {
        errors.push(`非法来源: ${prov.source}`);
      }
      if (!prov.sourceId || prov.sourceId.trim().length === 0) {
        errors.push('缺失 sourceId');
      }
      if (!prov.sourceUrl || !prov.sourceUrl.startsWith('https://')) {
        errors.push(`非法 sourceUrl: ${prov.sourceUrl}`);
      }
      if (!prov.contentHash || !/^[a-f0-9]{64}$/i.test(prov.contentHash)) {
        errors.push(`contentHash 非法，必须为标准的 64 位 SHA-256 哈希`);
      }
    }

    // 3. 食材完整性校验
    if (!Array.isArray(recipe.requiredIngredients) || recipe.requiredIngredients.length === 0) {
      errors.push('必须包含至少 1 项主要食材 (requiredIngredients)');
    } else {
      recipe.requiredIngredients.forEach((ing, idx) => {
        if (!ing.id || !/^(p_|v_|c_|other_)/.test(ing.id)) {
          errors.push(`第 ${idx + 1} 项食材缺少规范的 Canonical ID: ${ing.id}`);
        }
        if (!ing.name || ing.name.trim().length === 0) {
          errors.push(`第 ${idx + 1} 项食材显示名称为空`);
        }
      });
    }

    // 4. 制作步骤校验
    if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
      errors.push('必须包含至少 1 个制作步骤 (instructions)');
    } else {
      if (recipe.instructions.some(s => !s || s.trim().length === 0)) {
        errors.push('存在空步骤文本');
      }
    }

    // 5. 严格安全护栏：营养事实绝不可胡乱生成
    if (recipe.nutrition !== null) {
      errors.push('违背数据护栏：LLM/Pipeline 禁止猜测或编造 nutrition 事实，当前阶段必须严格保持为 null');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
