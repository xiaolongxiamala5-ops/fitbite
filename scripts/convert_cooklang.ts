/**
 * scripts/convert_cooklang.ts
 *
 * Cooklang 轻量解析与减脂标准化转换脚本
 *
 * 核心功能：
 * 1. 递归扫描 data/external_sources/cooklang_raw/ 下所有的 .cook 文件
 * 2. 正则解析 Cooklang 语法：
 *    - 食材: @name{amount%unit} / @name{amount} / @name{} / @name
 *    - 厨具: #cookware{} / #cookware
 *    - 计时: ~{time%unit} / ~time%unit
 *    - 元数据: >> key: value (servings, calories, protein, fat, carb 等)
 * 3. 严格健康与减脂过滤：
 *    - 过滤油炸（fried / deep fry / deep-fried 等）
 *    - 过滤重油（heavy cream / double cream / lard / bacon / pork belly 等）
 *    - 过滤高糖与甜品（sugar syrup / pudding / cake / jam / glazed honey / caramel 等）
 *    - 过滤烘焙高糖类目（Baking 目录）
 * 4. 步骤校验：steps.length >= 2，缺少食材或步骤不足自动跳过
 * 5. 组装为标准 Markdown Frontmatter 格式落盘至 data/raw_recipes/
 */

import fs from 'fs';
import path from 'path';

// ─── 配置常量 ────────────────────────────────────────────────────────────────

const RAW_COOKLANG_DIR = path.resolve(process.cwd(), 'data/external_sources/cooklang_raw');
const OUTPUT_DIR = path.resolve(process.cwd(), 'data/raw_recipes');

/** 油炸排除词 (区分常规 stir-fry，但包含 fried / deep fry / deep-fried 等) */
const EXCLUDE_FRY_KEYWORDS = [
  'deep fry',
  'deep-fry',
  'deep fried',
  'deep-fried',
  'fried chicken',
  'fried pork',
  'fried tofu',
  'french fries',
  'pan-fried', // 重油煎炸
  '油炸',
  '炸'
];

/** 重油、高脂肪排除词 */
const EXCLUDE_FAT_KEYWORDS = [
  'heavy cream',
  'double cream',
  'sour cream',
  'mayonnaise',
  'lard',
  'pork belly',
  'bacon',
  'butter pudding',
  'carbonara',
  'gammon',
  '重油',
  '猪油',
  '肥肉',
  '五花肉'
];

/** 高糖、甜品、高热量烘焙排除词 */
const EXCLUDE_SUGAR_KEYWORDS = [
  'sugar syrup',
  'caramel',
  'pudding',
  'cake',
  'jam',
  'glazed honey',
  'beer bread',
  'sweet dessert',
  '高糖',
  '糖浆',
  '甜品'
];

// ─── 接口定义 ────────────────────────────────────────────────────────────────

interface ParsedIngredient {
  name: string;
  amount: string;
  unit: string;
  raw: string;
}

interface ParsedCooklang {
  filePath: string;
  title: string;
  category: string;
  metadata: Record<string, string>;
  ingredients: ParsedIngredient[];
  steps: string[];
}

interface FilterResult {
  passed: boolean;
  reason?: string;
}

// ─── 辅助工具函数 ─────────────────────────────────────────────────────────────

/** 递归扫描目录下所有的 .cook 文件 */
function scanCookFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(scanCookFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.cook')) {
      results.push(fullPath);
    }
  }
  return results;
}

/** 分数文本转换为小数数值格式（如 1/2 -> 0.5, 1/4 -> 0.25） */
function normalizeAmount(amountStr: string): string {
  if (!amountStr) return '';
  const trimmed = amountStr.trim();
  const fracMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    const num = parseFloat(fracMatch[1]);
    const den = parseFloat(fracMatch[2]);
    if (den !== 0) {
      return (num / den).toFixed(2).replace(/\.?0+$/, '');
    }
  }
  return trimmed;
}

/** 将文件名转换为合规的安全 slug */
function toSlug(filename: string): string {
  return filename
    .replace(/\.cook$/i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** 自然清理 Cooklang 步骤文本中的语法标记 */
function cleanStepText(text: string): string {
  let cleaned = text;

  // 1. 带花括号食材: @chicken breast{200%g} -> chicken breast (200g)
  cleaned = cleaned.replace(/@([a-zA-Z0-9_\u4e00-\u9fa5\s'-]+?)\{([^}]*)\}/g, (_m, name, content) => {
    const trimmedName = name.trim();
    if (!content) return trimmedName;
    const parts = content.split('%');
    const amt = parts[0] ? normalizeAmount(parts[0]) : '';
    const unit = parts[1] ? parts[1].trim() : '';
    if (amt && unit) return `${trimmedName} (${amt}${unit})`;
    if (amt) return `${trimmedName} (${amt})`;
    return trimmedName;
  });

  // 2. 不带花括号的单词食材: @salt, @oil -> salt, oil
  cleaned = cleaned.replace(/@([a-zA-Z0-9_\u4e00-\u9fa5-]+)/g, '$1');

  // 3. 带花括号厨具: #frying pan{} -> frying pan
  cleaned = cleaned.replace(/#([a-zA-Z0-9_\u4e00-\u9fa5\s'-]+?)\{[^}]*\}/g, '$1');

  // 4. 不带花括号的厨具: #bowl -> bowl
  cleaned = cleaned.replace(/#([a-zA-Z0-9_\u4e00-\u9fa5-]+)/g, '$1');

  // 5. 计时器: ~{7%minutes} -> 7 minutes
  cleaned = cleaned.replace(/~\{([^}]*)\}/g, (_m, content) => {
    const parts = content.split('%');
    const amt = parts[0] ? parts[0].trim() : '';
    const unit = parts[1] ? parts[1].trim() : '';
    return unit ? `${amt} ${unit}` : amt;
  });

  // 6. 简易计时器: ~30%minutes -> 30 minutes
  cleaned = cleaned.replace(/~([0-9.]+)(?:%([a-zA-Z]+))?/g, (_m, amt, unit) => (unit ? `${amt} ${unit}` : amt));

  // 清除多余连续空格
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}

/** 单个 .cook 文件解析器 */
function parseCooklangFile(filePath: string): ParsedCooklang {
  const content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath, '.cook');
  const parentDir = path.basename(path.dirname(filePath));

  const lines = content.split(/\r?\n/);
  const metadata: Record<string, string> = {};
  const rawSteps: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 元数据行: >> key: value
    if (trimmed.startsWith('>>')) {
      const match = trimmed.slice(2).trim().match(/^([^:]+):\s*(.*)$/);
      if (match) {
        metadata[match[1].trim().toLowerCase()] = match[2].trim();
      }
    } else {
      rawSteps.push(trimmed);
    }
  }

  // 提取食材列表（先提取带花括号的多词食材，替换遮蔽后再提取单词食材，避免误识别）
  const ingredientsMap = new Map<string, ParsedIngredient>();
  const curlyRegex = /@([a-zA-Z0-9_\u4e00-\u9fa5\s'-]+?)\{([^}]*)\}/g;
  const singleRegex = /@([a-zA-Z0-9_\u4e00-\u9fa5-]+)(?=[,.\s;!?]|$)/g;

  for (const step of rawSteps) {
    // 1. 匹配带花括号的明确食材
    let maskedStep = step.replace(curlyRegex, (fullMatch, name, content) => {
      const rawName = (name as string).trim();
      const contentStr = content ? (content as string).trim() : '';
      let amount = '';
      let unit = '';

      if (contentStr) {
        const parts = contentStr.split('%');
        amount = parts[0] ? normalizeAmount(parts[0]) : '';
        unit = parts[1] ? parts[1].trim() : '';
      }

      const key = rawName.toLowerCase();
      if (!ingredientsMap.has(key)) {
        ingredientsMap.set(key, {
          name: rawName,
          amount,
          unit,
          raw: fullMatch
        });
      }
      // 用遮蔽字符替换，防止单字正则二次截取
      return ' '.repeat(fullMatch.length);
    });

    // 2. 匹配不带花括号的简易食材（如 @salt, @oil）
    let match: RegExpExecArray | null;
    while ((match = singleRegex.exec(maskedStep)) !== null) {
      const rawName = match[1].trim();
      const key = rawName.toLowerCase();
      if (!ingredientsMap.has(key)) {
        ingredientsMap.set(key, {
          name: rawName,
          amount: '适量',
          unit: '',
          raw: match[0]
        });
      }
    }
  }

  // 格式化步骤文本
  const cleanSteps = rawSteps.map(cleanStepText).filter(s => s.length > 0);

  return {
    filePath,
    title: filename,
    category: parentDir,
    metadata,
    ingredients: Array.from(ingredientsMap.values()),
    steps: cleanSteps
  };
}

/** 健康与减脂过滤网 */
function evaluateHealthiness(parsed: ParsedCooklang): FilterResult {
  const fullHaystack = [
    parsed.title,
    parsed.category,
    ...parsed.ingredients.map(i => i.name),
    ...parsed.steps
  ].join(' ').toLowerCase();

  // 1. 烘焙类排除
  if (parsed.category.toLowerCase() === 'baking') {
    return { passed: false, reason: '烘焙糕点类目 (Baking)' };
  }

  // 2. 油炸排除
  for (const kw of EXCLUDE_FRY_KEYWORDS) {
    if (fullHaystack.includes(kw.toLowerCase())) {
      return { passed: false, reason: `含油炸关键词 [${kw}]` };
    }
  }

  // 3. 重油高脂排除
  for (const kw of EXCLUDE_FAT_KEYWORDS) {
    if (fullHaystack.includes(kw.toLowerCase())) {
      return { passed: false, reason: `含重油/高脂食材 [${kw}]` };
    }
  }

  // 4. 高糖排除
  for (const kw of EXCLUDE_SUGAR_KEYWORDS) {
    if (fullHaystack.includes(kw.toLowerCase())) {
      return { passed: false, reason: `含高糖/高热量甜品关键词 [${kw}]` };
    }
  }

  // 5. 步骤数完整性校验 (>= 2)
  if (parsed.steps.length < 2) {
    return { passed: false, reason: `制作步骤不足 (steps.length = ${parsed.steps.length} < 2)` };
  }

  // 6. 必须包含主要食材
  if (parsed.ingredients.length === 0) {
    return { passed: false, reason: '缺少有效原料食材' };
  }

  return { passed: true };
}

/** 生成符合 FitBite 标准的 Markdown Frontmatter 文件内容 */
function generateMarkdown(parsed: ParsedCooklang, slug: string): string {
  const meta = parsed.metadata;
  const servings = meta['servings'] ? parseInt(meta['servings'], 10) || 1 : 1;
  const caloriesMatch = meta['calories']?.match(/(\d+)/);
  const calories = caloriesMatch ? parseInt(caloriesMatch[1], 10) : 0;
  const proteinMatch = meta['protein']?.match(/([0-9.]+)/);
  const protein = proteinMatch ? parseFloat(proteinMatch[1]) : 0;
  const fatMatch = meta['total fat']?.match(/([0-9.]+)/);
  const fat = fatMatch ? parseFloat(fatMatch[1]) : 0;
  const carbsMatch = (meta['total carb.'] || meta['total carbs.'])?.match(/([0-9.]+)/);
  const carbs = carbsMatch ? parseFloat(carbsMatch[1]) : 0;

  const frontmatter = [
    '---',
    `title: "${parsed.title}"`,
    `slug: "${slug}"`,
    `source: "cooklang"`,
    `sourceCategory: "${parsed.category}"`,
    `servings: ${servings}`,
    calories > 0 ? `calories: ${calories}` : null,
    protein > 0 ? `protein: ${protein}` : null,
    fat > 0 ? `fat: ${fat}` : null,
    carbs > 0 ? `carbs: ${carbs}` : null,
    'tags:',
    '  - cooklang',
    '  - 减脂轻食',
    `  - ${parsed.category}`,
    '---'
  ].filter(Boolean).join('\n');

  const ingredientsList = parsed.ingredients
    .map(i => `- ${i.name}`)
    .join('\n');

  const calculationsList = parsed.ingredients
    .map(i => {
      if (i.amount && i.unit) {
        return `- ${i.name} = ${i.amount} ${i.unit}`;
      }
      if (i.amount) {
        return `- ${i.name} = ${i.amount}`;
      }
      return `- ${i.name} 适量`;
    })
    .join('\n');

  const stepsList = parsed.steps
    .map((step, idx) => `${idx + 1}. ${step}`)
    .join('\n');

  return `${frontmatter}

# ${parsed.title}

Cooklang 官方开源减脂轻食菜谱，注重优质蛋白与时蔬搭配，制作流程清晰明了。

预估烹饪难度：★★
预计制作时间：20 分钟

## 必备原料和工具

${ingredientsList}

## 计算

${calculationsList}

## 操作

${stepsList}

## 附加内容

- 本菜谱来源于 Cooklang 官方开源精选食谱库。
- 遵循健康轻食、控油控糖原则烹饪。
`;
}

// ─── 执行主函数 ───────────────────────────────────────────────────────────────

export function runCooklangConverter(): {
  total: number;
  excluded: number;
  converted: number;
  outputFiles: string[];
} {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       Cooklang 轻量解析与减脂标准化转换器        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  console.log(`📂 扫描目录: ${RAW_COOKLANG_DIR}`);
  console.log(`📄 写入目录: ${OUTPUT_DIR}\n`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const cookFiles = scanCookFiles(RAW_COOKLANG_DIR);
  console.log(`🔎 共发现 .cook 食谱文件: ${cookFiles.length} 个\n`);

  let convertedCount = 0;
  let excludedCount = 0;
  const outputFiles: string[] = [];

  for (const file of cookFiles) {
    try {
      const parsed = parseCooklangFile(file);
      const healthCheck = evaluateHealthiness(parsed);

      if (!healthCheck.passed) {
        console.log(`[EXCL] ${parsed.title} (${parsed.category}) — ${healthCheck.reason}`);
        excludedCount++;
        continue;
      }

      const slug = `cooklang_${toSlug(parsed.title)}`;
      const markdownContent = generateMarkdown(parsed, slug);
      const targetFilePath = path.join(OUTPUT_DIR, `${slug}.md`);

      fs.writeFileSync(targetFilePath, markdownContent, 'utf-8');
      outputFiles.push(targetFilePath);
      convertedCount++;

      console.log(
        `[PASS] ${parsed.title}` +
        ` | 原料: ${parsed.ingredients.length} 种` +
        ` | 步骤: ${parsed.steps.length} 步` +
        ` -> ${slug}.md`
      );
    } catch (err) {
      console.error(`[FAIL] 解析文件失败 ${file}:`, (err as Error).message);
      excludedCount++;
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                  📊 Cooklang 转换统计                ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  扫描总数:     ${cookFiles.length.toString().padEnd(36)}║`);
  console.log(`║  过滤排除:     ${excludedCount.toString().padEnd(36)}║`);
  console.log(`║  ✅ 成功转换:  ${convertedCount.toString().padEnd(36)}║`);
  console.log(`║  落盘目录:     data/raw_recipes/                   ║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');

  return {
    total: cookFiles.length,
    excluded: excludedCount,
    converted: convertedCount,
    outputFiles
  };
}

// CLI 执行入口
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('convert_cooklang.ts')) {
  runCooklangConverter();
}
