import React, { useState } from 'react';
import { resolveAlias } from '../../core/ingredients/aliasResolver';
import { useFridge } from '../../context/FridgeContext';

export const IngredientInput: React.FC = () => {
  const [text, setText] = useState('');
  const [tip, setTip] = useState<string | null>(null);
  const { addIngredient } = useFridge();

  const handleAdd = () => {
    if (!text.trim()) return;
    const resolved = resolveAlias(text);
    if (resolved) {
      addIngredient(resolved);
      setText('');
      setTip(null);
    } else {
      setTip(`暂未收录食材 "${text}"，试着输入“大虾”、“豆腐”、“西红柿”`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入冰箱里的食材，如：虾仁、西红柿、鸡蛋..."
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: '14px',
            borderRadius: '8px',
            border: '1px solid #dcdfe6',
            outline: 'none'
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            padding: '10px 18px',
            backgroundColor: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          加入冰箱
        </button>
      </div>
      {tip && (
        <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>
          {tip}
        </div>
      )}
    </div>
  );
};