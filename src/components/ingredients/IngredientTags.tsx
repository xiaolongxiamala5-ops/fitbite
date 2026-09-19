import React from 'react';
import { useFridge } from '../../context/FridgeContext';

export const IngredientTags: React.FC = () => {
  const { fridgeIngredients, removeIngredient, clearIngredients } = useFridge();

  if (fridgeIngredients.length === 0) {
    return (
      <div className="fridge-empty">
        冰箱目前还是空的，请在上方添加食材。
      </div>
    );
  }

  return (
    <div className="ingredient-tags">
      <div className="ingredient-tags-heading">
        <span>
          已放入食材 ({fridgeIngredients.length})
        </span>
        <button
          onClick={clearIngredients}
          className="text-button"
        >
          清空
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {fridgeIngredients.map(item => (
          <span
            key={item.id}
            className="ingredient-chip"
          >
            {item.name}
            <button
              onClick={() => removeIngredient(item.id)}
              className="chip-remove"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};