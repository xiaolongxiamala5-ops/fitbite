import React from 'react';
import { PANTRY_ITEMS } from '../../core/pantry/pantry';
import { useFridge } from '../../context/FridgeContext';

export const PantrySelector: React.FC = () => {
  const { pantryIngredients, togglePantry } = useFridge();

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>
        常备调料（勾选厨房已有项）：
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {PANTRY_ITEMS.map(item => {
          const checked = pantryIngredients.includes(item.id);
          return (
            <label key={item.id} style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px', color: '#4b5563' }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => togglePantry(item.id)}
                style={{ marginRight: '6px' }}
              />
              {item.name}
            </label>
          );
        })}
      </div>
    </div>
  );
};