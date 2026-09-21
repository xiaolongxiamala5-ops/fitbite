import React from 'react';
import { MatchResult } from '../../core/matcher/types';
import { FavoriteButton } from './FavoriteButton';
import { useFridge } from '../../context/FridgeContext';
import { RecipeImage } from './RecipeImage';
import { getRecipeImage } from '../../ui/recipeImages';

interface RecipeCardProps {
  result: MatchResult;
  onSelect: () => void;
  className?: string;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ result, onSelect, className = '' }) => {
  const { toggleFavorite } = useFridge();
  const { recipe, missingIngredients, isFavorited } = result;
  // 核心护栏 1：统一使用“主食材决定可做性”规则，调料不阻断
  const isReady = missingIngredients.length === 0;
  const cookingTime = '家常快手';

  // 只有存在真实图片 (local / remote) 时才显示图片区域，fallback 时采用精致无图布局
  const imageInfo = getRecipeImage(recipe);
  const hasRealImage = imageInfo.hasRealImage;

  return (
    <article
      onClick={onSelect}
      className={`recipe-card ${isReady ? 'recipe-card-ready' : 'recipe-card-away'} ${hasRealImage ? 'has-image' : 'no-image'} ${className}`.trim()}
    >
      {hasRealImage && <RecipeImage recipe={recipe} />}
      <div className="recipe-card-content">
        <div className="recipe-card-topline">
          <div>
            <h3>{recipe.name}</h3>
            <div className="recipe-time">◷ {cookingTime}</div>
          </div>
          <FavoriteButton isFavorited={isFavorited} onToggle={() => toggleFavorite(recipe.id)} />
        </div>

        <div className="recipe-status">
          {isReady ? (
            <span className="status-badge">✓ 现在能做</span>
          ) : (
            <span className="status-badge">差 {missingIngredients.length} 样主食材</span>
          )}
          {result.calorieTier === 'lean_choice' && (
            <span className="health-badge-lean">减脂优选</span>
          )}
          {result.calorieTier === 'cheat_or_share' && (
            <span className="health-badge-warning">建议分食 / 高能量</span>
          )}
        </div>
      </div>
      <div className="recipe-card-arrow">↗</div>
    </article>
  );
};