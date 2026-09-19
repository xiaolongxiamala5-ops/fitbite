import React, { useState, useEffect } from 'react';
import { useFridge } from '../../context/FridgeContext';
import {
  PantryShelfItem,
  MASTER_KNOWN_SEASONINGS,
  DEFAULT_INITIAL_PANTRY,
  STORAGE_KEY_USER_PANTRY_LIST,
  getStoredUserPantry,
  saveUserPantry,
  filterValidPantryIds,
  registerPantryName
} from '../../ui/pantryPresets';

export const PantrySelector: React.FC = () => {
  const { pantryIngredients, togglePantry, setPantry } = useFridge();
  const [shelfItems, setShelfItems] = useState<PantryShelfItem[]>(DEFAULT_INITIAL_PANTRY);
  const [isAdding, setIsAdding] = useState(false);
  const [newSeasoningName, setNewSeasoningName] = useState('');

  // 初始化加载用户持久化的常备调料架
  useEffect(() => {
    try {
      const activeList = getStoredUserPantry();
      if (!localStorage.getItem(STORAGE_KEY_USER_PANTRY_LIST)) {
        saveUserPantry(activeList);
      }

      setShelfItems(activeList);
      activeList.forEach(item => registerPantryName(item.id, item.name));

      // 同步 FridgeContext 中的已备列表：彻底清除不在当前调料架中的任何项
      // 保证用户删除过的调料（如食盐、生抽、八角等）在刷新后绝不残留于已备状态
      const validPantry = filterValidPantryIds(activeList, pantryIngredients);
      if (validPantry.length !== pantryIngredients.length) {
        setPantry(validPantry);
      }
    } catch {
      // 容错处理
    }
  }, []);

  // 添加调料（无论是系统库中的还是全新自定义的）
  const handleAddSeasoning = (nameToAdd: string) => {
    const trimmed = nameToAdd.trim();
    if (!trimmed) return;

    // 1. 如果已在调料架上：确保切换为已备状态
    const existing = shelfItems.find(item => item.name === trimmed);
    if (existing) {
      if (!pantryIngredients.includes(existing.id)) {
        togglePantry(existing.id);
      }
      setNewSeasoningName('');
      setIsAdding(false);
      return;
    }

    // 2. 如果是已知调料库成员，使用其固定 ID 与图标；否则创建全新自定义调料
    const known = MASTER_KNOWN_SEASONINGS.find(m => m.name === trimmed);
    const itemToAdd: PantryShelfItem = known
      ? { id: known.id, name: known.name, icon: known.icon }
      : { id: `custom_pantry_${Date.now()}`, name: trimmed, icon: '✨' };

    registerPantryName(itemToAdd.id, itemToAdd.name);

    const updated = [...shelfItems, itemToAdd];
    setShelfItems(updated);
    saveUserPantry(updated);

    // 新加入的调料直接设为已备
    if (!pantryIngredients.includes(itemToAdd.id)) {
      setPantry([...pantryIngredients, itemToAdd.id]);
    }

    setNewSeasoningName('');
    setIsAdding(false);
  };

  // 统一删除任意调料（包括食用油、食盐、生抽、以及自定义调料）
  const handleDeletePantryItem = (e: React.MouseEvent, idToDelete: string) => {
    e.stopPropagation();

    // 1. 如果该调料当前处于已备状态，同时清除已备
    if (pantryIngredients.includes(idToDelete)) {
      setPantry(pantryIngredients.filter(id => id !== idToDelete));
    }

    // 2. 从常备调料列表中彻底移除
    const updated = shelfItems.filter(item => item.id !== idToDelete);
    setShelfItems(updated);

    // 3. 持久化到 localStorage，刷新后不复现
    saveUserPantry(updated);
  };

  // 推荐标签：从主库中筛选当前架上未包含的项目，供用户一键添加
  const suggestedOptions = MASTER_KNOWN_SEASONINGS.filter(
    k => !shelfItems.some(item => item.name === k.name)
  );

  return (
    <div className="pantry-container">
      <div className="pantry-pill-grid">
        {/* 统一调料架：所有调料均采用统一模型，均可点击主体切换、点击 × 彻底移除 */}
        {shelfItems.map(item => {
          const checked = pantryIngredients.includes(item.id);
          return (
            <div
              key={item.id}
              className={`pantry-pill ${checked ? 'active' : ''}`}
            >
              <button
                type="button"
                className="pantry-pill-body"
                onClick={() => togglePantry(item.id)}
                title={checked ? '点击取消已备' : '点击设为已备'}
              >
                <span className="pantry-pill-icon">{item.icon}</span>
                <span className="pantry-pill-name">{item.name}</span>
              </button>
              <button
                type="button"
                className="pantry-pill-delete"
                onClick={e => handleDeletePantryItem(e, item.id)}
                title={`从常备库中移除“${item.name}”`}
                aria-label={`移除${item.name}`}
              >
                ×
              </button>
            </div>
          );
        })}

        {/* “＋ 添加调料” 胶囊按钮 */}
        <button
          type="button"
          className="pantry-add-trigger"
          onClick={() => setIsAdding(prev => !prev)}
        >
          <span>＋</span>
          <span>添加调料</span>
        </button>
      </div>

      {/* 展开式快速添加面板 */}
      {isAdding && (
        <div className="pantry-add-drawer">
          <div className="pantry-suggest-label">常用调料灵感快速添加：</div>
          <div className="pantry-suggest-tags">
            {suggestedOptions.map(s => (
              <span
                key={s.id}
                className="pantry-suggest-tag"
                onClick={() => handleAddSeasoning(s.name)}
              >
                ＋ {s.name}
              </span>
            ))}
          </div>

          <form
            className="pantry-custom-input-row"
            onSubmit={e => {
              e.preventDefault();
              handleAddSeasoning(newSeasoningName);
            }}
          >
            <input
              type="text"
              className="pantry-custom-input"
              placeholder="输入调料名称，如：八角、豆瓣酱..."
              value={newSeasoningName}
              onChange={e => setNewSeasoningName(e.target.value)}
              autoFocus
            />
            <button type="submit" className="pantry-custom-btn">
              添加
            </button>
          </form>
        </div>
      )}
    </div>
  );
};