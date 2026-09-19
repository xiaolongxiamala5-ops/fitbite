import type { IngredientAmount, RecipeNutrition } from './recipes/types';

export type { IngredientAmount, RecipeNutrition } from './recipes/types';

export interface Recipe {
  id: string;
  name: string;
  requiredIngredients: IngredientAmount[];
  pantryIngredients: string[];
  calories: number;
  nutrition: RecipeNutrition;
  servings: number;
  source: string;
  instructions: string[];
}

export const CURATED_RECIPES: Recipe[] = [
  {
    id: 'curated_tomato_shrimp_tofu',
    name: '番茄鲜虾豆腐煲',
    requiredIngredients: [
      { id: 'p_shrimp', name: '大虾', amount: 150, unit: 'g' },
      { id: 'p_tofu_soft', name: '嫩豆腐', amount: 200, unit: 'g' },
      { id: 'v_tomato', name: '番茄', amount: 150, unit: 'g' }
    ],
    pantryIngredients: ['pantry_garlic', 'pantry_soy_sauce', 'pantry_black_pepper', 'pantry_oil'],
    calories: 285,
    nutrition: { protein: 32, fat: 8, carbs: 14 },
    servings: 1,
    source: 'FitBite Curated',
    instructions: [
      '大虾去壳开背去虾线，加少许黑胡椒腌制 5 分钟。',
      '热锅下油，爆香蒜末，倒入切块番茄炒出浓汁。',
      '加入适量温水，下入嫩豆腐块炖煮 3 分钟。',
      '放入大虾煮至完全变色卷曲，淋入生抽拌匀出锅。'
    ]
  },
  {
    id: 'curated_broccoli_chicken',
    name: '西兰花清炒鸡胸肉',
    requiredIngredients: [
      { id: 'p_chicken_breast', name: '鸡胸肉', amount: 200, unit: 'g' },
      { id: 'v_broccoli', name: '西兰花', amount: 150, unit: 'g' }
    ],
    pantryIngredients: ['pantry_garlic', 'pantry_soy_sauce', 'pantry_oil', 'pantry_salt'],
    calories: 310,
    nutrition: { protein: 46, fat: 7, carbs: 12 },
    servings: 1,
    source: 'FitBite Curated',
    instructions: [
      '鸡胸肉切丁，生抽腌制 10 分钟；西兰花切小朵焯水 40 秒捞出。',
      '热锅放油，下蒜末和鸡丁中火翻炒至表面变白。',
      '倒入焯水后的西兰花，加入适量食盐，大火翻炒 1 分钟即可。'
    ]
  },
  {
    id: 'curated_tomato_scrambled_eggs',
    name: '经典番茄炒蛋',
    requiredIngredients: [
      { id: 'p_egg', name: '鸡蛋', amount: 2, unit: '枚' },
      { id: 'v_tomato', name: '番茄', amount: 200, unit: 'g' }
    ],
    pantryIngredients: ['pantry_salt', 'pantry_oil'],
    calories: 260,
    nutrition: { protein: 14, fat: 18, carbs: 10 },
    servings: 1,
    source: 'FitBite Curated',
    instructions: [
      '鸡蛋打散加少许盐；番茄洗净切小块备用。',
      '锅热倒油，倒入蛋液快速划散凝固后盛出。',
      '锅底留底油翻炒番茄出红油，倒回炒蛋加入食盐翻匀即可出锅。'
    ]
  },
  {
    id: 'curated_onion_beef',
    name: '洋葱黑椒炒牛肉',
    requiredIngredients: [
      { id: 'p_beef', name: '牛肉', amount: 150, unit: 'g' },
      { id: 'v_onion', name: '洋葱', amount: 100, unit: 'g' }
    ],
    pantryIngredients: ['pantry_soy_sauce', 'pantry_oil', 'pantry_black_pepper'],
    calories: 340,
    nutrition: { protein: 35, fat: 16, carbs: 11 },
    servings: 1,
    source: 'FitBite Curated',
    instructions: [
      '牛肉逆纹切薄片加生抽和黑胡椒抓匀；洋葱切丝。',
      '热锅下油大火滑炒牛肉片至八成熟盛出。',
      '锅内放入洋葱翻炒断生，倒回牛肉大火翻炒均匀即成。'
    ]
  }
];