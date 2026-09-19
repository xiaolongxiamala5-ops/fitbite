export interface PantryShelfItem {
  id: string;
  name: string;
  icon: string;
}

/**
 * 厨房已知调料主库 (供初始默认、补全图标、重新添加推荐使用)
 */
export const MASTER_KNOWN_SEASONINGS: PantryShelfItem[] = [
  // 核心基础调料
  { id: 'pantry_oil', name: '食用油', icon: '🍶' },
  { id: 'pantry_salt', name: '食盐', icon: '🧂' },
  { id: 'pantry_soy_sauce', name: '生抽', icon: '🥢' },
  { id: 'pantry_garlic', name: '大蒜', icon: '🧄' },
  { id: 'pantry_black_pepper', name: '黑胡椒', icon: '🌿' },
  // 常见扩展调料
  { id: 'preset_chicken_essence', name: '鸡精', icon: '🧂' },
  { id: 'preset_ginger', name: '生姜', icon: '🌿' },
  { id: 'preset_starch', name: '淀粉', icon: '🥣' },
  { id: 'preset_cooking_wine', name: '料酒', icon: '🍶' },
  { id: 'preset_vinegar', name: '香醋', icon: '🍶' },
  { id: 'preset_sugar', name: '白糖', icon: '🍬' },
  { id: 'preset_oyster_sauce', name: '蚝油', icon: '🥢' },
  // 高频快捷添加候选项
  { id: 'preset_scallion', name: '葱花', icon: '🌿' },
  { id: 'preset_star_anise', name: '八角', icon: '✨' },
  { id: 'preset_sichuan_pepper', name: '花椒', icon: '🌿' },
  { id: 'preset_sesame_oil', name: '芝麻油', icon: '🍶' },
  { id: 'preset_cumin', name: '孜然', icon: '🌿' },
  { id: 'preset_chili_powder', name: '辣椒粉', icon: '🌶️' },
  { id: 'preset_doubanjiang', name: '豆瓣酱', icon: '🫙' },
  { id: 'preset_ketchup', name: '番茄酱', icon: '🍅' }
];

/**
 * 首次进入应用时的初始调料架预设
 */
export const DEFAULT_INITIAL_PANTRY: PantryShelfItem[] = [
  { id: 'pantry_oil', name: '食用油', icon: '🍶' },
  { id: 'pantry_salt', name: '食盐', icon: '🧂' },
  { id: 'pantry_soy_sauce', name: '生抽', icon: '🥢' },
  { id: 'pantry_garlic', name: '大蒜', icon: '🧄' },
  { id: 'pantry_black_pepper', name: '黑胡椒', icon: '🌿' },
  { id: 'preset_chicken_essence', name: '鸡精', icon: '🧂' },
  { id: 'preset_ginger', name: '生姜', icon: '🌿' },
  { id: 'preset_starch', name: '淀粉', icon: '🥣' },
  { id: 'preset_cooking_wine', name: '料酒', icon: '🍶' },
  { id: 'preset_vinegar', name: '香醋', icon: '🍶' },
  { id: 'preset_sugar', name: '白糖', icon: '🍬' },
  { id: 'preset_oyster_sauce', name: '蚝油', icon: '🥢' }
];

export const STORAGE_KEY_USER_PANTRY_LIST = 'fitbite_user_pantry_shelf_list';
export const STORAGE_KEY_NAME_REGISTRY = 'fitbite_pantry_name_map';

/**
 * 从 localStorage 读取用户持久化的调料架列表，无缓存或格式异常时返回默认预设
 */
export function getStoredUserPantry(): PantryShelfItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_USER_PANTRY_LIST);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      } else if (Array.isArray(parsed) && parsed.length === 0) {
        return [];
      }
    }
  } catch {
    // 容错处理
  }
  return DEFAULT_INITIAL_PANTRY;
}

/**
 * 持久化用户的调料架列表到 localStorage
 */
export function saveUserPantry(items: PantryShelfItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_USER_PANTRY_LIST, JSON.stringify(items));
  } catch {
    // 容错处理
  }
}

/**
 * 状态清洗：根据当前有效的调料架过滤已选调料 ID，确保已移除的调料不残留
 */
export function filterValidPantryIds(activeShelf: PantryShelfItem[], selectedIds: string[]): string[] {
  const shelfIdSet = new Set(activeShelf.map(item => item.id));
  return selectedIds.filter(id => shelfIdSet.has(id));
}

// 内存单例缓存
const memoryNameRegistry = new Map<string, string>();

MASTER_KNOWN_SEASONINGS.forEach(item => {
  memoryNameRegistry.set(item.id, item.name);
});

/**
 * 仅用于测试：重置内存单例名称缓存至系统已知词库状态，便于验证纯 localStorage 持久化读取
 */
export function resetMemoryNameRegistryForTesting(): void {
  memoryNameRegistry.clear();
  MASTER_KNOWN_SEASONINGS.forEach(item => {
    memoryNameRegistry.set(item.id, item.name);
  });
}

/**
 * 注册调料名称
 */
export function registerPantryName(id: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  memoryNameRegistry.set(id, trimmed);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NAME_REGISTRY);
    const map = raw ? JSON.parse(raw) : {};
    map[id] = trimmed;
    localStorage.setItem(STORAGE_KEY_NAME_REGISTRY, JSON.stringify(map));
  } catch {}
}

/**
 * 调料名称统一定位器
 * 核心护栏：严格杜绝任何 custom_pantry_xxx 或带内部前缀的 ID 泄露给 UI
 */
export function getPantryItemName(id: string): string | null {
  if (!id) return null;

  // 1. 优先从内存缓存中获取
  if (memoryNameRegistry.has(id)) {
    return memoryNameRegistry.get(id)!;
  }

  // 2. 检索已知调料库
  const known = MASTER_KNOWN_SEASONINGS.find(k => k.id === id);
  if (known) {
    memoryNameRegistry.set(id, known.name);
    return known.name;
  }

  // 3. 检索用户当前保存的调料架
  try {
    const stored = localStorage.getItem(STORAGE_KEY_USER_PANTRY_LIST);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const found = parsed.find((item: { id: string; name: string }) => item.id === id);
        if (found && found.name) {
          memoryNameRegistry.set(id, found.name);
          return found.name;
        }
      }
    }
  } catch {}

  // 4. 检索名称注册表
  try {
    const regRaw = localStorage.getItem(STORAGE_KEY_NAME_REGISTRY);
    if (regRaw) {
      const regMap = JSON.parse(regRaw);
      if (regMap && regMap[id]) {
        memoryNameRegistry.set(id, regMap[id]);
        return regMap[id];
      }
    }
  } catch {}

  // 5. 内部 ID 严禁泄露给 UI
  if (id.startsWith('custom_pantry_') || id.includes('_')) {
    return null;
  }

  return id;
}
