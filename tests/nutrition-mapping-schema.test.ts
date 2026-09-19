import { describe, it, expect } from 'vitest';
import { CANONICAL_TO_SANOTSU } from '../data/nutrition/mappings/canonical-to-sanotsu';
import { CANONICAL_MAP } from '../shared/ingredients/canonicalCatalog';

describe('Canonical -> Sanotsu Mapping Schema & Consistency Suite (C.2.1 Offline)', () => {

  it('1.1 映射表中每一个 canonicalId 必须真实存在于 Shared Canonical Catalog (SSOT)', () => {
    expect(CANONICAL_TO_SANOTSU.length).toBeGreaterThanOrEqual(15);

    CANONICAL_TO_SANOTSU.forEach(mapping => {
      const exists = CANONICAL_MAP.has(mapping.canonicalId);
      expect(
        exists,
        `Mapping entry '${mapping.canonicalId}' does not exist in shared CANONICAL_CATALOG.`
      ).toBe(true);
    });
  });

  it('1.2 映射表中绝对不允许存在重复的 canonicalId', () => {
    const ids = CANONICAL_TO_SANOTSU.map(m => m.canonicalId);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('1.3 每一个映射条目的 defaultWeightBasis 必须属于合法的枚举值', () => {
    const validBases = ['edible_net', 'gross_as_purchased'];
    CANONICAL_TO_SANOTSU.forEach(mapping => {
      expect(validBases).toContain(mapping.defaultWeightBasis);
    });
  });

  it('1.4 foodCode 必须是非空且格式合规的字符串', () => {
    CANONICAL_TO_SANOTSU.forEach(mapping => {
      expect(typeof mapping.foodCode).toBe('string');
      expect(mapping.foodCode.trim().length).toBeGreaterThanOrEqual(4);
    });
  });

  it('1.5 映射表中严禁手写硬编码卡路里或三大营养素数值', () => {
    CANONICAL_TO_SANOTSU.forEach(mapping => {
      const entry = mapping as unknown as Record<string, unknown>;
      expect(entry.calories).toBeUndefined();
      expect(entry.protein).toBeUndefined();
      expect(entry.fat).toBeUndefined();
      expect(entry.carbs).toBeUndefined();
      expect(entry.energyKCal).toBeUndefined();
    });
  });

  it('1.6 核心食材映射已完成基础核实绑定', () => {
    const mappedIds = new Set(CANONICAL_TO_SANOTSU.map(m => m.canonicalId));
    expect(mappedIds.has('p_chicken_breast')).toBe(true);
    expect(mappedIds.has('p_chicken_leg')).toBe(true);
    expect(mappedIds.has('p_chicken_wing')).toBe(true);
    expect(mappedIds.has('p_egg')).toBe(true);
    expect(mappedIds.has('p_shrimp_whole')).toBe(true);
    expect(mappedIds.has('p_shrimp_peeled')).toBe(false); // 营养组成与 generic fresh peeled shrimp 语义无法可靠对应，保持 unmapped
    expect(mappedIds.has('p_fish_seabass')).toBe(true);
    expect(mappedIds.has('p_tofu_silken')).toBe(true);
    expect(mappedIds.has('p_tofu_firm')).toBe(true);
    expect(mappedIds.has('v_tomato')).toBe(true);
    expect(mappedIds.has('v_broccoli')).toBe(true);
    expect(mappedIds.has('c_potato')).toBe(true);
  });
});
