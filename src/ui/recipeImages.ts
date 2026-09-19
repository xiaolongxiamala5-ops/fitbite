/**
 * FitBite Recipe Image Resolver (菜谱图片解析层)
 *
 * 纯表现层图片解析器，严格遵循：
 * 1. 纯同步、零外部 API 调用
 * 2. 优先级解析链：本地精品图 (Local) -> 已配置远程 URL (Remote) -> 统一暖色餐桌光影 (Fallback)
 * 3. 未来 TheMealDB / Spoonacular 动态抓取将在单独 Provider 层处理，Resolver 继续保证无缝降级
 */

export interface RecipeImageInfo {
  src: string;
  alt: string;
  sourceType: 'local' | 'remote' | 'fallback';
  hasRealImage: boolean;
}

export type RecipeLike = {
  id: string;
  name?: string;
};

// 统一高质量暖色厨房/餐桌光影兜底图 (技术兜底，不作为真实菜品展示)
export const FALLBACK_RECIPE_IMAGE = '/images/kitchen-bg.png';

/**
 * 优先级 A: 本地精品图片注册表
 * 未来准备好本地图片 (例如 public/images/recipes/) 即可在此注册
 */
export const LOCAL_RECIPE_IMAGE_REGISTRY: Record<string, string> = {
  // 示例:
  // curated_tomato_scrambled_eggs: '/images/recipes/tomato_scrambled_eggs.webp',
};

/**
 * 优先级 B: 已配置的远程图片 URL 注册表
 * 未来由外部 service 写入或静态配置的 CDN / AI 生成图片链接
 */
export const REMOTE_RECIPE_IMAGE_REGISTRY: Record<string, string> = {
  // 示例:
  // curated_broccoli_chicken: 'https://images.unsplash.com/...',
};

/**
 * 统一同步图片解析入口
 * RecipeCard 及其他展示组件只需调用此方法
 */
export function getRecipeImage(recipe: RecipeLike): RecipeImageInfo {
  const id = recipe.id;
  const name = recipe.name || '家常菜';

  // 1. 本地精品图片
  if (LOCAL_RECIPE_IMAGE_REGISTRY[id]) {
    return {
      src: LOCAL_RECIPE_IMAGE_REGISTRY[id],
      alt: name,
      sourceType: 'local',
      hasRealImage: true
    };
  }

  // 2. 已配置远程图片 URL
  if (REMOTE_RECIPE_IMAGE_REGISTRY[id]) {
    return {
      src: REMOTE_RECIPE_IMAGE_REGISTRY[id],
      alt: name,
      sourceType: 'remote',
      hasRealImage: true
    };
  }

  // 3. 统一暖色厨房/餐桌光影占位 (技术兜底)
  return {
    src: FALLBACK_RECIPE_IMAGE,
    alt: name,
    sourceType: 'fallback',
    hasRealImage: false
  };
}
