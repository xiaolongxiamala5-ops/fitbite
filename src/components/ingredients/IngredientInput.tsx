import React, { useState, useMemo } from 'react';
import { resolveAlias } from '../../core/ingredients/aliasResolver';
import { findDisambiguation, DisambiguationPill } from '../../core/ingredients/taxonomy';
import { useFridge } from '../../context/FridgeContext';

export const IngredientInput: React.FC = () => {
  const [text, setText] = useState('');
  const [tip, setTip] = useState<string | null>(null);
  const { addIngredient } = useFridge();

  // 侦测是否触发泛称消歧字典
  const disambiguation = useMemo(() => findDisambiguation(text), [text]);

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

  const handleSelectPill = (pill: DisambiguationPill) => {
    const resolved = resolveAlias(pill.name) || resolveAlias(pill.canonicalId);
    if (resolved) {
      addIngredient(resolved);
      setText('');
      setTip(null);
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

      {/* 泛称消歧胶囊滑出栏 (0.18s 平滑过渡) */}
      {disambiguation && (
        <div className="disambiguation-container">
          <div className="disambiguation-title">💡 种类较多，您家里的具体是：</div>
          <div className="disambiguation-pills">
            {disambiguation.disambiguationPills.map(pill => (
              <button
                key={`${pill.canonicalId}-${pill.name}`}
                type="button"
                className="disambiguation-pill"
                onClick={() => handleSelectPill(pill)}
              >
                {pill.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {tip && (
        <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>
          {tip}
        </div>
      )}
    </div>
  );
};