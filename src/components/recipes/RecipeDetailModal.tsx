import React from 'react';
import { Recipe } from '../../data/recipes';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  onClose: () => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({ recipe, onClose }) => {
  if (!recipe) return null;

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

        <div style={{ display: 'flex', gap: '16px', color: '#6b7280', fontSize: '13px', marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
          <span>🔥 热量: <strong>{recipe.calories} kcal</strong></span>
          <span>🥩 蛋白: {recipe.nutrition.protein}g</span>
          <span>🥑 脂肪: {recipe.nutrition.fat}g</span>
          <span>🍚 碳水: {recipe.nutrition.carbs}g</span>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#374151' }}>食材清单</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#4b5563' }}>
            {recipe.requiredIngredients.map(item => (
              <li key={item.id} style={{ marginBottom: '4px' }}>
                {item.name}: {item.amount} {item.unit}
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