import { CanonicalDefinition, CanonicalIngredient } from './types';
import { CANONICAL_CATALOG } from './canonicalCatalog';

// 建立精确匹配映射表
const aliasToCanonical = new Map<string, CanonicalDefinition>();

CANONICAL_CATALOG.forEach(item => {
  aliasToCanonical.set(item.name, item);
  aliasToCanonical.set(item.slug, item);
  aliasToCanonical.set(item.id, item);
  item.aliases.forEach(alias => {
    aliasToCanonical.set(alias, item);
  });
});

/**
 * 清洗原始食材文本（去除数量、括号说明、修饰词等）
 */
export function cleanIngredientRawText(rawText: string): string {
  let cleaned = rawText.trim();
  // 去除 markdown 列表符
  cleaned = cleaned.replace(/^[-*•]\s*/, '');
  // 去除中英文括号及其中内容，例如（常温冷冻均可）、(可选)
  cleaned = cleaned.replace(/[（(][^）)]*[）)]/g, '');
  // 去除末尾的数字或单位描述，例如 1 个、200g、一条、三根
  cleaned = cleaned.replace(/\s*\d+(\.\d+)?\s*(g|kg|ml|克|千克|毫升|个|只|条|根|朵|瓣|盒|块|包|支).*$/i, '');
  // 去除中文数字，例如 一条、三根、半个、1 枚
  cleaned = cleaned.replace(/\s*[一二两三四五六七八九十半\d]+\s*(个|只|条|根|朵|瓣|盒|块|包|枚|支).*$/, '');
  return cleaned.trim();
}

/**
 * 解析食材是否属于 Canonical Ingredient 并返回规范定义
 * 绝不允许语义跨部位泛化
 */
export function resolveCanonical(rawText: string): CanonicalDefinition | null {
  const cleaned = cleanIngredientRawText(rawText);

  // 1. 直接全词精确匹配
  if (cleaned && aliasToCanonical.has(cleaned)) {
    return aliasToCanonical.get(cleaned)!;
  }

  // 2. 检查主文本子串匹配（按别名长度从长到短匹配）
  if (cleaned) {
    let matched: CanonicalDefinition | null = null;
    let maxMatchedLen = 0;

    for (const [alias, def] of aliasToCanonical.entries()) {
      if (cleaned.includes(alias) && alias.length > maxMatchedLen) {
        matched = def;
        maxMatchedLen = alias.length;
      }
    }
    if (matched) return matched;
  }

  // 3. 只有主文本未匹配时，才检查括号内的备选项
  const parenMatches = rawText.match(/[（(]([^）)]+)[）)]/g);
  if (parenMatches) {
    for (const paren of parenMatches) {
      const inner = cleanIngredientRawText(
        paren.replace(/^[（(]|[）)]$/g, '').replace(/^(或者|可选|推荐|可换成)/, '')
      );
      if (inner && aliasToCanonical.has(inner)) {
        return aliasToCanonical.get(inner)!;
      }
      for (const [alias, def] of aliasToCanonical.entries()) {
        if (inner.includes(alias)) {
          return def;
        }
      }
    }
  }

  return null;
}

export interface CanonicalResolvedResult {
  primary: CanonicalDefinition;
  mode: 'single' | 'anyOf';
  alternatives?: { id: string; name: string }[];
}

/**
 * 结构化解析食材（支持二选一 / 多选一替代关系）
 * 绝不允许为了兼容而丢失替代选项
 */
export function resolveCanonicalWithOptions(rawText: string): CanonicalResolvedResult | null {
  const candidates: string[] = [];

  // 1. 括号中的“或者/也行/均可/也可以用”
  const parenMatch = rawText.match(/^([^(（]+)[(（](?:或者|或|也可以用|也可以|推荐|超市的)?\s*([^）)]+?)(?:也行|均可|即可|的可选|可选)?\s*[）)]$/);
  if (parenMatch) {
    candidates.push(parenMatch[1].trim());
    candidates.push(parenMatch[2].trim());
  } else if (rawText.includes(' or ') || rawText.includes(' / ') || rawText.includes(' 或者 ')) {
    const parts = rawText.split(/\s+or\s+|\s*\/\s+|\s+或者\s+/);
    parts.forEach(p => candidates.push(p.trim()));
  } else {
    candidates.push(rawText);
  }

  // 解析各个候选片段
  const resolvedDefs: CanonicalDefinition[] = [];
  const seenIds = new Set<string>();

  for (const cand of candidates) {
    const def = resolveCanonical(cand);
    if (def && !seenIds.has(def.id)) {
      seenIds.add(def.id);
      resolvedDefs.push(def);
    }
  }

  // 若候选片段中没有解析出任何规范食材，尝试兜底解析整句
  if (resolvedDefs.length === 0) {
    const fallbackDef = resolveCanonical(rawText);
    if (fallbackDef) {
      resolvedDefs.push(fallbackDef);
    }
  }

  if (resolvedDefs.length === 0) {
    return null;
  }

  if (resolvedDefs.length === 1) {
    return {
      primary: resolvedDefs[0],
      mode: 'single'
    };
  }

  // 存在 2 个及以上不同的 Canonical 定义，构建 anyOf 替代组
  return {
    primary: resolvedDefs[0],
    mode: 'anyOf',
    alternatives: resolvedDefs.map(d => ({ id: d.id, name: d.name }))
  };
}

/**
 * 前端/全局别名解析器包装（与 src/core/ingredients/aliasResolver 保持完全兼容）
 */
export function resolveAlias(inputName: string): CanonicalIngredient | null {
  if (!inputName || !inputName.trim()) {
    return null;
  }
  return resolveCanonical(inputName);
}
