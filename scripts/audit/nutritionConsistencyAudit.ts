/**
 * FitBite 营养数据一致性审计工具 (C.1.3)
 *
 * 扫描所有 raw_howtocook/*.md 文件，对比步骤文本与调料清单，
 * 报告：
 *   1. 步骤中有明确量化但清单缺失的调料（MISSING）
 *   2. 调料清单有但缺少量化值（UNQUANTIFIED）
 *   3. 烹调方式需要用油但清单无油的菜谱（OIL_MISSING）
 *
 * 运行方式：
 *   npx tsx scripts/audit/nutritionConsistencyAudit.ts
 */

import fs from 'fs';
import path from 'path';

// ──── 调料正则（与 Normalizer.ts 的 STEP_PANTRY_PATTERN 保持同步） ────
const STEP_PANTRY_PATTERN = /(\d+(?:\.\d+)?)\s*(ml|g|克|毫升|大勺|茶匙)\s*(食用油|植物油|菜籽油|花生油|猪油|色拉油|冰糖|白糖|砂糖|黄酒|料酒|绍兴酒|生抽|老抽|蚝油|盐|精盐|食用盐|淀粉|生粉|水淀粉|花椒|八角|香叶|葱|大葱|小葱|香葱|姜|生姜)/g;
const OIL_STEP_PATTERN = /加入.{0,8}(食用油|植物油|油)|下油|热锅.*油|油温/;
const OIL_TITLE_KEYWORDS = ['炒', '煎', '炸', '焖', '爆炒', '油焖'];

interface AuditResult {
  recipe: string;
  file: string;
  missing: { ingredient: string; amount: number; unit: string; foundInStep: string }[];
  unquantified: string[];  // 清单有但无数量
  oilMissing: boolean;
  oilMissingReason: string;
}

function parseSection(content: string, heading: string): string[] {
  const headingRe = new RegExp(`## ${heading}[\\s\\S]*?(?=\\n## |$)`);
  const match = content.match(headingRe);
  if (!match) return [];
  return match[0]
    .split('\n')
    .slice(1)
    .map(l => l.trim())
    .filter(l => l.startsWith('-') || (l.match(/^\d+\./)));
}

function extractIngredientNames(lines: string[]): Set<string> {
  const names = new Set<string>();
  for (const line of lines) {
    const cleaned = line.replace(/^[-*•\d+.]\s*/, '').trim();
    // 取前半部分（去掉数字量词）作为名称
    const namePart = cleaned.replace(/\s*\d+[\s.]*[a-zA-Z\u4e00-\u9fa5]*.*$/, '').trim();
    if (namePart) names.add(namePart);
    // 也直接加全文
    names.add(cleaned);
  }
  return names;
}

function auditFile(filePath: string): AuditResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const title = (content.match(/^# (.+)/) || [])[1]?.replace('的做法', '').trim() ?? path.basename(filePath);

  // 解析三个段落
  const ingredientLines = parseSection(content, '必备原料和工具');
  const calculationLines = parseSection(content, '计算');
  const stepLines = parseSection(content, '操作');

  const allListedNames = extractIngredientNames([...ingredientLines, ...calculationLines]);

  // ── 1. 扫描步骤文本 ──
  const missingMap = new Map<string, { amount: number; unit: string; step: string }>();
  const unquantifiedSet = new Set<string>();

  for (const step of stepLines) {
    let m: RegExpExecArray | null;
    STEP_PANTRY_PATTERN.lastIndex = 0;
    while ((m = STEP_PANTRY_PATTERN.exec(step)) !== null) {
      const amount = parseFloat(m[1]);
      const unit = m[2];
      const ingredient = m[3];

      // 检查是否在已知清单中
      const isListed = [...allListedNames].some(name =>
        name.includes(ingredient) || ingredient.includes(name.replace(/[约\d\s]+[a-zA-Z\u4e00-\u9fa5]*$/, '').trim())
      );

      if (!isListed && !missingMap.has(ingredient)) {
        missingMap.set(ingredient, { amount, unit, step: step.slice(0, 60) });
      }
    }
  }

  // ── 2. 检测清单中无量化的调料 ──
  // 只检查计算段（必备原料段通常不量化）
  for (const line of calculationLines) {
    const cleaned = line.replace(/^[-*•\d+.]\s*/, '').trim();
    if (!cleaned) continue;
    // 若行中无数字，且不是主食材，认为是未量化调料
    if (!/\d/.test(cleaned)) {
      // 简单识别：是否像调料名（短词，无单位）
      const isLikelyCondiment = cleaned.length <= 8 && !cleaned.includes('虾') && !cleaned.includes('鸡') && !cleaned.includes('肉');
      if (isLikelyCondiment) {
        unquantifiedSet.add(cleaned);
      }
    }
  }

  // ── 3. 用油兜底检测 ──
  const hasOilInTitle = OIL_TITLE_KEYWORDS.some(k => title.includes(k));
  const hasOilInSteps = stepLines.some(s => OIL_STEP_PATTERN.test(s));
  const hasOilListed = [...allListedNames].some(n =>
    ['食用油', '植物油', '菜籽油', '花生油', '猪油', '色拉油'].some(oil => n.includes(oil))
  );
  const oilMissing = (hasOilInTitle || hasOilInSteps) && !hasOilListed;
  const oilMissingReason = oilMissing
    ? (hasOilInTitle ? `菜名含油腻烹调关键词` : '步骤中有加油操作') + '，但清单无食用油'
    : '';

  return {
    recipe: title,
    file: path.basename(filePath),
    missing: [...missingMap.entries()].map(([ingredient, v]) => ({
      ingredient,
      amount: v.amount,
      unit: v.unit,
      foundInStep: v.step
    })),
    unquantified: [...unquantifiedSet],
    oilMissing,
    oilMissingReason
  };
}

// ──── 主程序 ────
const rawDir = path.join(process.cwd(), 'data', 'raw_howtocook');
const files = fs.readdirSync(rawDir)
  .filter(f => f.endsWith('.md') && f !== 'ATTRIBUTION.md')
  .map(f => path.join(rawDir, f));

const results: AuditResult[] = files.map(auditFile);
const issueResults = results.filter(r => r.missing.length > 0 || r.unquantified.length > 0 || r.oilMissing);
const cleanResults = results.filter(r => r.missing.length === 0 && r.unquantified.length === 0 && !r.oilMissing);

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log(`║  FitBite 营养数据一致性审计报告 (C.1.3)                      ║`);
console.log('╚══════════════════════════════════════════════════════════════╝\n');
console.log(`扫描文件数：${results.length}   有问题：${issueResults.length}   已对齐：${cleanResults.length}\n`);

if (issueResults.length === 0) {
  console.log('🎉 所有菜谱的步骤文本与调料清单完全对齐，无需修复！');
} else {
  for (const r of issueResults) {
    console.log(`┌─ 【${r.recipe}】 (${r.file})`);
    if (r.missing.length > 0) {
      console.log(`│  ⚠️  MISSING（步骤有量化、清单缺失）：`);
      for (const m of r.missing) {
        console.log(`│     - ${m.ingredient} ${m.amount}${m.unit}  ← "${m.foundInStep}..."`);
      }
    }
    if (r.unquantified.length > 0) {
      console.log(`│  ℹ️  UNQUANTIFIED（清单有但无数量）：`);
      for (const u of r.unquantified) {
        console.log(`│     - ${u}`);
      }
    }
    if (r.oilMissing) {
      console.log(`│  🛢️  OIL_MISSING：${r.oilMissingReason}`);
    }
    console.log('└──────────────────────────────────────────────────────────────');
  }
}

console.log('\n── 以下菜谱已完全对齐 ──────────────────────────────────────────');
for (const r of cleanResults) {
  console.log(`  ✅ ${r.recipe}`);
}
console.log('');
