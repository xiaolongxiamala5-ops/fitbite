import path from 'path';

export const SANOTSU_SOURCE_CONFIG = {
  repo: 'Sanotsu/china-food-composition-data',
  // Pinned commit from 2026-09-08 release containing fixed energy and English names
  commit: 'd15675c27582748307023b7ee7aca2a63fc52756',
  shortCommit: 'd15675c',
  targetDataset: 'json_data_v3_20260825_qwen38max_kimi_k3_fixed_en',
  csvFileName: 'food_composition_full.csv',
  downloadUrl: 'https://raw.githubusercontent.com/Sanotsu/china-food-composition-data/d15675c27582748307023b7ee7aca2a63fc52756/json_data_v3_20260825_qwen38max_kimi_k3_fixed_en/food_composition_full.csv',
  expectedRecords: 1677,
  sourceName: 'china_food_composition_v6' as const,

  // Local filesystem layout
  getCacheDir(projectRoot: string) {
    return path.join(projectRoot, 'external', 'nutrition-sources', 'sanotsu', this.commit);
  },
  getCachedCsvPath(projectRoot: string) {
    return path.join(this.getCacheDir(projectRoot), this.csvFileName);
  },
  getGeneratedOutputDir(projectRoot: string) {
    return path.join(projectRoot, 'data', 'nutrition', 'generated');
  },
  getGeneratedJsonPath(projectRoot: string) {
    return path.join(this.getGeneratedOutputDir(projectRoot), 'nutrition_foods.json');
  }
} as const;
