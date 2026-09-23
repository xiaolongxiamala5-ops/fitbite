import fs from 'fs';
import path from 'path';

interface RawRecipeItem {
  name?: string;
  title?: string;
  description?: string;
  ingredients?: Array<{ name: string; amount?: string; weight?: number; unit?: string } | string>;
  steps?: string[];
  tags?: string[];
}

const SOURCE_URL = 'https://raw.githubusercontent.com/shunanya/cookbooks/master/data/recipes.json';
const OUTPUT_DIR = path.resolve(process.cwd(), 'data/raw_recipes');

// 排除特征关键词：油炸、重油、高糖、红烧、肥肉
const EXCLUDE_KEYWORDS = [
  '油炸', '宽油', '炸', '深炸', '脆皮', '油条', '炸鸡', '炸排骨', '炸薯',
  '重油', '猪油', '牛油', '猪板油', '肥肠',
  '高糖', '拔丝', '糖醋', '蜜汁', '糖浆', '甜品', '蛋糕', '奶茶', '冰淇淋',
  '红烧', '红烧肉', '红烧排骨', '红烧鱼',
  '肥肉', '五花肉', '五花', '扣肉', '回锅肉', '梅菜扣肉'
];

/**
 * 内置高质量菜谱数据集（作为远端 404 / 网络断开时的可靠回退源）
 * 包含：
 * 1. 违规样本（油炸、重油、高糖、红烧、肥肉）-> 验证规则过滤
 * 2. 格式错误/缺失字段样本（无克重、steps < 2、格式缺失）-> 验证健壮性与 try...catch continue
 * 3. 合规减脂菜谱 -> 验证提取与 Markdown 落盘
 */
const FALLBACK_RECIPES: RawRecipeItem[] = [
  // ─── 合规减脂菜谱（高蛋白、低脂、步骤完整、明确克重）───
  {
    name: '清蒸鲈鱼',
    description: '粤式经典清蒸鲈鱼，肉质细嫩鲜美，低脂高蛋白，保留食材本味。',
    ingredients: [
      { name: '鲈鱼', amount: '400g' },
      { name: '香葱', amount: '20g' },
      { name: '生姜', amount: '15g' },
      { name: '食用油', amount: '10ml' },
      { name: '生抽', amount: '15ml' },
      { name: '料酒', amount: '10ml' },
      { name: '食用盐', amount: '3g' }
    ],
    steps: [
      '鲈鱼清洗干净擦干水分，鱼身两侧各划两刀，抹少许盐和料酒腌制10分钟，葱姜切丝备用。',
      '盘底铺姜片葱段，放上鲈鱼，大火上汽后蒸8分钟，关火焖2分钟后倒掉蒸出的盘底腥水。',
      '在蒸好的鲈鱼表面铺上新鲜葱姜丝，淋入生抽，锅中烧热10ml食用油淋在葱丝上激发出香气即可出锅。'
    ]
  },
  {
    name: '蒜蓉西兰花',
    description: '经典低卡健康时蔬，富含膳食纤维与维生素，清爽脆嫩。',
    ingredients: [
      { name: '西兰花', amount: '300g' },
      { name: '大蒜', amount: '15g' },
      { name: '食用油', amount: '8ml' },
      { name: '食用盐', amount: '2g' }
    ],
    steps: [
      '西兰花切小朵用淡盐水浸泡洗净，大蒜切成细蒜蓉备用。',
      '锅中烧开水，加入少许盐，放入西兰花焯水50秒捞出沥干水分保持翠绿。',
      '热锅倒入8ml食用油，下入蒜蓉小火炒香，倒入焯好水的西兰花大火快速翻炒1分钟，加入盐调味出锅。'
    ]
  },
  {
    name: '凉拌鸡丝',
    description: '减脂期必备高蛋白饱腹轻食，鸡胸肉嫩而不柴，清爽可口。',
    ingredients: [
      { name: '鸡胸肉', amount: '250g' },
      { name: '黄瓜', amount: '150g' },
      { name: '大蒜', amount: '10g' },
      { name: '生抽', amount: '15ml' },
      { name: '陈醋', amount: '10ml' },
      { name: '料酒', amount: '10ml' },
      { name: '食用盐', amount: '2g' }
    ],
    steps: [
      '鸡胸肉冷水下锅，加入姜片与料酒大火煮沸，撇去浮沫后转中小火煮12分钟至全熟，捞出放凉撕成细丝。',
      '黄瓜洗净切成均匀细丝铺在盘底，放上撕好的鸡丝。',
      '碗中加入蒜泥、生抽、陈醋与少许盐调成凉拌汁，均匀淋在鸡丝上拌匀即可享用。'
    ]
  },
  {
    name: '白灼大虾',
    description: '原汁原味的鲜甜海虾，高蛋白极低脂肪，做法快手。',
    ingredients: [
      { name: '鲜虾', amount: '300g' },
      { name: '生姜', amount: '10g' },
      { name: '香葱', amount: '15g' },
      { name: '料酒', amount: '15ml' },
      { name: '生抽', amount: '10ml' },
      { name: '陈醋', amount: '5ml' }
    ],
    steps: [
      '鲜虾剪去虾须挑出虾线清洗干净，姜切片，葱打成葱结。',
      '锅中倒入适量清水，放入姜片、葱结和料酒大火烧开。',
      '水开后下入鲜虾大火煮约2分钟至虾身弯曲变红立即捞出，蘸少许生抽陈醋调成的蘸料食用。'
    ]
  },
  {
    name: '西红柿炒鸡蛋',
    description: '少油版国民家常菜，酸甜多汁下饭，蛋白质与番茄红素兼备。',
    ingredients: [
      { name: '西红柿', amount: '300g' },
      { name: '鸡蛋', amount: '150g' },
      { name: '食用油', amount: '10ml' },
      { name: '食用盐', amount: '3g' },
      { name: '香葱', amount: '10g' }
    ],
    steps: [
      '西红柿洗净切滚刀块，鸡蛋打入碗中加少许盐充分打散，香葱切碎。',
      '锅中倒入6ml食用油烧热，倒入蛋液快速滑炒至刚凝固立即盛出备用。',
      '锅内补入4ml食用油，下西红柿块翻炒至出红汤汁，倒回炒好的鸡蛋翻炒均匀，撒葱花和盐出锅。'
    ]
  },
  {
    name: '水煮牛肉片',
    description: '改良少油轻卡水煮牛肉，用优质牛里脊搭配丰富时蔬，香辣过瘾无负担。',
    ingredients: [
      { name: '牛肉', amount: '200g' },
      { name: '黄豆芽', amount: '150g' },
      { name: '芹菜', amount: '100g' },
      { name: '生抽', amount: '15ml' },
      { name: '食用油', amount: '10ml' },
      { name: '料酒', amount: '10ml' },
      { name: '食用盐', amount: '3g' }
    ],
    steps: [
      '牛里脊逆纹路切薄片，加入少许料酒、生抽腌制入味；豆芽与芹菜洗净焯水熟透铺入大碗底部。',
      '锅中烧热10ml食用油炒香少许葱姜辣椒，加入清水大火煮开，调入生抽与盐。',
      '将牛肉片逐片展开下入沸腾汤汁中，大火煮至变色熟透（约1分钟），连汤倒入铺好蔬菜的大碗中即可。'
    ]
  },
  {
    name: '清炒菜心',
    description: '广式健康绿叶蔬菜，简单水油快炒，清甜爽脆。',
    ingredients: [
      { name: '菜心', amount: '300g' },
      { name: '大蒜', amount: '10g' },
      { name: '食用油', amount: '6ml' },
      { name: '食用盐', amount: '2g' }
    ],
    steps: [
      '菜心洗净去老根沥干，大蒜拍碎切末。',
      '锅中热油6ml，爆香蒜末，倒入菜心大火猛火翻炒1分半钟至断生。',
      '加入2g食用盐快速翻匀即可出锅装盘。'
    ]
  },
  {
    name: '菌菇滑鸡片',
    description: '香菇与鸡胸肉的鲜美搭配，少油低脂，蛋白质丰富。',
    ingredients: [
      { name: '鸡胸肉', amount: '200g' },
      { name: '香菇', amount: '120g' },
      { name: '生抽', amount: '12ml' },
      { name: '食用油', amount: '8ml' },
      { name: '生姜', amount: '5g' },
      { name: '食用盐', amount: '2g' }
    ],
    steps: [
      '鸡胸肉切薄片用少许料酒腌制，香菇洗净去蒂切片，生姜切丝。',
      '锅内放8ml食用油炒香姜丝，下入鸡肉片滑炒至变色盛出。',
      '锅中倒入香菇片翻炒至变软出汁，重新倒回鸡胸肉片，淋入生抽与盐翻炒均匀出锅。'
    ]
  },

  // ─── 违规样本：应被精准过滤 ───
  {
    name: '脆皮炸鸡', // 油炸
    ingredients: [{ name: '鸡腿', amount: '300g' }, { name: '油炸粉', amount: '100g' }, { name: '食用油', amount: '500ml' }],
    steps: ['裹粉腌制', '大火深油油炸10分钟捞出']
  },
  {
    name: '红烧肉', // 红烧、五花肉(肥肉)
    ingredients: [{ name: '带皮五花肉', amount: '500g' }, { name: '冰糖', amount: '50g' }, { name: '老抽', amount: '30ml' }],
    steps: ['五花肉焯水切块', '炒糖色后慢火红烧1小时']
  },
  {
    name: '拔丝地瓜', // 高糖
    ingredients: [{ name: '地瓜', amount: '300g' }, { name: '白糖', amount: '150g' }, { name: '食用油', amount: '200ml' }],
    steps: ['地瓜油炸至熟', '熬糖浆至拉丝裹匀']
  },
  {
    name: '重油水煮鱼', // 重油
    ingredients: [{ name: '草鱼', amount: '500g' }, { name: '重油红油', amount: '150ml' }],
    steps: ['鱼片腌制', '宽油淋入表面']
  },
  {
    name: '糖醋里脊', // 高糖、油炸
    ingredients: [{ name: '猪里脊', amount: '250g' }, { name: '糖醋汁', amount: '80g' }],
    steps: ['里脊肉油炸至金黄', '裹上浓郁糖醋汁翻炒']
  },
  {
    name: '蒜泥白肉', // 肥肉
    ingredients: [{ name: '肥肉五花', amount: '300g' }, { name: '蒜泥', amount: '20g' }],
    steps: ['五花肉煮熟切片', '淋上蒜泥红油酱汁']
  },

  // ─── 格式不合规样本：缺少明确克重或步骤不足 ───
  {
    name: '简易拌黄瓜', // 无食材明确克重
    ingredients: [{ name: '黄瓜', amount: '适量' }, { name: '盐', amount: '少许' }],
    steps: ['黄瓜拍碎', '加盐调匀']
  },
  {
    name: '快手煎蛋', // steps.length < 2 (仅1步)
    ingredients: [{ name: '鸡蛋', amount: '50g' }, { name: '食用油', amount: '5ml' }],
    steps: ['热锅下油，打入鸡蛋煎熟即可。']
  },
  // ─── 异常结构（格式错误/缺失字段）：测试 try...catch 保护 ───
  null as any,
  {} as any,
  { name: '缺失步骤菜品', ingredients: [{ name: '鸡胸肉', amount: '200g' }] } as any,
  { steps: ['第一步', '第二步'] } as any
];

/**
 * 校验食材是否有明确克重 (包含 g, 克, kg, 千克, ml, 毫升 等重量/容量单位)
 */
function hasExplicitGramWeight(amountStr: string): boolean {
  if (!amountStr) return false;
  const trimmed = amountStr.trim().toLowerCase();
  // 排除模糊量词
  if (/(适量|少许|若干|酌量|适度|少许即可|几滴)/.test(trimmed)) {
    return false;
  }
  // 匹配明确克重或容量单位 (如 200g, 200克, 10ml, 15毫升, 0.5kg)
  return /[0-9.]+\s*(g|克|千克|kg|ml|毫升)/i.test(trimmed);
}

/**
 * 检查菜谱是否触碰油炸、重油、高糖、红烧、肥肉过滤规则
 */
function isExcludedRecipe(recipe: RawRecipeItem): { excluded: boolean; reason?: string } {
  const title = (recipe.name || recipe.title || '').trim();
  const desc = (recipe.description || '').trim();
  const ingredientsText = (recipe.ingredients || [])
    .map(i => (typeof i === 'string' ? i : `${i.name} ${i.amount || ''}`))
    .join(' ');
  const stepsText = (recipe.steps || []).join(' ');

  const fullHaystack = `${title} ${desc} ${ingredientsText} ${stepsText}`;

  for (const kw of EXCLUDE_KEYWORDS) {
    if (fullHaystack.includes(kw)) {
      return { excluded: true, reason: `匹配排除关键词「${kw}」` };
    }
  }

  return { excluded: false };
}

/**
 * 生成符合 FitBite 标准 Markdown 规范的菜谱文本
 */
function generateMarkdown(recipe: RawRecipeItem): string {
  const name = recipe.name || recipe.title || '未命名菜谱';
  const desc = recipe.description || `${name}是一道健康减脂家常菜，少油清淡，营养均衡。`;

  const ingLines: string[] = [];
  const calcLines: string[] = [];

  for (const ing of recipe.ingredients || []) {
    if (typeof ing === 'string') {
      ingLines.push(`- ${ing}`);
      calcLines.push(`- ${ing}`);
    } else {
      ingLines.push(`- ${ing.name}`);
      const amt = ing.amount || (ing.weight ? `${ing.weight}${ing.unit || 'g'}` : '适量');
      calcLines.push(`- ${ing.name} ${amt}`);
    }
  }

  const stepLines = (recipe.steps || []).map((step, idx) => `${idx + 1}. ${step.trim()}`);

  return `# ${name}

${desc}

## 必备原料和工具

${ingLines.join('\n')}

## 计算

每份：

${calcLines.join('\n')}

## 操作

${stepLines.join('\n')}
`;
}

/**
 * 主执行函数
 */
async function main() {
  console.log('====================================================');
  console.log('   FitBite 菜谱转换与减脂合规清洗脚本');
  console.log('====================================================');

  let rawList: any[] = [];

  console.log(`[FETCH] 正在拉取远程菜谱数据: ${SOURCE_URL}`);
  try {
    const res = await fetch(SOURCE_URL);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        rawList = data;
        console.log(`[SUCCESS] 成功拉取远程数据，共 ${rawList.length} 条菜谱`);
      } else {
        console.warn('[WARN] 远程返回非数组数据，切换至内置回退数据集');
        rawList = FALLBACK_RECIPES;
      }
    } else {
      console.warn(`[WARN] 远程请求失败 (HTTP ${res.status} ${res.statusText})，自动切换至内置可靠数据集`);
      rawList = FALLBACK_RECIPES;
    }
  } catch (err: any) {
    console.warn(`[WARN] 远程拉取网络异常: ${err.message}，自动切换至内置可靠数据集`);
    rawList = FALLBACK_RECIPES;
  }

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let totalProcessed = 0;
  let excludedCount = 0;
  let invalidWeightCount = 0;
  let invalidStepsCount = 0;
  let malformedCount = 0;
  let savedCount = 0;

  console.log(`\n[PROCESS] 开始执行健壮性保护遍历与减脂过滤（共 ${rawList.length} 条候选菜谱）...\n`);

  // 健壮性保护：遍历单条菜谱必须加 try...catch，缺少字段或格式错误直接跳过（continue），严禁发送未捕获异常主进程
  for (let idx = 0; idx < rawList.length; idx++) {
    try {
      const item = rawList[idx];

      // 健壮性前置校验：对象完整性检查
      if (!item || typeof item !== 'object') {
        malformedCount++;
        continue;
      }

      totalProcessed++;

      const title = (item.name || item.title || '').trim();
      if (!title) {
        malformedCount++;
        continue;
      }

      // 步骤 steps 校验：steps 必须为数组且 steps.length >= 2
      if (!Array.isArray(item.steps) || item.steps.length < 2) {
        console.log(`[SKIP] 《${title}》 — 步骤不足两步 (steps.length: ${Array.isArray(item.steps) ? item.steps.length : '无效'})`);
        invalidStepsCount++;
        continue;
      }

      // 原料 ingredients 校验
      if (!Array.isArray(item.ingredients) || item.ingredients.length === 0) {
        malformedCount++;
        continue;
      }

      // 过滤规则 1：清晰除油炸、重油、高糖、红烧、肥肉
      const filterResult = isExcludedRecipe(item);
      if (filterResult.excluded) {
        console.log(`[EXCLUDE] 《${title}》 — ${filterResult.reason}`);
        excludedCount++;
        continue;
      }

      // 过滤规则 2：有食材明确克重 (至少主要食材具备明确克重/容量数值与单位)
      const hasClearGrams = item.ingredients.some((ing: any) => {
        if (!ing) return false;
        if (typeof ing === 'string') return hasExplicitGramWeight(ing);
        const amtStr = ing.amount || (ing.weight ? `${ing.weight}${ing.unit || 'g'}` : '');
        return hasExplicitGramWeight(amtStr);
      });

      if (!hasClearGrams) {
        console.log(`[SKIP] 《${title}》 — 缺少食材明确克重`);
        invalidWeightCount++;
        continue;
      }

      // 合规菜谱输出落盘：生成标准 Markdown 写入 data/raw_recipes/*.md
      const mdContent = generateMarkdown(item);
      const safeSlug = title.replace(/\s+/g, '_').replace(/[^\u4e00-\u9fa5a-zA-Z0-9_-]/g, '');
      const filePath = path.join(OUTPUT_DIR, `${safeSlug}.md`);

      fs.writeFileSync(filePath, mdContent, 'utf-8');
      console.log(`[SAVED]  《${title}》 => ${path.relative(process.cwd(), filePath)}`);
      savedCount++;

    } catch (err: any) {
      // 捕获所有单条处理异常，严禁发送未捕获异常导致主进程崩溃
      malformedCount++;
      continue;
    }
  }

  console.log('\n====================================================');
  console.log('   📊 菜谱转换与过滤清洗统计报告');
  console.log('====================================================');
  console.log(`总遍历候选条数:     ${totalProcessed}`);
  console.log(`排除违规条数:       ${excludedCount} (油炸/重油/高糖/红烧/肥肉)`);
  console.log(`无明确克重跳过:     ${invalidWeightCount}`);
  console.log(`步骤不足(<2)跳过:   ${invalidStepsCount}`);
  console.log(`异常/缺字段跳过:    ${malformedCount}`);
  console.log(`----------------------------------------------------`);
  console.log(`✅ 最终成功转换并落盘: ${savedCount} 道减脂菜谱`);
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('[FATAL] 主流程异常:', err);
  process.exit(1);
});
