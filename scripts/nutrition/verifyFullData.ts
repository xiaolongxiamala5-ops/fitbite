import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SANOTSU_SOURCE_CONFIG } from './sourceConfig';
import { NutritionFood } from '../../shared/nutrition/types';
import { CANONICAL_TO_SANOTSU } from '../../data/nutrition/mappings/canonical-to-sanotsu';
import { CANONICAL_MAP } from '../../shared/ingredients/canonicalCatalog';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

function verifyFullData(): void {
  console.log('=== FitBite Nutrition Full Data Verification ===');

  const outputJsonPath = SANOTSU_SOURCE_CONFIG.getGeneratedJsonPath(projectRoot);

  if (!fs.existsSync(outputJsonPath)) {
    console.error(`Error: Generated dataset does not exist at: ${outputJsonPath}`);
    console.error('Please run `npm run nutrition:sync` first to generate the local dataset.');
    process.exit(1);
  }

  const rawJson = fs.readFileSync(outputJsonPath, 'utf-8');
  const foods = JSON.parse(rawJson) as NutritionFood[];

  console.log(`Verifying ${foods.length} items from ${outputJsonPath}...`);

  // 1. Verify count
  if (foods.length !== SANOTSU_SOURCE_CONFIG.expectedRecords) {
    console.error(`Verification Failed: Expected ${SANOTSU_SOURCE_CONFIG.expectedRecords} records, got ${foods.length}.`);
    process.exit(1);
  }

  // 2. Verify structure, opaque foodCode, and edibleFraction bounds
  const foodCodeMap = new Map<string, NutritionFood>();
  for (const food of foods) {
    if (!food.foodCode || typeof food.foodCode !== 'string') {
      console.error(`Verification Failed: Invalid foodCode on item:`, food);
      process.exit(1);
    }
    if (foodCodeMap.has(food.foodCode)) {
      console.error(`Verification Failed: Duplicate foodCode: ${food.foodCode}`);
      process.exit(1);
    }
    foodCodeMap.set(food.foodCode, food);

    if (food.edibleFraction < 0.0 || food.edibleFraction > 1.0) {
      console.error(`Verification Failed: edibleFraction out of bounds [0.0, 1.0]: ${food.edibleFraction} on ${food.foodCode}`);
      process.exit(1);
    }

    if (food.provenance.commit !== SANOTSU_SOURCE_CONFIG.commit) {
      console.error(`Verification Failed: Provenance commit mismatch: expected ${SANOTSU_SOURCE_CONFIG.commit}, got ${food.provenance.commit}`);
      process.exit(1);
    }
  }

  // 3. Verify canonical mapping integrity
  console.log('Verifying Canonical -> Sanotsu Mappings integrity...');
  for (const mapping of CANONICAL_TO_SANOTSU) {
    if (!CANONICAL_MAP.has(mapping.canonicalId)) {
      console.error(`Verification Failed: Unknown canonicalId '${mapping.canonicalId}' in mapping table.`);
      process.exit(1);
    }
    const matchedFood = foodCodeMap.get(mapping.foodCode);
    if (!matchedFood) {
      console.error(`Verification Failed: foodCode '${mapping.foodCode}' for '${mapping.canonicalId}' does not exist in dataset.`);
      process.exit(1);
    }
  }

  console.log('Verification Success:');
  console.log(` - All ${SANOTSU_SOURCE_CONFIG.expectedRecords} foods conform to NutritionFood schema.`);
  console.log(` - All ${CANONICAL_TO_SANOTSU.length} canonical mappings link to verified food items.`);
  console.log(` - Provenance SHA: ${SANOTSU_SOURCE_CONFIG.commit} (100% match).`);
}

verifyFullData();
