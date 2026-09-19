import React, { useState } from 'react';
import { getRecipeImage, RecipeLike } from '../../ui/recipeImages';

interface RecipeImageProps {
  recipe: RecipeLike;
  className?: string;
}

/**
 * 独立的 RecipeImage 表现层组件
 * 核心原则：只有存在真实菜谱图片 (local / remote) 且未加载失败时才渲染图片。
 * 当为 fallback 时，不渲染大尺寸占位图，卡片自动切换为精致无图布局。
 */
export const RecipeImage: React.FC<RecipeImageProps> = ({ recipe, className = '' }) => {
  const imageInfo = getRecipeImage(recipe);
  const [hasError, setHasError] = useState(false);

  if (!imageInfo.hasRealImage || hasError) {
    return null;
  }

  return (
    <div className={`recipe-image-wrap ${className}`} aria-hidden="true">
      <img
        src={imageInfo.src}
        alt={imageInfo.alt}
        className="recipe-image-cover"
        loading="lazy"
        onError={() => setHasError(true)}
      />
      {/* 暖调生活光影过渡蒙层 */}
      <div className="recipe-image-vignette" />
    </div>
  );
};
