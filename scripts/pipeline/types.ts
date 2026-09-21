/**
 * FitBite Recipe Import Pipeline Data Layer Types (C.1.1)
 *
 * Defines the 3 core layers:
 * 1. SourceRecipe (Raw provenance and facts)
 * 2. NormalizedRecipe (Intermediate curated model with alternatives support)
 * 3. FitBiteRecipe (Standard target schema for FitBite)
 */

export interface SourceRecipe {
  originalTitle: string;
  source: 'howtocook' | 'cookbook-kg';
  sourceId: string;
  sourceUrl: string;
  sourceFile: string;
  license: string | null;
  contentHash: string; // SHA-256 of raw source
  rawIngredients: string[];
  rawCalculations: string[];
  rawSteps: string[];
  rawDescription?: string;
  rawDifficulty?: string;
  rawEstimatedTimeText?: string;
}

export interface CanonicalOption {
  id: string; // Canonical ID (e.g. 'p_chicken_leg', 'p_chicken_breast')
  name: string; // Chinese display name (e.g. '鸡腿肉', '鸡胸肉')
  amount?: number; // 选项特定的明确数量（若源文未提供则为 undefined，严禁跨项继承）
  unit?: string; // 选项特定的明确单位（如 '支' 仅适用于手枪腿，不得借给鸡胸肉）
}

export interface NormalizedIngredient {
  canonicalId: string;
  displayName: string;
  category: 'protein' | 'vegetable' | 'carb' | 'other' | 'pantry';
  rawText: string;
  amount?: number;
  unit?: string;
  isPantry: boolean;
  mode?: 'single' | 'anyOf';
  alternatives?: CanonicalOption[];
}

export interface NormalizedRecipe {
  source: SourceRecipe;
  normalizedTitle: string;
  category: string;
  mainIngredients: NormalizedIngredient[];
  pantryIngredients: NormalizedIngredient[];
  unrecognizedItems: string[];
  cookingMethod: string | null;
  cuisine: string;
  tasteTags: string[];
  tags: string[];
  difficulty: string | null;
  rawDifficulty?: string | null;
  servings: number | null;
  estimatedMinutes: number | null;
}

export interface RecipeProvenance {
  source: 'howtocook' | 'cookbook-kg';
  sourceId: string;
  sourceUrl: string;
  sourceFile: string;
  license: string | null;
  contentHash: string;
}

export interface FitBiteIngredientItem {
  id: string; // Primary Canonical ID (e.g. 'p_chicken_leg')
  name: string; // Primary Chinese display name (e.g. '鸡腿肉')
  amount?: number;
  unit?: string;
  originalRawText: string;
  mode?: 'single' | 'anyOf';
  alternatives?: CanonicalOption[]; // 包含所有允许二选一的规范食材选项
}

export interface FitBitePantryItem {
  id: string; // Pantry ID (e.g. 'pantry_oil')
  name: string; // Pantry Chinese name (e.g. '食用油')
  amount?: number;
  unit?: string;
  originalRawText?: string;
}

import type { RecipeNutrition } from '../../shared/nutrition/types';

export interface FitBiteRecipe {
  id: string;
  name: string;
  category: string;
  provenance: RecipeProvenance;
  requiredIngredients: FitBiteIngredientItem[];
  pantryIngredients: Array<string | FitBitePantryItem>; // array of pantry IDs or quantified pantry items
  instructions: string[];
  tags: string[];
  cookingMethod: string | null;
  nutrition: RecipeNutrition | null; // Calculated by nutrition engine via deterministic/calibrated dual-track
  servings: number | null;
  difficulty: string | null; // 映射等级：简单 / 中等 / 困难
  rawDifficulty?: string | null; // 原始难度值：如 "★★"
  estimatedMinutes: number | null; // 仅在源文存在明确“预计耗时/总耗时/制作时间”字段时解析，否则为 null
}
