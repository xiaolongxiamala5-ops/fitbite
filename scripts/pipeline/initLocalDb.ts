import path from 'path';
import { LocalRecipeSource } from '../../server/data/LocalRecipeSource';

export function initLocalDb(dbFilePath?: string, jsonFilePath?: string) {
  const rootDir = process.cwd();
  const dbPath = dbFilePath || path.join(rootDir, 'data', 'fitbite_local.db');
  const jsonPath = jsonFilePath || path.join(rootDir, 'data', 'recipes_imported.json');

  console.log(`\n=== FitBite Local SQLite Database Init (C.1.2) ===`);
  console.log(`Database target: ${dbPath}`);
  console.log(`Source JSON: ${jsonPath}\n`);

  const source = new LocalRecipeSource({ dbPath });

  try {
    const summary = source.importFromJson(jsonPath);
    console.log(`Import Summary:`);
    console.log(`- Total in JSON: ${summary.totalInJson}`);
    console.log(`- Inserted: ${summary.inserted}`);
    console.log(`- Updated: ${summary.updated}`);
    console.log(`- Skipped: ${summary.skipped}`);
    console.log(`- Total in DB now: ${source.count()}`);

    // Quick verification
    console.log(`\nTesting Canonical Ingredient Inverted Index:`);
    const chickenLegRecipes = source.findRecipesByCanonicalIds(['p_chicken_leg']);
    console.log(`- [p_chicken_leg] matches: ${chickenLegRecipes.map(r => r.name).join(', ')}`);

    const chickenBreastRecipes = source.findRecipesByCanonicalIds(['p_chicken_breast']);
    console.log(`- [p_chicken_breast] matches: ${chickenBreastRecipes.map(r => r.name).join(', ')}`);

    return summary;
  } finally {
    source.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('initLocalDb.ts')) {
  initLocalDb();
}
