import React from 'react';
import { CANONICAL_INGREDIENTS } from '../core/ingredients/canonical';
import { PANTRY_ITEMS } from '../core/pantry/pantry';
import { useFridge } from '../context/FridgeContext';
import { useRecipeMatcher } from '../hooks/useRecipeMatcher';

export const DebugView: React.FC = () => {
  const { fridgeIngredients, addIngredient, removeIngredient, pantryIngredients, togglePantry } = useFridge();
  const matchGroups = useRecipeMatcher();

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto' }}>
      <h2>FitBite 核心验收控制台 (DebugView)</h2>
      <div style={{ background: '#eee', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
        <strong>快速勾选测试食材：</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
          {CANONICAL_INGREDIENTS.map(item => {
            const has = fridgeIngredients.some(i => i.id === item.id);
            return (
              <button
                key={item.id}
                onClick={() => has ? removeIngredient(item.id) : addIngredient(item)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: has ? '#10b981' : '#fff',
                  color: has ? '#fff' : '#000',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {item.name} {has ? '✓' : ''}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ background: '#eee', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
        <strong>常备调料开关：</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
          {PANTRY_ITEMS.map(item => {
            const has = pantryIngredients.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => togglePantry(item.id)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: has ? '#3b82f6' : '#fff',
                  color: has ? '#fff' : '#000',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {item.name} {has ? '✓' : ''}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #ddd', padding: '12px', borderRadius: '6px' }}>
        <h3>Matcher 输出分组：</h3>
        <div>[你收藏过，而且现在能做]: {matchGroups.favoritedCanMake.map(m => m.recipe.name).join(', ') || '无'}</div>
        <div>[你现在能做]: {matchGroups.canMakeNow.map(m => m.recipe.name).join(', ') || '无'}</div>
        <div>[只差 1–2 样食材]: {matchGroups.missingOneOrTwo.map(m => `${m.recipe.name}(缺${m.missingIngredients.map(i=>i.name).join('、')})`).join(', ') || '无'}</div>
        <div>[其他不可做]: {matchGroups.other.map(m => m.recipe.name).join(', ') || '无'}</div>
      </div>
    </div>
  );
};