import { CANONICAL_INGREDIENTS, CanonicalIngredient, CANONICAL_MAP } from './canonical';

const ALIAS_MAP: Record<string, string> = {
  '大虾': 'p_shrimp',
  '虾': 'p_shrimp',
  '虾仁': 'p_shrimp',
  '基围虾': 'p_shrimp',
  '草虾': 'p_shrimp',
  '鲜虾': 'p_shrimp',
  
  '嫩豆腐': 'p_tofu_soft',
  '豆腐': 'p_tofu_soft',
  '南豆腐': 'p_tofu_soft',
  '内酯豆腐': 'p_tofu_soft',
  
  '番茄': 'v_tomato',
  '西红柿': 'v_tomato',
  
  '鸡胸': 'p_chicken_breast',
  '鸡胸肉': 'p_chicken_breast',
  
  '西兰花': 'v_broccoli',
  '绿花菜': 'v_broccoli',
  
  '鸡蛋': 'p_egg',
  '笨鸡蛋': 'p_egg',
  '蛋': 'p_egg',
  
  '牛肉': 'p_beef',
  '牛里脊': 'p_beef',
  '肥牛': 'p_beef',
  
  '洋葱': 'v_onion',
  '圆葱': 'v_onion'
};

export function resolveAlias(rawInput: string): CanonicalIngredient | null {
  if (!rawInput) return null;
  const cleaned = rawInput.trim();
  
  const directMatch = CANONICAL_INGREDIENTS.find(item => item.name === cleaned);
  if (directMatch) return directMatch;
  
  const canonicalId = ALIAS_MAP[cleaned];
  if (canonicalId && CANONICAL_MAP.has(canonicalId)) {
    return CANONICAL_MAP.get(canonicalId)!;
  }
  
  return null;
}