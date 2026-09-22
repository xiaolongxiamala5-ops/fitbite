import React from 'react';
import { MatchResult } from '../../core/matcher/types';
import { FavoriteButton } from './FavoriteButton';
import { useFridge } from '../../context/FridgeContext';

interface RecipeCardProps {
  result: MatchResult;
  onSelect: () => void;
  className?: string;
}

/**
 * RecipeCard — 紧凑行版（Editorial Dense Row）
 * 高度锁定 50px，单行横向信息流，彻底去除封面图。
 * Props 签名与父级调用完全兼容，零破坏。
 */
export const RecipeCard: React.FC<RecipeCardProps> = ({ result, onSelect, className = '' }) => {
  const { toggleFavorite } = useFridge();
  const { recipe, missingIngredients, isFavorited } = result;

  // 核心护栏：统一使用"主食材决定可做性"规则，调料不阻断
  const isReady = missingIngredients.length === 0;

  return (
    <article
      onClick={onSelect}
      className={`recipe-card recipe-card-dense ${isReady ? 'recipe-card-ready' : 'recipe-card-away'} ${className}`.trim()}
    >
      {/* ── 左侧：菜名 + 微晶标签行 + 参数微文字 ── */}
      <div className="dense-card-left">
        {/* 第一行：菜名 + 状态/健康微晶标 */}
        <div className="dense-card-main-row">
          <span className="dense-card-name">{recipe.name}</span>

          {/* 状态微晶标 */}
          {isReady ? (
            <span className="dense-badge dense-badge-ready">✓ 可做</span>
          ) : (
            <span className="dense-badge dense-badge-missing">差 {missingIngredients.length} 样</span>
          )}

          {/* 健康分流微标（仅减脂优选展示，高能菜克制不打扰） */}
          {result.calorieTier === 'lean_choice' && (
            <span className="dense-badge dense-badge-lean">减脂优选</span>
          )}
        </div>

        {/* 第二行：参数微文字（kcal + 时间） */}
        <div className="dense-card-meta">
          {recipe.calories > 0 && (
            <span className="dense-meta-kcal">· 约 {recipe.calories} kcal</span>
          )}
          <span className="dense-meta-time">· ◷ 家常快手</span>
        </div>
      </div>

      {/* ── 右侧：收藏按钮 + 导向箭头 ── */}
      <div className="dense-card-right">
        <FavoriteButton isFavorited={isFavorited} onToggle={() => toggleFavorite(recipe.id)} />
        <span className="dense-card-chevron">›</span>
      </div>
    </article>
  );
};