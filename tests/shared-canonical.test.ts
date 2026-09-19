import { describe, it, expect } from 'vitest';
import {
  CANONICAL_CATALOG,
  CANONICAL_INGREDIENTS,
  CANONICAL_MAP
} from '../shared/ingredients/canonicalCatalog';
import { resolveAlias, resolveCanonicalWithOptions } from '../shared/ingredients/aliasResolver';

describe('Shared Canonical SSOT Test Suite (C.2.1)', () => {

  describe('1. SSOT Catalog Integrity & Part Separation', () => {
    it('1.1 严格包含 C.1.1 确认的全部细分禽肉部位 ID', () => {
      expect(CANONICAL_MAP.has('p_chicken_breast')).toBe(true);
      expect(CANONICAL_MAP.has('p_chicken_leg')).toBe(true);
      expect(CANONICAL_MAP.has('p_chicken_wing')).toBe(true);

      const breast = CANONICAL_MAP.get('p_chicken_breast')!;
      const leg = CANONICAL_MAP.get('p_chicken_leg')!;
      const wing = CANONICAL_MAP.get('p_chicken_wing')!;

      expect(breast.id).not.toBe(leg.id);
      expect(leg.id).not.toBe(wing.id);
    });

    it('1.2 严格区分整虾与剥皮虾仁，绝对禁止使用泛化 p_shrimp', () => {
      // 必须存在独立的细分 ID
      expect(CANONICAL_MAP.has('p_shrimp_whole')).toBe(true);
      expect(CANONICAL_MAP.has('p_shrimp_peeled')).toBe(true);

      // 旧的宽泛 p_shrimp 严禁存在于 Catalog 与 Map 中
      expect(CANONICAL_MAP.has('p_shrimp')).toBe(false);
      expect(CANONICAL_CATALOG.some(item => item.id === 'p_shrimp')).toBe(false);
    });

    it('1.3 严格包含鱼类与豆制品细分 ID', () => {
      expect(CANONICAL_MAP.has('p_fish_seabass')).toBe(true);
      expect(CANONICAL_MAP.has('p_tofu_silken')).toBe(true);
      expect(CANONICAL_MAP.has('p_tofu_firm')).toBe(true);
      expect(CANONICAL_MAP.has('p_pork_belly')).toBe(true);
      expect(CANONICAL_MAP.has('p_pork_lean')).toBe(true);
    });

    it('1.4 所有 Canonical ID 与 Slug 全局唯一', () => {
      const ids = CANONICAL_CATALOG.map(i => i.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);

      const slugs = CANONICAL_CATALOG.map(i => i.slug);
      const uniqueSlugs = new Set(slugs);
      expect(slugs.length).toBe(uniqueSlugs.size);
    });

    it('1.5 别名定义不得产生跨食材冲突', () => {
      const seenAliases = new Map<string, string>();
      CANONICAL_CATALOG.forEach(item => {
        item.aliases.forEach(alias => {
          if (seenAliases.has(alias)) {
            const existingId = seenAliases.get(alias);
            expect(existingId).toBe(item.id);
          } else {
            seenAliases.set(alias, item.id);
          }
        });
      });
    });

    it('1.6 CANONICAL_INGREDIENTS 必须与 CANONICAL_CATALOG 结构等价', () => {
      expect(CANONICAL_INGREDIENTS).toBe(CANONICAL_CATALOG);
      expect(CANONICAL_MAP.size).toBe(CANONICAL_CATALOG.length);
    });
  });

  describe('2. Alias Resolver with Shared SSOT', () => {
    it('2.1 精确解析整虾与虾仁', () => {
      expect(resolveAlias('大虾')?.id).toBe('p_shrimp_whole');
      expect(resolveAlias('基围虾')?.id).toBe('p_shrimp_whole');
      expect(resolveAlias('鲜虾')?.id).toBe('p_shrimp_whole');
      expect(resolveAlias('草虾')?.id).toBe('p_shrimp_whole');

      expect(resolveAlias('虾仁')?.id).toBe('p_shrimp_peeled');
      expect(resolveAlias('鲜虾仁')?.id).toBe('p_shrimp_peeled');
      expect(resolveAlias('冻虾仁')?.id).toBe('p_shrimp_peeled');
    });

    it('2.2 精确解析禽肉部位', () => {
      expect(resolveAlias('手枪腿')?.id).toBe('p_chicken_leg');
      expect(resolveAlias('鸡腿')?.id).toBe('p_chicken_leg');
      expect(resolveAlias('去皮鸡胸肉')?.id).toBe('p_chicken_breast');
      expect(resolveAlias('鸡胸脯肉')?.id).toBe('p_chicken_breast');
      expect(resolveAlias('鸡翅中')?.id).toBe('p_chicken_wing');
    });

    it('2.3 精确解析豆腐质地', () => {
      expect(resolveAlias('嫩豆腐')?.id).toBe('p_tofu_silken');
      expect(resolveAlias('内酯豆腐')?.id).toBe('p_tofu_silken');
      expect(resolveAlias('老豆腐')?.id).toBe('p_tofu_firm');
      expect(resolveAlias('北豆腐')?.id).toBe('p_tofu_firm');
    });

    it('2.4 结构化解析支持 anyOf 多选项识别', () => {
      const res = resolveCanonicalWithOptions('手枪腿（或者鸡胸脯肉）');
      expect(res).not.toBeNull();
      expect(res?.mode).toBe('anyOf');
      expect(res?.primary.id).toBe('p_chicken_leg');
      expect(res?.alternatives?.map(a => a.id)).toEqual(['p_chicken_leg', 'p_chicken_breast']);
    });
  });
});
