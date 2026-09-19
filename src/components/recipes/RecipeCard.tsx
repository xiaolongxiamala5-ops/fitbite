import React from 'react';
import { MatchResult } from '../../core/matcher/types';
import { FavoriteButton } from './FavoriteButton';
import { useFridge } from '../../context/FridgeContext';

interface RecipeCardProps {
  result: MatchResult;
  onSelect: () => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ result, onSelect }) => {
  const { toggleFavorite } = useFridge();
  const { recipe, canMake, missingIngredients, isFavorited } = result;

  return (
    <div
      onClick={onSelect}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        padding: '16px',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'transform 0.1s ease',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#111827' }}>
            {recipe.name}
          </h3>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {recipe.calories} kcal | 蛋白质 {recipe.nutrition.protein}g
          </div>
        </div>
        <FavoriteButton isFavorited={isFavorited} onToggle={() => toggleFavorite(recipe.id)} />
      </div>

      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        {canMake ? (
          <span style={{ fontSize: '12px', color: '#059669', backgroundColor: '#d1fae5', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
            ✓ 即可制作
          </span>
        ) : (
          <span style={{ fontSize: '12px', color: '#d97706', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
            缺: {missingIngredients.map(i => i.name).join('、')}
          </span>
        )}
      </div>
    </div>
  );
};