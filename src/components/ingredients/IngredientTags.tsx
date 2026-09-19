import React from 'react';
import { useFridge } from '../../context/FridgeContext';

export const IngredientTags: React.FC = () => {
  const { fridgeIngredients, removeIngredient, clearIngredients } = useFridge();

  if (fridgeIngredients.length === 0) {
    return (
      <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px' }}>
        冰箱目前还是空的，请在上方添加食材。
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#4b5563' }}>
          已放入食材 ({fridgeIngredients.length})
        </span>
        <button
          onClick={clearIngredients}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          清空
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {fridgeIngredients.map(item => (
          <span
            key={item.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              padding: '4px 10px',
              borderRadius: '16px',
              fontSize: '13px'
            }}
          >
            {item.name}
            <button
              onClick={() => removeIngredient(item.id)}
              style={{
                marginLeft: '6px',
                background: 'none',
                border: 'none',
                color: '#0369a1',
                cursor: 'pointer',
                fontWeight: 'bold',
                padding: 0
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};