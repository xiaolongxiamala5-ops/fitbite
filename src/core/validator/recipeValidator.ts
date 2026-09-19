import { Recipe } from '../../data/recipes';
import { CANONICAL_MAP } from '../ingredients/canonical';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateRecipe(recipe: Recipe): ValidationResult {
  const errors: string[] = [];

  if (!recipe.id || typeof recipe.id !== 'string') {
    errors.push('菜谱 ID 不能为空且必须为字符串');
  }

  if (!recipe.name || typeof recipe.name !== 'string') {
    errors.push('菜谱名称不能为空');
  }

  if (typeof recipe.calories !== 'number' || recipe.calories < 0) {
    errors.push('卡路里必须为大于或等于 0 的数值');
  }

  if (!recipe.instructions || !Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
    errors.push('步骤说明不能为空');
  }

  if (!recipe.requiredIngredients || !Array.isArray(recipe.requiredIngredients) || recipe.requiredIngredients.length === 0) {
    errors.push('必需食材列表不能为空');
  } else {
    recipe.requiredIngredients.forEach((item, index) => {
      if (!CANONICAL_MAP.has(item.id)) {
        errors.push(`第 ${index + 1} 项食材使用了非法的规范 ID: ${item.id}`);
      }
      if (typeof item.amount !== 'number' || item.amount <= 0) {
        errors.push(`食材 ${item.name} 的用量必须为正数`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}