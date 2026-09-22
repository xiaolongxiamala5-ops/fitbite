import React from 'react';
import { Recipe } from '../../data/recipes';
import { MatchResult } from '../../core/matcher/types';
import { getPantryItemName, translatePantryEnglishOrId } from '../../ui/pantryPresets';
import { useFridge } from '../../context/FridgeContext';
import { getHealthGuidanceTips } from '../../../shared/nutrition';
import { isIngredientFulfilled } from '../../core/ingredients/taxonomy';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  matchResult?: MatchResult | null;
  onClose: () => void;
}

/**
 * 调料 ID → 中文展示词典
 * 覆盖主库之外的工程预设 ID，确保 UI 层永不裸露 preset_sugar / pantry_oil 等原始字符
 */
const PANTRY_ID_LABEL_MAP: Record<string, string> = {
  pantry_oil: '食用油',
  pantry_salt: '食盐',
  pantry_soy_sauce: '生抽',
  preset_dark_soy_sauce: '老抽',
  pantry_garlic: '大蒜',
  pantry_black_pepper: '黑胡椒',
  preset_chicken_essence: '鸡精',
  preset_ginger: '生姜',
  preset_starch: '淀粉',
  preset_cooking_wine: '料酒',
  preset_vinegar: '香醋',
  preset_sugar: '白糖',
  preset_rock_sugar: '冰糖',
  preset_oyster_sauce: '蚝油',
  preset_scallion: '葱',
  preset_star_anise: '八角',
  preset_sichuan_pepper: '花椒',
  preset_sesame_oil: '芝麻油',
  preset_cumin: '孜然',
  preset_chili_powder: '辣椒粉',
  preset_dried_chili: '干辣椒',
  preset_chili_dry: '干辣椒',
  preset_chili_oil: '辣椒油',
  preset_bay_leaf: '香叶',
  preset_steamed_fish_soy_sauce: '蒸鱼豉油',
  preset_doubanjiang: '豆瓣酱',
  preset_ketchup: '番茄酱'
};

const PANTRY_ID_PREFIXES = ['custom_pantry_', 'preset_', 'pantry_', 'custom_'];

/**
 * 调料名称中文化统一入口：词典命中 → 全局名称定位器 → 英文短语深度汉化 → 严禁英文 ID 泄露
 */
function resolvePantryLabel(id: string): string {
  if (!id) return '';

  // 1. 本地精准字典命中
  const dictHit = PANTRY_ID_LABEL_MAP[id];
  if (dictHit) return dictHit;

  // 2. 调料主库检索
  const located = getPantryItemName(id);
  if (located) return located;

  // 3. 英文或工程 ID 智能汉化翻译 (如 dried chili -> 干辣椒)
  const translated = translatePantryEnglishOrId(id);
  if (translated) return translated;

  // 4. 去除工程前缀后再次尝试翻译
  const stripped = PANTRY_ID_PREFIXES.reduce(
    (acc, prefix) => (acc.startsWith(prefix) ? acc.slice(prefix.length) : acc),
    id
  );
  const strippedTranslated = translatePantryEnglishOrId(stripped);
  if (strippedTranslated) return strippedTranslated;

  // 5. 兜底清洗：严禁展示带有下划线的原始 ID
  return stripped.replace(/_/g, ' ').trim() || id;
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

  // 核心护栏 1：所有用户可见“可做状态”必须严格统一遵循“主食材决定可做性”（支持上位词满足）
  const missingMainCount = matchResult
    ? matchResult.missingIngredients.length
    : recipe.requiredIngredients.filter(i => !isIngredientFulfilled(i.id, userFridgeSet)).length;

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

        {/* 营养参考标签 (双轨模式：verified 精准核算 vs estimated 厨房估算) */}
        {recipe.nutrition ? (() => {
          const { nutrition } = recipe;
          const isVerified = nutrition.confidence === 'verified';
          const pEnergy = (nutrition.protein || 0) * 4;
          const fEnergy = (nutrition.fat || 0) * 9;
          const cEnergy = (nutrition.carbs || 0) * 4;
          const totalMacroEnergy = pEnergy + fEnergy + cEnergy;

          const pPct = totalMacroEnergy > 0 ? Math.round((pEnergy / totalMacroEnergy) * 100) : 0;
          const fPct = totalMacroEnergy > 0 ? Math.round((fEnergy / totalMacroEnergy) * 100) : 0;
          const cPct = totalMacroEnergy > 0 ? Math.max(0, 100 - pPct - fPct) : 0;

          const calorieDisplay = isVerified
            ? `${recipe.calories || nutrition.calories || 0} kcal`
            : nutrition.calorieRange
              ? `约 ${nutrition.calorieRange[0]}–${nutrition.calorieRange[1]} kcal`
              : `约 ${recipe.calories || nutrition.calories || 0} kcal`;

          return (
            <div className="recipe-modal-nutrition">
              <div className="nutrition-pills-row">
                <span className="nutrition-pill">
                  🔥 <strong>{calorieDisplay}</strong>
                </span>
                <span className="nutrition-pill">
                  🥩 蛋白 <strong>{nutrition.protein}g</strong>
                </span>
                <span className="nutrition-pill">
                  🥑 脂肪 <strong>{nutrition.fat}g</strong>
                </span>
                <span className="nutrition-pill">
                  🍚 碳水 <strong>{nutrition.carbs}g</strong>
                </span>
                {isVerified ? (
                  <span className="nutrition-badge-verified">精准核算</span>
                ) : (
                  <span className="nutrition-badge-estimated">厨房估算</span>
                )}
              </div>
              {totalMacroEnergy > 0 && (
                <div className="macro-ratio-wrapper">
                  <div
                    className="macro-ratio-bar"
                    title={`供能比: 蛋白 ${pPct}%, 脂肪 ${fPct}%, 碳水 ${cPct}%`}
                  >
                    {pPct > 0 && <div className="macro-segment-protein" style={{ width: `${pPct}%` }} />}
                    {fPct > 0 && <div className="macro-segment-fat" style={{ width: `${fPct}%` }} />}
                    {cPct > 0 && <div className="macro-segment-carbs" style={{ width: `${cPct}%` }} />}
                  </div>
                  <div className="macro-ratio-labels">
                    <span className="macro-label-item">
                      <span className="macro-dot protein" />
                      蛋白 {pPct}%
                    </span>
                    <span className="macro-label-item">
                      <span className="macro-dot fat" />
                      脂肪 {fPct}%
                    </span>
                    <span className="macro-label-item">
                      <span className="macro-dot carbs" />
                      碳水 {cPct}%
                    </span>
                  </div>
                </div>
              )}

              {/* 模块二：高热量减脂烹饪改良建议卡片 */}
              {(() => {
                const tips = getHealthGuidanceTips(recipe);
                if (tips.length === 0) return null;
                return (
                  <div className="health-guidance-card">
                    <div className="health-guidance-title">
                      <span>💡 减脂改良建议</span>
                      <span className="health-badge-warning" style={{ fontSize: '10px', padding: '1px 6px' }}>建议分食 / 高能量</span>
                    </div>
                    <div className="health-guidance-list">
                      {tips.map((tip, idx) => (
                        <div key={idx} className="health-guidance-item">
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })() : (
          <div className="recipe-modal-nutrition" style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', padding: '4px 0' }}>
            <span>🥗 营养数据核算中（待可信估算）</span>
          </div>
        )}

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
              const hasIngredient = isIngredientFulfilled(item.id, userFridgeSet);
              return (
                <div key={item.id} className="ingredient-item-row">
                  <div className="ingredient-item-name">
                    <span>{hasIngredient ? '🟢' : '⚪'}</span>
                    <span>{item.name}</span>
                  </div>
                  <div className="ingredient-item-meta">
                    <span style={{ marginRight: '8px' }}>
                      {item.amount > 0 ? `${item.amount} ${item.unit || ''}`.trim() : (item.unit || '适量')}
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
                const name = resolvePantryLabel(pId);
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