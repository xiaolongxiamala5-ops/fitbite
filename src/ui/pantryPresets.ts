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
  // 扩展常备调料
  { id: 'preset_scallion', name: '葱花', icon: '🌿' },
  { id: 'preset_star_anise', name: '八角', icon: '✨' },
  { id: 'preset_sichuan_pepper', name: '花椒', icon: '🌿' },
  { id: 'preset_sesame_oil', name: '芝麻油', icon: '🍶' },
  { id: 'preset_cumin', name: '孜然', icon: '🌿' },
  { id: 'preset_chili_powder', name: '辣椒粉', icon: '🌶️' },
  { id: 'preset_dried_chili', name: '干辣椒', icon: '🌶️' },
  { id: 'preset_chili_dry', name: '干辣椒', icon: '🌶️' },
  { id: 'preset_chili_oil', name: '辣椒油', icon: '🌶️' },
  { id: 'preset_rock_sugar', name: '冰糖', icon: '🍬' },
  { id: 'preset_dark_soy_sauce', name: '老抽', icon: '🥢' },
  { id: 'preset_bay_leaf', name: '香叶', icon: '🍃' },
  { id: 'preset_steamed_fish_soy_sauce', name: '蒸鱼豉油', icon: '🥢' },
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

  // 5. 全局常用英文与内部 ID 严格汉化反查（彻底消除 dried chili 等英文裸露）
  const translated = translatePantryEnglishOrId(id);
  if (translated) {
    memoryNameRegistry.set(id, translated);
    return translated;
  }

  // 6. 若依然含有内部前缀或下划线，返回 null 防止 ID 泄露
  if (id.startsWith('custom_pantry_') || id.includes('_')) {
    return null;
  }

  return id;
}

/**
 * 常见英文/下划线调料 ID 全量汉化映射表
 */
export const COMMON_PANTRY_TRANSLATION_MAP: Record<string, string> = {
  // 辣椒类
  'preset_dried_chili': '干辣椒',
  'preset_chili_dry': '干辣椒',
  'dried_chili': '干辣椒',
  'dried chili': '干辣椒',
  'dry_chili': '干辣椒',
  'dry chili': '干辣椒',
  'chili': '辣椒',
  'preset_chili_oil': '辣椒油',
  'chili_oil': '辣椒油',
  'chili oil': '辣椒油',
  'preset_chili_powder': '辣椒粉',
  'chili_powder': '辣椒粉',
  'chili powder': '辣椒粉',
  // 糖类
  'preset_rock_sugar': '冰糖',
  'rock_sugar': '冰糖',
  'rock sugar': '冰糖',
  'preset_sugar': '白糖',
  'white_sugar': '白糖',
  'white sugar': '白糖',
  'sugar': '白糖',
  // 酱油与油类
  'preset_dark_soy_sauce': '老抽',
  'dark_soy_sauce': '老抽',
  'dark soy sauce': '老抽',
  'pantry_soy_sauce': '生抽',
  'soy_sauce': '生抽',
  'soy sauce': '生抽',
  'pantry_oil': '食用油',
  'cooking_oil': '食用油',
  'cooking oil': '食用油',
  'oil': '食用油',
  'vegetable_oil': '植物油',
  'vegetable oil': '植物油',
  'preset_sesame_oil': '芝麻油',
  'sesame_oil': '芝麻油',
  'sesame oil': '芝麻油',
  // 酒醋调味类
  'preset_cooking_wine': '料酒',
  'cooking_wine': '料酒',
  'cooking wine': '料酒',
  'yellow_wine': '黄酒',
  'yellow wine': '黄酒',
  'preset_vinegar': '香醋',
  'vinegar': '香醋',
  'pantry_salt': '食盐',
  'salt': '食盐',
  'preset_oyster_sauce': '蚝油',
  'oyster_sauce': '蚝油',
  'oyster sauce': '蚝油',
  // 香辛料类
  'pantry_garlic': '大蒜',
  'garlic': '大蒜',
  'preset_ginger': '生姜',
  'ginger': '生姜',
  'preset_scallion': '葱',
  'scallion': '葱',
  'green_onion': '葱',
  'green onion': '葱',
  'preset_sichuan_pepper': '花椒',
  'sichuan_pepper': '花椒',
  'sichuan pepper': '花椒',
  'pantry_black_pepper': '黑胡椒',
  'black_pepper': '黑胡椒',
  'black pepper': '黑胡椒',
  'preset_chicken_essence': '鸡精',
  'chicken_essence': '鸡精',
  'chicken essence': '鸡精',
  'preset_star_anise': '八角',
  'star_anise': '八角',
  'star anise': '八角',
  'preset_bay_leaf': '香叶',
  'bay_leaf': '香叶',
  'bay leaf': '香叶',
  'preset_steamed_fish_soy_sauce': '蒸鱼豉油',
  'steamed_fish_soy_sauce': '蒸鱼豉油',
  'steamed fish soy sauce': '蒸鱼豉油',
  'preset_starch': '淀粉',
  'starch': '淀粉',
  'preset_cumin': '孜然',
  'cumin': '孜然',
  'preset_doubanjiang': '豆瓣酱',
  'doubanjiang': '豆瓣酱',
  'preset_ketchup': '番茄酱',
  'ketchup': '番茄酱'
};

/**
 * 将任意英文调料名称或工程 ID 规范汉化为标准中文
 */
export function translatePantryEnglishOrId(raw: string): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();

  // 1. 直接全词匹配
  if (COMMON_PANTRY_TRANSLATION_MAP[key]) {
    return COMMON_PANTRY_TRANSLATION_MAP[key];
  }

  // 2. 去除前缀后匹配
  const stripped = key
    .replace(/^custom_pantry_/, '')
    .replace(/^preset_/, '')
    .replace(/^pantry_/, '')
    .replace(/^custom_/, '');

  if (COMMON_PANTRY_TRANSLATION_MAP[stripped]) {
    return COMMON_PANTRY_TRANSLATION_MAP[stripped];
  }

  // 3. 空格/下划线转换后匹配
  const normalized = stripped.replace(/_/g, ' ').trim();
  if (COMMON_PANTRY_TRANSLATION_MAP[normalized]) {
    return COMMON_PANTRY_TRANSLATION_MAP[normalized];
  }

  return null;
}
