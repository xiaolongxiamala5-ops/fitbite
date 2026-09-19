import React from 'react';
import { Recipe } from '../../data/recipes';
import { matchRecipes } from '../../core/matcher/matcher';
import { getPantryName } from '../../core/pantry/pantry';
import { useFridge } from '../../context/FridgeContext';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  onClose: () => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({ recipe, onClose }) => {
  const { fridgeIngredients, pantryIngredients, favorites } = useFridge();
  if (!recipe) return null;

  const matchGroups = matchRecipes({
    fridgeIngredients: fridgeIngredients.map(item => item.id),
    pantryIngredients,
    recipes: [recipe],
    favorites
  });
  const matchResult = [
    ...matchGroups.favoritedCanMake,
    ...matchGroups.canMakeNow,
    ...matchGroups.missingOneOrTwo,
    ...matchGroups.other
  ].find(result => result.recipe.id === recipe.id);
  const missingIngredientIds = new Set(matchResult?.missingIngredients.map(item => item.id));
  const missingPantryIds = new Set(matchResult?.missingPantry);
  const missingNames = [
    ...(matchResult?.missingIngredients.map(item => item.name) || []),
    ...(matchResult?.missingPantry.map(getPantryName) || [])
  ];
  const canMake = matchResult?.canMake ?? false;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '24px',
          boxSizing: 'border-box'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>{recipe.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <div style={{ marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
          <div style={{ color: canMake ? '#047857' : '#b45309', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>
            {canMake ? '✓ 现在能做' : '还不能做'}
          </div>
          {!canMake && missingNames.length > 0 && (
            <div style={{ color: '#92400e', fontSize: '12px', marginBottom: '8px' }}>
              还缺：{missingNames.join('、')}
            </div>
          )}
          <div style={{ color: '#6b7280', fontSize: '13px' }}>
            {recipe.nutrition.status === 'unverified'
              ? '营养数据待核验'
              : `🔥 热量: ${recipe.calories} kcal | 🥩 蛋白: ${recipe.nutrition.protein}g | 🥑 脂肪: ${recipe.nutrition.fat}g | 🍚 碳水: ${recipe.nutrition.carbs}g`}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#374151' }}>主要食材</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#4b5563' }}>
            {recipe.requiredIngredients.map(item => (
              <li key={item.id} style={{ marginBottom: '4px' }}>
                <span style={{ color: missingIngredientIds.has(item.id) ? '#b45309' : '#047857', fontWeight: 'bold' }}>
                  {missingIngredientIds.has(item.id) ? '缺少' : '已有'}
                </span>{' '}
                {item.name}: {item.amount} {item.unit}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#374151' }}>调料 / 常备食材</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#4b5563' }}>
            {recipe.pantryIngredients.map(id => (
              <li key={id} style={{ marginBottom: '4px' }}>
                <span style={{ color: missingPantryIds.has(id) ? '#b45309' : '#047857', fontWeight: 'bold' }}>
                  {missingPantryIds.has(id) ? '缺少' : '已有'}
                </span>{' '}
                {getPantryName(id)}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#374151' }}>烹饪步骤</h4>
          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#4b5563', lineHeight: '1.6' }}>
            {recipe.instructions.map((step, idx) => (
              <li key={idx} style={{ marginBottom: '6px' }}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};