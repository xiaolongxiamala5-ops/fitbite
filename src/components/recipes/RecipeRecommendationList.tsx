import React, { useState, useMemo } from 'react';
import { MatchGroups, MatchResult } from '../../core/matcher/types';
import { RecipeCard } from './RecipeCard';
import { RecipeDetailModal } from './RecipeDetailModal';

interface RecipeRecommendationListProps {
  matchGroups: MatchGroups;
}

export const DEFAULT_RECIPE_DISPLAY_LIMIT = 3;

interface CollapsibleRecipeGridProps {
  list: MatchResult[];
  onSelect: (result: MatchResult) => void;
  initialLimit?: number;
}

export const CollapsibleRecipeGrid: React.FC<CollapsibleRecipeGridProps> = ({
  list,
  onSelect,
  initialLimit = DEFAULT_RECIPE_DISPLAY_LIMIT
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const hasMore = list.length > initialLimit;
  const visibleList = isExpanded ? list : list.slice(0, initialLimit);

  const handleToggle = () => {
    if (isExpanded) {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    setIsExpanded(prev => !prev);
  };

  return (
    <div ref={containerRef} className="collapsible-recipe-section">
      <div className="recipe-grid">
        {visibleList.map((item, index) => (
          <RecipeCard
            key={item.recipe.id}
            result={item}
            onSelect={() => onSelect(item)}
            className={index >= initialLimit ? 'recipe-card-animated' : ''}
          />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className="recipe-expand-btn"
          onClick={handleToggle}
        >
          <span>{isExpanded ? '收起' : `查看更多（${list.length - initialLimit}）`}</span>
          <span className={`recipe-expand-icon ${isExpanded ? 'expanded' : ''}`}>
            ▾
          </span>
        </button>
      )}
    </div>
  );
};

export const RecipeRecommendationList: React.FC<RecipeRecommendationListProps> = ({ matchGroups }) => {
  const [selectedResult, setSelectedResult] = useState<MatchResult | null>(null);

  // 统一聚合所有结果，并严格按“主食材决定可做性”进行重组
  const { availableNow, oneStepAway, otherList } = useMemo(() => {
    const map = new Map<string, MatchResult>();
    [
      ...matchGroups.favoritedCanMake,
      ...matchGroups.canMakeNow,
      ...matchGroups.missingOneOrTwo,
      ...matchGroups.other
    ].forEach(item => {
      map.set(item.recipe.id, item);
    });

    const all = Array.from(map.values());

    // 核心护栏 1：主食材缺失为 0 时即为“现在就能做”，调料不参与阻断
    const ready = all
      .filter(item => item.missingIngredients.length === 0)
      .sort((a, b) => (b.isFavorited ? 1 : 0) - (a.isFavorited ? 1 : 0));

    // 主食材缺 1~2 样即为“就差一步”，调料不阻止
    const stepAway = all
      .filter(item => item.missingIngredients.length === 1 || item.missingIngredients.length === 2)
      .sort((a, b) => a.missingIngredients.length - b.missingIngredients.length);

    // 主食材缺失 > 2 样归入其他
    const others = all.filter(item => item.missingIngredients.length > 2);

    return {
      availableNow: ready,
      oneStepAway: stepAway,
      otherList: others
    };
  }, [matchGroups]);

  const renderSection = (enTitle: string, cnSubtitle: string, list: MatchResult[], badgeColor: string) => {
    if (list.length === 0) return null;
    return (
      <div className="recipe-section">
        <div className="recipe-section-heading">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <h3>{enTitle}</h3>
            <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--ios-forest)', fontFamily: 'var(--font-chinese-title)' }}>
              {cnSubtitle}
            </span>
          </div>
          <span className="recipe-count" style={{ backgroundColor: badgeColor }}>
            {list.length}
          </span>
        </div>
        <CollapsibleRecipeGrid
          list={list}
          onSelect={setSelectedResult}
        />
      </div>
    );
  };

  const totalActionable = availableNow.length + oneStepAway.length;

  return (
    <div className="recommendation-list">
      {renderSection('Available Now', '现在就能做', availableNow, '#2f765b')}
      {renderSection('One Step Away', '就差一步', oneStepAway, '#c97850')}

      {totalActionable === 0 && (
        <div className="empty-recipes">
          目前还没有满足条件的菜谱，在上方输入或勾选更多食材试一试。
        </div>
      )}

      {otherList.length > 0 && (
        <details className="other-recipes">
          <summary>查看其他暂不满足的菜谱 ({otherList.length})</summary>
          <div style={{ marginTop: '12px' }}>
            <CollapsibleRecipeGrid
              list={otherList}
              onSelect={setSelectedResult}
            />
          </div>
        </details>
      )}

      <RecipeDetailModal
        recipe={selectedResult?.recipe || null}
        matchResult={selectedResult}
        onClose={() => setSelectedResult(null)}
      />
    </div>
  );
};