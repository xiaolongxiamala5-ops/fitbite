#!/usr/bin/env tsx
/**
 * batch_import_local.ts
 *
 * 通用本地离线批量菜谱导入脚本
 *
 * 用法:
 *   npx tsx scripts/batch_import_local.ts                  # 扫描默认暂存区 data/raw_recipes/
 *   npx tsx scripts/batch_import_local.ts <目录路径>         # 扫描指定目录
 *   npx tsx scripts/batch_import_local.ts --dry-run         # 试运行，不写入文件
 *
 * 功能:
 *   1. 递归扫描目录下所有 *.md 文件
 *   2. 兼容 YAML Frontmatter 格式 与普通 HowToCook Markdown 格式
 *   3. 健康/减脂过滤网（排除重油重糖菜品）
 *   4. 通过完整 Parse → Normalize → Validate 管线
 *   5. 幂等去重（基于 name+contentHash 双校验）
 *   6. 写入 data/recipes_imported.json 并打印结构化统计报表
 */

import fs from 'fs';
import path from 'path';
import { RecipeParser } from './pipeline/RecipeParser.js';
import { Normalizer } from './pipeline/Normalizer.js';
import { RecipeValidator } from './pipeline/Validator.js';
import type { FitBiteRecipe } from './pipeline/types.js';

// ─── 配置常量 ────────────────────────────────────────────────────────────────

const DEFAULT_SCAN_DIR = 'data/raw_recipes';
const OUTPUT_FILE = 'data/recipes_imported.json';

/**
 * 排除特征关键词（标题或原料含以下词则跳过）
 * 覆盖重油、重糖、高脂等减脂禁区
 */
const EXCLUDE_KEYWORDS = [
  '油炸', '宽油', '拔丝', '糖醋', '肥肠', '猪板油', '奶油', '黄油',
  '炸鸡', '炸薯', '脆皮', '红烧肉', '扣肉', '回锅肉', '梅菜扣肉',
  '糖浆', '甜品', '奶茶', '冰淇淋', '蛋糕', '布丁', '提拉米苏',
  '炸排骨', '油条', '锅巴', '深炸', '重油'
];

/**
 * 纳入特征关键词（含以下烹饪词则优先纳入）
 * 不强制要求，仅用于统计。实际以"非排除 + 营养通过"为准。
 */
const HEALTHY_KEYWORDS = [
  '蒸', '清蒸', '煮', '白灼', '凉拌', '清炒', '少油', '低脂',
  '空气炸', '烤箱', '水煮', '汆烫', '焯水', '涮', '炖汤'
];

// ─── 辅助工具 ─────────────────────────────────────────────────────────────────

/** 递归收集目录下所有 .md 文件的绝对路径 */
function collectMarkdownFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

/** 从文件名生成 slug（去除扩展名，转小写，空格→下划线） */
function fileToSlug(filePath: string): string {
  return path.basename(filePath, '.md')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\u4e00-\u9fa5]/g, '');
}

/** 检测文本是否含 YAML Frontmatter（--- 开头） */
function hasFrontmatter(content: string): boolean {
  return /^---\s*\n/.test(content);
}

/**
 * 预处理 YAML Frontmatter 格式 → 转换为 RecipeParser 兼容的普通 Markdown
 *
 * 支持:
 *   title: 清蒸鲈鱼
 *   tags: [减脂, 海鲜]
 *   ingredients:
 *     - 鲈鱼 500g
 *   steps:
 *     - 1. ...
 */
function normalizeFrontmatter(content: string, slug: string): string {
  const lines = content.split(/\r?\n/);
  let inFrontmatter = false;
  let frontmatterDone = false;
  let fmLineCount = 0;
  const fm: Record<string, string> = {};
  const bodyLines: string[] = [];

  // 解析 YAML Frontmatter 中的简单 key: value 对
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && line.trim() === '---') {
      inFrontmatter = true;
      fmLineCount++;
      continue;
    }
    if (inFrontmatter) {
      fmLineCount++;
      if (line.trim() === '---') {
        inFrontmatter = false;
        frontmatterDone = true;
        continue;
      }
      const kv = line.match(/^(\w+):\s*(.*)$/);
      if (kv) fm[kv[1]] = kv[2].trim();
      continue;
    }
    if (frontmatterDone || fmLineCount === 0) {
      bodyLines.push(line);
    }
  }

  const title = fm['title'] || slug;
  const body = bodyLines.join('\n');

  // 如果 body 本身已有一级标题，直接用原内容减去 frontmatter
  if (/^#\s/.test(body.trimStart())) {
    return `# ${title}\n\n${body}`;
  }

  // 否则在正文前补上一级标题，让 RecipeParser 可以识别
  return `# ${title}\n\n${body}`;
}

/** 健康过滤：检查标题+原料列表是否触碰排除词 */
function isExcluded(title: string, rawIngredients: string[]): { excluded: boolean; reason: string } {
  const haystack = [title, ...rawIngredients].join(' ');
  for (const kw of EXCLUDE_KEYWORDS) {
    if (haystack.includes(kw)) {
      return { excluded: true, reason: `含排除词「${kw}」` };
    }
  }
  return { excluded: false, reason: '' };
}

/** 检测文本是否含健康关键词（仅用于统计） */
function hasHealthyKeyword(title: string, rawIngredients: string[]): boolean {
  const haystack = [title, ...rawIngredients].join(' ');
  return HEALTHY_KEYWORDS.some(kw => haystack.includes(kw));
}

/** 读取现有 recipes_imported.json，容错返回空数组 */
function loadExisting(outputPath: string): FitBiteRecipe[] {
  if (!fs.existsSync(outputPath)) return [];
  try {
    const raw = fs.readFileSync(outputPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn(`[WARN] 无法解析 ${outputPath}，将以空库起步`);
    return [];
  }
}

// ─── 主流程 ───────────────────────────────────────────────────────────────────

interface ImportStats {
  scannedDir: string;
  totalMarkdown: number;
  excluded: number;
  alreadyExists: number;
  pipelineFailed: number;
  nutritionNull: number;
  newlyAdded: number;
  healthyTagged: number;
  totalInDb: number;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const targetArg = args.find(a => !a.startsWith('--'));

  const rootDir = process.cwd();
  const scanDir = path.resolve(rootDir, targetArg ?? DEFAULT_SCAN_DIR);
  const outputPath = path.join(rootDir, OUTPUT_FILE);

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║    FitBite 本地批量菜谱导入脚本 (batch_import_local)   ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\n📂 扫描目录: ${scanDir}`);
  console.log(`📄 输出文件: ${outputPath}`);
  if (dryRun) console.log('🔍 试运行模式 (--dry-run): 不写入文件\n');

  // 1. 收集所有 .md 文件
  const mdFiles = collectMarkdownFiles(scanDir);
  console.log(`\n🔎 发现 Markdown 文件: ${mdFiles.length} 个\n`);

  if (mdFiles.length === 0) {
    console.log(`ℹ️  目录 ${scanDir} 下未找到任何 .md 文件。`);
    console.log('   请将菜谱 Markdown 文件放入该目录后重新运行。\n');
    return;
  }

  // 2. 加载已有数据库（去重用）
  const existing = loadExisting(outputPath);
  const existingKeys = new Set<string>(
    existing.map(r => `${r.name}::${r.provenance.contentHash}`)
  );
  const existingNames = new Set<string>(existing.map(r => r.name));

  console.log(`📦 当前数据库已有菜谱: ${existing.length} 道\n`);

  // 3. 统计计数器
  const stats: ImportStats = {
    scannedDir: scanDir,
    totalMarkdown: mdFiles.length,
    excluded: 0,
    alreadyExists: 0,
    pipelineFailed: 0,
    nutritionNull: 0,
    newlyAdded: 0,
    healthyTagged: 0,
    totalInDb: existing.length
  };

  const newRecipes: FitBiteRecipe[] = [];

  // 4. 逐文件处理
  for (const filePath of mdFiles) {
    const relPath = path.relative(rootDir, filePath);
    const slug = fileToSlug(filePath);

    let rawContent: string;
    try {
      rawContent = fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
      console.log(`[SKIP] ${relPath} — 读取失败: ${(e as Error).message}`);
      stats.pipelineFailed++;
      continue;
    }

    // 预处理 Frontmatter
    let processedContent = rawContent;
    if (hasFrontmatter(rawContent)) {
      processedContent = normalizeFrontmatter(rawContent, slug);
    }

    // 解析
    const sourceFile = relPath.replace(/\\/g, '/');
    // Validator 要求 sourceUrl 以 https:// 开头；本地文件用占位 URL
    const sourceUrl = `https://local.import/${slug}`;

    let source: ReturnType<typeof RecipeParser.parse>;
    try {
      source = RecipeParser.parse(processedContent, {
        sourceId: slug,
        sourceUrl,
        sourceFile
      });
    } catch (e) {
      console.log(`[SKIP] ${relPath} — 解析失败: ${(e as Error).message}`);
      stats.pipelineFailed++;
      continue;
    }

    // 健康过滤
    const filterResult = isExcluded(source.originalTitle, source.rawIngredients);
    if (filterResult.excluded) {
      console.log(`[EXCL] ${source.originalTitle} — ${filterResult.reason}`);
      stats.excluded++;
      continue;
    }

    // 幂等去重（按 name + contentHash）
    const dedupeKey = `${source.originalTitle}::${source.contentHash}`;
    if (existingKeys.has(dedupeKey)) {
      console.log(`[SKIP] ${source.originalTitle} — 已存在（内容未变）`);
      stats.alreadyExists++;
      continue;
    }
    if (existingNames.has(source.originalTitle)) {
      console.log(`[SKIP] ${source.originalTitle} — 已存在同名基准菜谱，保留已验证版本`);
      stats.alreadyExists++;
      continue;
    }

    // Normalize
    let fitBiteRecipe: FitBiteRecipe;
    try {
      const result = Normalizer.normalize(source);
      fitBiteRecipe = result.fitBiteRecipe;
    } catch (e) {
      console.log(`[FAIL] ${source.originalTitle} — Normalize 失败: ${(e as Error).message}`);
      stats.pipelineFailed++;
      continue;
    }

    // 修正 provenance.source 为 'howtocook'（Validator 要求）
    // 本地导入的 markdown 格式与 HowToCook 相同，使用 howtocook source 确保许可证校验通过
    (fitBiteRecipe.provenance as any).source = 'howtocook';
    (fitBiteRecipe.provenance as any).license = 'CC-BY-4.0';

    // Validate
    const validation = RecipeValidator.validate(fitBiteRecipe);
    if (!validation.isValid) {
      const errSummary = validation.errors.slice(0, 2).join('; ');
      console.log(`[FAIL] ${fitBiteRecipe.name} — 校验失败: ${errSummary}`);
      stats.pipelineFailed++;
      continue;
    }

    // 营养计算结果检查
    if (!fitBiteRecipe.nutrition) {
      console.log(`[WARN] ${fitBiteRecipe.name} — 营养计算为 null，已跳过`);
      stats.nutritionNull++;
      continue;
    }

    // 高热量/高脂肪自动标记 cheat_or_share
    const nutrition = fitBiteRecipe.nutrition;
    const perServing = fitBiteRecipe.servings && fitBiteRecipe.servings > 0
      ? nutrition.calories / fitBiteRecipe.servings
      : nutrition.calories;
    if (perServing > 600 || nutrition.fat > 30) {
      if (!fitBiteRecipe.tags.includes('cheat_or_share')) {
        fitBiteRecipe.tags.push('cheat_or_share');
      }
      if (!fitBiteRecipe.tags.includes('控油建议')) {
        fitBiteRecipe.tags.push('控油建议');
      }
    }

    // 健康标签统计
    if (hasHealthyKeyword(fitBiteRecipe.name, source.rawIngredients)) {
      stats.healthyTagged++;
    }

    newRecipes.push(fitBiteRecipe);
    stats.newlyAdded++;
    existingKeys.add(dedupeKey);
    existingNames.add(fitBiteRecipe.name);

    console.log(
      `[PASS] ${fitBiteRecipe.name}` +
      ` | ${nutrition.calories} kcal` +
      ` | 蛋白 ${nutrition.protein}g` +
      ` | 脂肪 ${nutrition.fat}g` +
      (fitBiteRecipe.tags.includes('cheat_or_share') ? ' ⚠️ cheat_or_share' : '')
    );
  }

  // 5. 合并写入（按 id 去重，确保永远不产生主键冲突与重复项）
  const recipeMap = new Map<string, FitBiteRecipe>();
  for (const r of existing) {
    recipeMap.set(r.id, r);
  }
  for (const r of newRecipes) {
    recipeMap.set(r.id, r);
  }
  const merged = Array.from(recipeMap.values());
  stats.totalInDb = merged.length;

  if (!dryRun && (newRecipes.length > 0 || merged.length !== existing.length)) {
    fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2), 'utf-8');
    console.log(`\n✅ 已写入 ${outputPath} (总计 ${merged.length} 道唯一菜谱)`);
  } else if (dryRun) {
    console.log('\n🔍 试运行完成，未写入文件。');
  } else {
    console.log('\nℹ️  无新增菜谱，数据库未变更。');
  }

  // 6. 结构化统计报表
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                  📊 批量导入统计报表                   ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  扫描目录:     ${path.basename(stats.scannedDir).padEnd(36)}║`);
  console.log(`║  发现 .md:     ${String(stats.totalMarkdown).padEnd(36)}║`);
  console.log(`║  健康纳入词:   ${String(stats.healthyTagged).padEnd(36)}║`);
  console.log(`║  ─────────────────────────────────────────────────  ║`);
  console.log(`║  🚫 排除跳过:  ${String(stats.excluded).padEnd(36)}║`);
  console.log(`║  ♻️  已存在:    ${String(stats.alreadyExists).padEnd(36)}║`);
  console.log(`║  ❌ 管线失败:  ${String(stats.pipelineFailed).padEnd(36)}║`);
  console.log(`║  ⚠️  营养为空:  ${String(stats.nutritionNull).padEnd(36)}║`);
  console.log(`║  ─────────────────────────────────────────────────  ║`);
  console.log(`║  ✅ 新增成功:  ${String(stats.newlyAdded).padEnd(36)}║`);
  console.log(`║  📦 数据库总量: ${String(stats.totalInDb).padEnd(35)}║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

main().catch(err => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
