import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  SanotsuCsvAdapter,
  parseSanotsuNutrientValue,
  parseSanotsuEdibleFraction,
  parseCsvRows
} from '../scripts/nutrition/adapters/SanotsuCsvAdapter';
import { calculateEdibleGrams } from '../shared/nutrition/types';

describe('Sanotsu CSV Adapter & Nutrition Parser Test Suite (C.2.1 Offline)', () => {

  const fixturePath = path.resolve(__dirname, 'fixtures', 'sanotsu_sample.csv');
  const sampleCsv = fs.readFileSync(fixturePath, 'utf-8');

  describe('1. RFC-4180 CSV Parsing', () => {
    it('1.1 正确解析包含双引号、逗号的复杂字段', () => {
      const rows = parseCsvRows(sampleCsv);
      // 1 header + 6 data rows = 7 rows
      expect(rows.length).toBe(7);

      // 第一条数据：Chicken, whole 包含逗号并被双引号包裹
      const row1 = rows[1];
      expect(row1[1]).toBe('091101x');
      expect(row1[2]).toBe('鸡（代表值）');
      expect(row1[3]).toBe('Chicken, whole');
    });

    it('1.2 正确处理 UTF-8 BOM 头', () => {
      const bomCsv = '\uFEFF' + sampleCsv;
      const rows = parseCsvRows(bomCsv);
      expect(rows[0][0]).toBe('category');
    });
  });

  describe('2. 特殊值转换规则 (Tr / — / 空值 / 脚注)', () => {
    it('2.1 "Tr" (微量) 严格解析为 0.0，并标记 isTrace 为 true，绝不产生 NaN', () => {
      const res = parseSanotsuNutrientValue('Tr');
      expect(res.value).toBe(0.0);
      expect(res.isTrace).toBe(true);
    });

    it('2.2 "—" (未测定) 严格解析为 null，绝不脑补为 0', () => {
      const res = parseSanotsuNutrientValue('—');
      expect(res.value).toBeNull();
      expect(res.isTrace).toBe(false);
    });

    it('2.3 空字符串与 undefined 严格解析为 null', () => {
      expect(parseSanotsuNutrientValue('').value).toBeNull();
      expect(parseSanotsuNutrientValue('   ').value).toBeNull();
      expect(parseSanotsuNutrientValue(null).value).toBeNull();
      expect(parseSanotsuNutrientValue(undefined).value).toBeNull();
    });

    it('2.4 安全剥离带脚注标记的数值（如 "899*" -> 899）', () => {
      const res = parseSanotsuNutrientValue('899*');
      expect(res.value).toBe(899);
      expect(res.isTrace).toBe(false);
    });
  });

  describe('3. Edible Fraction (可食部比例 0.0 ~ 1.0)', () => {
    it('3.1 可食部百分比准确转换为 0.0 ~ 1.0 的小数', () => {
      expect(parseSanotsuEdibleFraction('100')).toBe(1.0);
      expect(parseSanotsuEdibleFraction('74')).toBe(0.74);
      expect(parseSanotsuEdibleFraction('63')).toBe(0.63);
      expect(parseSanotsuEdibleFraction('95')).toBe(0.95);
      expect(parseSanotsuEdibleFraction('0')).toBe(0.0);
    });

    it('3.2 异常/缺失可食部默认安全保底为 1.0，并钳制在 [0.0, 1.0] 闭区间', () => {
      expect(parseSanotsuEdibleFraction('')).toBe(1.0);
      expect(parseSanotsuEdibleFraction('—')).toBe(1.0);
      expect(parseSanotsuEdibleFraction('150')).toBe(1.0);
      expect(parseSanotsuEdibleFraction('-10')).toBe(1.0);
    });
  });

  describe('4. Opaque foodCode 与 EnglishName 忠实性', () => {
    it('4.1 foodCode 永远作为 opaque string 保留，不得转换为数值', () => {
      const foods = SanotsuCsvAdapter.parse(sampleCsv, { commit: 'test_commit', sourceFile: 'test.csv' });
      const wholeChicken = foods.find(f => f.name === '鸡（代表值）');
      expect(wholeChicken?.foodCode).toBe('091101x');
      expect(typeof wholeChicken?.foodCode).toBe('string');

      const tomato = foods.find(f => f.foodCode === '043119');
      expect(tomato?.foodCode).toBe('043119');
      expect(tomato?.foodCode.startsWith('0')).toBe(true);
    });

    it('4.2 englishName 严格忠实于源数据，空值严格为 null，绝不人工脑补', () => {
      const foods = SanotsuCsvAdapter.parse(sampleCsv, { commit: 'test_commit', sourceFile: 'test.csv' });

      // 源数据有英文名
      const chicken = foods.find(f => f.foodCode === '091101x');
      expect(chicken?.englishName).toBe('Chicken, whole');

      // 源数据无英文名 (鸡胸脯肉)
      const breast = foods.find(f => f.foodCode === '091112');
      expect(breast?.englishName).toBeNull();
    });
  });

  describe('5. WeightBasis 计算契约 (WeightBasis Contract)', () => {
    it('5.1 edible_net: 直接使用输入克重，不应用 edibleFraction', () => {
      // 鸡胸肉 200g，edibleFraction 为 1.0
      const actualGrams = calculateEdibleGrams(200, 'edible_net', 1.0);
      expect(actualGrams).toBe(200);

      // 假设某种特定净肉即使被传入 0.74 的系数，edible_net 依然严格等于原始克重
      const actualGramsForced = calculateEdibleGrams(200, 'edible_net', 0.74);
      expect(actualGramsForced).toBe(200);
    });

    it('5.2 gross_as_purchased: 实际可食克重 = grossGrams * edibleFraction', () => {
      // 带骨鸡腿 400g，edibleFraction 为 0.74
      const actualGrams = calculateEdibleGrams(400, 'gross_as_purchased', 0.74);
      expect(actualGrams).toBe(296); // 400 * 0.74 = 296g

      // 整虾 200g，edibleFraction 为 0.51
      const shrimpGrams = calculateEdibleGrams(200, 'gross_as_purchased', 0.51);
      expect(shrimpGrams).toBe(102); // 200 * 0.51 = 102g
    });

    it('5.3 unknown: 无法确定语义时安全返回 null，避免主观臆测', () => {
      expect(calculateEdibleGrams(200, 'unknown', 0.74)).toBeNull();
    });

    it('5.4 负数重量安全返回 null', () => {
      expect(calculateEdibleGrams(-50, 'edible_net', 1.0)).toBeNull();
      expect(calculateEdibleGrams(-50, 'gross_as_purchased', 0.74)).toBeNull();
    });
  });
});
