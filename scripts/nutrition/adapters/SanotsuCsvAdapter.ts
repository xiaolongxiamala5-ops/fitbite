import { NutritionFood, MacroNutrients } from '../../../shared/nutrition/types';

export interface CsvParseOptions {
  commit: string;
  sourceFile: string;
}

/**
 * Robust RFC-4180 CSV Parser
 * Handles:
 * - UTF-8 BOM
 * - Quoted fields containing commas
 * - Escaped double quotes ("") inside quotes
 * - CRLF and LF line endings
 */
export function parseCsvRows(csvText: string): string[][] {
  const text = csvText.replace(/^\uFEFF+/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"';
          i++; // Skip the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (ch === '\r') {
        if (i + 1 < text.length && text[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else if (ch === '\n') {
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += ch;
      }
    }
  }

  // Last field/row if text doesn't end with newline
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parses a Sanotsu raw nutrient string:
 * - "Tr" -> 0.0 (trace detected, negligible mass)
 * - "—" or "-" -> null (unmeasured in reference book)
 * - "" / empty / undefined -> null
 * - Trailing footnotes like "*" (e.g. "899*") stripped safely
 */
export function parseSanotsuNutrientValue(val: string | undefined | null): {
  value: number | null;
  isTrace: boolean;
} {
  if (val === undefined || val === null) {
    return { value: null, isTrace: false };
  }
  const clean = val.trim();
  if (clean === '' || clean === '—' || clean === '-') {
    return { value: null, isTrace: false };
  }
  if (clean.toLowerCase() === 'tr') {
    return { value: 0.0, isTrace: true };
  }

  // Remove optional trailing footnote markings like '*'
  const numStr = clean.replace(/[*#]/g, '').trim();
  const num = Number(numStr);
  if (Number.isNaN(num)) {
    return { value: null, isTrace: false };
  }
  return { value: num, isTrace: false };
}

/**
 * Parses raw edible percentage into a normalized fraction (0.0 ~ 1.0)
 * Example: "100" -> 1.0, "74" -> 0.74, "51" -> 0.51
 */
export function parseSanotsuEdibleFraction(val: string | undefined | null): number {
  const { value } = parseSanotsuNutrientValue(val);
  if (value === null || value < 0) {
    return 1.0;
  }
  // Sanotsu edible is percentage 0 ~ 100
  const fraction = value / 100;
  return Math.max(0.0, Math.min(1.0, fraction));
}

export class SanotsuCsvAdapter {
  /**
   * Converts raw CSV content into normalized NutritionFood[] array.
   */
  public static parse(csvContent: string, options: CsvParseOptions): NutritionFood[] {
    const rows = parseCsvRows(csvContent);
    if (rows.length === 0) {
      return [];
    }

    const header = rows[0].map(h => h.trim());
    const colIndex = new Map<string, number>();
    header.forEach((name, idx) => colIndex.set(name, idx));

    const getCol = (row: string[], colName: string): string => {
      const idx = colIndex.get(colName);
      if (idx === undefined || idx >= row.length) return '';
      return row[idx];
    };

    const results: NutritionFood[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.length < 5) continue; // Skip malformed empty rows

      const foodCode = getCol(row, 'foodCode').trim();
      const foodName = getCol(row, 'foodName').trim();
      const rawEnglish = getCol(row, 'englishName').trim();
      const category = getCol(row, 'category').trim();
      const rawEdible = getCol(row, 'edible').trim();

      if (!foodCode || !foodName) {
        continue;
      }

      // English name must remain completely faithful to dataset
      const englishName = rawEnglish.length > 0 ? rawEnglish : null;

      const edibleFraction = parseSanotsuEdibleFraction(rawEdible);

      let hasTrace = false;

      const parseField = (colName: string): number | null => {
        const parsed = parseSanotsuNutrientValue(getCol(row, colName));
        if (parsed.isTrace) hasTrace = true;
        return parsed.value;
      };

      const calories = parseField('energyKCal') ?? 0;
      const protein = parseField('protein') ?? 0;
      const fat = parseField('fat') ?? 0;
      const carbs = parseField('CHO') ?? 0;
      const fiber = parseField('dietaryFiber');
      const sodium = parseField('Na');

      const per100g: MacroNutrients = {
        calories,
        protein,
        fat,
        carbs,
        fiber,
        sodium
      };

      const food: NutritionFood = {
        id: `sanotsu:${foodCode}`,
        foodCode,
        name: foodName,
        englishName,
        category,
        edibleFraction,
        per100g,
        provenance: {
          source: 'china_food_composition_v6',
          commit: options.commit,
          sourceFile: options.sourceFile,
          rawEdible,
          hasTraceValues: hasTrace
        }
      };

      results.push(food);
    }

    return results;
  }
}
