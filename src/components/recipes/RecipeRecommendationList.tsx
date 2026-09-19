import React, { useState } from 'react';
import { MatchGroups, MatchResult } from '../../core/matcher/types';
import { RecipeCard } from './RecipeCard';
import { RecipeDetailModal } from './RecipeDetailModal';
import { Recipe } from '../../data/recipes';

interface RecipeRecommendationListProps {
  matchGroups: MatchGroups;
}

export const RecipeRecommendationList: React.FC<RecipeRecommendationListProps> = ({ matchGroups }) => {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const { favoritedCanMake, canMakeNow, missingOneOrTwo, other } = matchGroups;

  const renderSection = (title: string, list: MatchResult[], badgeColor: string) => {
    if (list.length === 0) return null;
    return (
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', color: '#1f2937' }}>{title}</h3>
          <span style={{ backgroundColor: badgeColor, color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
            {list.length}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {list.map(item => (
            <RecipeCard key={item.recipe.id} result={item} onSelect={() => setSelectedRecipe(item.recipe)} />
          ))}
        </div>
      </div>
    );
  };

  const totalActionable = favoritedCanMake.length + canMakeNow.length + missingOneOrTwo.length;

  return (
    <div>
      {renderSection('⭐ 你收藏过，而且现在能做', favoritedCanMake, '#ef4444')}
      {renderSection('🥗 你现在能做', canMakeNow, '#10b981')}
      {renderSection('🛒 只差 1–2 样食材', missingOneOrTwo, '#f59e0b')}

      {totalActionable === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: '14px' }}>
          目前还没有满足条件的菜谱，在上方输入或勾选更多食材试一试。
        </div>
      )}

      {other.length > 0 && (
        <details style={{ marginTop: '16px', color: '#9ca3af', fontSize: '12px' }}>
          <summary style={{ cursor: 'pointer' }}>查看其他暂不满足的菜谱 ({other.length})</summary>
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {other.map(item => (
                <RecipeCard key={item.recipe.id} result={item} onSelect={() => setSelectedRecipe(item.recipe)} />
              ))}
            </div>
          </div>
        </details>
      )}

      <RecipeDetailModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
    </div>
  );
};