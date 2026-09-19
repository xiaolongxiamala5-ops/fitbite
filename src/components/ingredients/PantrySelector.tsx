import React, { useState } from 'react';
import { PANTRY_ITEMS } from '../../core/pantry/pantry';
import { useFridge } from '../../context/FridgeContext';

export const PantrySelector: React.FC = () => {
  const { pantryIngredients, togglePantry, pantryCatalogIds, addPantryItem } = useFridge();
  const [isAdding, setIsAdding] = useState(false);
  const [query, setQuery] = useState('');
  const visibleItems = PANTRY_ITEMS.filter(item => pantryCatalogIds.includes(item.id));
  const availableItems = PANTRY_ITEMS.filter(item => {
    return !pantryCatalogIds.includes(item.id) && item.name.includes(query.trim());
  });

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>我的常用调料</div>
        <button
          type="button"
          onClick={() => setIsAdding(prev => !prev)}
          style={{ border: 'none', background: 'none', color: '#047857', cursor: 'pointer', fontSize: '12px', padding: 0 }}
        >
          ＋ 添加调料
        </button>
      </div>
      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>勾选当前家里已有的调料；添加目录项不会自动标记为已有。</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {visibleItems.map(item => {
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
      {isAdding && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="搜索调料目录"
            aria-label="搜索调料目录"
            style={{ width: '100%', padding: '7px 9px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', marginBottom: '8px' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {availableItems.map(item => (
              <button
                type="button"
                key={item.id}
                onClick={() => addPantryItem(item.id)}
                style={{ padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#f9fafb', color: '#374151', cursor: 'pointer', fontSize: '12px' }}
              >
                ＋ {item.name}
              </button>
            ))}
            {availableItems.length === 0 && <span style={{ color: '#9ca3af', fontSize: '12px' }}>没有匹配的可添加调料</span>}
          </div>
        </div>
      )}
    </div>
  );
};