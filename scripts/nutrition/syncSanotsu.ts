import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SANOTSU_SOURCE_CONFIG } from './sourceConfig';
import { SanotsuCsvAdapter } from './adapters/SanotsuCsvAdapter';
import { CANONICAL_TO_SANOTSU } from '../../data/nutrition/mappings/canonical-to-sanotsu';
import { CANONICAL_MAP } from '../../shared/ingredients/canonicalCatalog';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

async function syncSanotsu(): Promise<void> {
  console.log('=== FitBite Nutrition Source Sync (Sanotsu) ===');
  console.log(`Pinned Source Repository: ${SANOTSU_SOURCE_CONFIG.repo}`);
  console.log(`Pinned Commit SHA:        ${SANOTSU_SOURCE_CONFIG.commit}`);
  console.log(`Target Dataset:           ${SANOTSU_SOURCE_CONFIG.targetDataset}`);

  const cacheDir = SANOTSU_SOURCE_CONFIG.getCacheDir(projectRoot);
  const cachedCsvPath = SANOTSU_SOURCE_CONFIG.getCachedCsvPath(projectRoot);
  const outputDir = SANOTSU_SOURCE_CONFIG.getGeneratedOutputDir(projectRoot);
  const outputJsonPath = SANOTSU_SOURCE_CONFIG.getGeneratedJsonPath(projectRoot);

  // 1. Ensure cache directory exists
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // 2. Fetch CSV if not cached
  let csvContent: string;
  if (fs.existsSync(cachedCsvPath)) {
    console.log(`[Cache HIT] Using cached raw CSV: ${cachedCsvPath}`);
    csvContent = fs.readFileSync(cachedCsvPath, 'utf-8');
  } else {
    console.log(`[Cache MISS] Fetching from: ${SANOTSU_SOURCE_CONFIG.downloadUrl}`);
    const response = await fetch(SANOTSU_SOURCE_CONFIG.downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download Sanotsu CSV: HTTP ${response.status} ${response.statusText}`);
    }
    csvContent = await response.text();
    fs.writeFileSync(cachedCsvPath, csvContent, 'utf-8');
    console.log(`[Downloaded] Saved raw CSV snapshot to: ${cachedCsvPath}`);
  }

  // 3. Parse CSV with SanotsuCsvAdapter
  console.log('Parsing CSV content and normalizing into NutritionFood schema...');
  const nutritionFoods = SanotsuCsvAdapter.parse(csvContent, {
    commit: SANOTSU_SOURCE_CONFIG.commit,
    sourceFile: SANOTSU_SOURCE_CONFIG.csvFileName
  });

  console.log(`Successfully normalized ${nutritionFoods.length} food items.`);

  // 4. Verify record count matches pinned dataset expectation (1677)
  if (nutritionFoods.length !== SANOTSU_SOURCE_CONFIG.expectedRecords) {
    throw new Error(
      `Dataset integrity error: Expected ${SANOTSU_SOURCE_CONFIG.expectedRecords} records, but parsed ${nutritionFoods.length}.`
    );
  }

  // 5. Write normalized output to data/nutrition/generated/
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputJsonPath, JSON.stringify(nutritionFoods, null, 2), 'utf-8');
  console.log(`[Written] Saved normalized dataset to: ${outputJsonPath}`);

  // 6. Validate canonical mappings against the normalized dataset
  console.log('\nValidating Canonical -> Sanotsu Mappings...');
  const foodCodeSet = new Set(nutritionFoods.map(f => f.foodCode));
  const errors: string[] = [];

  for (const mapping of CANONICAL_TO_SANOTSU) {
    if (!CANONICAL_MAP.has(mapping.canonicalId)) {
      errors.push(`Canonical mapping error: canonicalId '${mapping.canonicalId}' not found in CANONICAL_CATALOG.`);
    }
    if (!foodCodeSet.has(mapping.foodCode)) {
      errors.push(
        `Canonical mapping error: foodCode '${mapping.foodCode}' for '${mapping.canonicalId}' not found in Sanotsu dataset.`
      );
    }
  }

  if (errors.length > 0) {
    console.error('Mapping validation failed with errors:');
    errors.forEach(err => console.error(` - ${err}`));
    throw new Error('Mapping validation failed.');
  }

  const englishCount = nutritionFoods.filter(f => f.englishName !== null).length;
  const traceCount = nutritionFoods.filter(f => f.provenance.hasTraceValues).length;
  const totalCanonical = CANONICAL_MAP.size;
  const mappedCount = CANONICAL_TO_SANOTSU.length;
  const unmappedCount = totalCanonical - mappedCount;

  console.log('\n=== Nutrition Sync Summary ===');
  console.log(`Total Food Items Normalized: ${nutritionFoods.length} / ${SANOTSU_SOURCE_CONFIG.expectedRecords}`);
  console.log(`Foods with English Names:     ${englishCount} (${((englishCount / nutritionFoods.length) * 100).toFixed(1)}%)`);
  console.log(`Foods with Trace (Tr) values: ${traceCount}`);
  console.log(`Shared Canonical Ingredients: ${totalCanonical}`);
  console.log(`Mapped Canonical Ingredients: ${mappedCount}`);
  console.log(`Unmapped Canonical Items:     ${unmappedCount}`);
  console.log('Status: 100% PASS - Ready for C.2.2 Nutrition Engine integration.\n');
}

syncSanotsu().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
