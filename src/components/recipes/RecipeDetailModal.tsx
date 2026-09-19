import React from 'react';
import { Recipe } from '../../data/recipes';
import { MatchResult } from '../../core/matcher/types';
import { PANTRY_ITEMS } from '../../core/pantry/pantry';
import { useFridge } from '../../context/FridgeContext';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  matchResult?: MatchResult | null;
  onClose: () => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  matchResult,
  onClose
}) => {
  const { fridgeIngredients, pantryIngredients } = useFridge();

  if (!recipe) return null;

  const userFridgeSet = new Set(fridgeIngredients.map(i => i.id));
  const userPantrySet = new Set(pantryIngredients);

  // 核心护栏 1：所有用户可见“可做状态”必须严格统一遵循“主食材决定可做性”
  const missingMainCount = matchResult
    ? matchResult.missingIngredients.length
    : recipe.requiredIngredients.filter(i => !userFridgeSet.has(i.id)).length;

  const isReadyToCook = missingMainCount === 0;

  return (
    <div className="recipe-modal-overlay" onClick={onClose}>
      <div className="recipe-modal-sheet" onClick={e => e.stopPropagation()}>
        {/* iOS 顶部下拉感指示条 */}
        <div className="recipe-modal-drag-handle" />

        {/* 标题栏 */}
        <div className="recipe-modal-header">
          <div>
            <h2 className="recipe-modal-title">{recipe.name}</h2>
            <div style={{ fontSize: '12px', color: 'var(--ios-forest-light)', marginTop: '4px', fontWeight: 500 }}>
              {recipe.source || 'FitBite 家常厨房灵感'}
            </div>
          </div>
          <button
            type="button"
            className="recipe-modal-close"
            onClick={onClose}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* 核心可做状态提示 (严格统一主食材判断) */}
        <div className="recipe-modal-readiness">
          {isReadyToCook ? (
            <span className="status-badge" style={{ fontSize: '12px', padding: '5px 12px' }}>
              ✓ 主食材已备齐 · 现在就能做
            </span>
          ) : (
            <span className="status-badge" style={{ fontSize: '12px', padding: '5px 12px' }}>
              差 {missingMainCount} 样主食材
            </span>
          )}
        </div>

        {/* 营养参考标签 */}
        <div className="recipe-modal-nutrition">
          <span className="nutrition-pill">🔥 <strong>{recipe.calories}</strong> kcal</span>
          <span className="nutrition-pill">🥩 蛋白 <strong>{recipe.nutrition.protein}g</strong></span>
          <span className="nutrition-pill">🥑 脂肪 <strong>{recipe.nutrition.fat}g</strong></span>
          <span className="nutrition-pill">🍚 碳水 <strong>{recipe.nutrition.carbs}g</strong></span>
        </div>

        {/* 一、主食材清单 */}
        <div className="recipe-modal-section">
          <div className="recipe-modal-section-title">
            <span>主食材清单</span>
            <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 500 }}>
              {recipe.requiredIngredients.length} 样主料
            </span>
          </div>
          <div>
            {recipe.requiredIngredients.map(item => {
              const hasIngredient = userFridgeSet.has(item.id);
              return (
                <div key={item.id} className="ingredient-item-row">
                  <div className="ingredient-item-name">
                    <span>{hasIngredient ? '🟢' : '⚪'}</span>
                    <span>{item.name}</span>
                  </div>
                  <div className="ingredient-item-meta">
                    <span style={{ marginRight: '8px' }}>
                      {item.amount} {item.unit}
                    </span>
                    <span className={`pantry-status-badge ${hasIngredient ? 'has' : 'missing'}`}>
                      {hasIngredient ? '冰箱已有' : '待备'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 二、调料清单 (护栏 2：不虚构调料用量，展示真实调料名与步骤指引) */}
        <div className="recipe-modal-section">
          <div className="recipe-modal-section-title">
            <span>常备调料</span>
            <span style={{ fontSize: '11px', color: 'var(--ios-forest-light)', fontWeight: 500 }}>
              不影响可做判断 · 按烹饪步骤添加
            </span>
          </div>
          <div>
            {recipe.pantryIngredients && recipe.pantryIngredients.length > 0 ? (
              recipe.pantryIngredients.map(pId => {
                const pantryObj = PANTRY_ITEMS.find(p => p.id === pId);
                const name = pantryObj ? pantryObj.name : pId;
                const hasPantry = userPantrySet.has(pId);
                return (
                  <div key={pId} className="ingredient-item-row">
                    <div className="ingredient-item-name">
                      <span style={{ fontSize: '12px' }}>🧂</span>
                      <span>{name}</span>
                    </div>
                    <div className="ingredient-item-meta">
                      <span style={{ marginRight: '8px', color: 'var(--ios-text-secondary)' }}>
                        按步骤加入
                      </span>
                      <span className={`pantry-status-badge ${hasPantry ? 'has' : 'missing'}`}>
                        {hasPantry ? '厨房已备' : '未备 (可调味替代)'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', padding: '4px 0' }}>
                本道菜无需额外常备调料
              </div>
            )}
          </div>
        </div>

        {/* 三、烹饪步骤 */}
        <div className="recipe-modal-section">
          <div className="recipe-modal-section-title">
            <span>烹饪步骤</span>
            <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 500 }}>
              共 {recipe.instructions.length} 步
            </span>
          </div>
          <div>
            {recipe.instructions.map((step, idx) => (
              <div key={idx} className="recipe-step-item">
                <span className="recipe-step-num">{idx + 1}</span>
                <span style={{ flex: 1 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};