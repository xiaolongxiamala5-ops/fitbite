import fs from 'fs';

async function scan() {
  const res = await fetch('https://api.github.com/repos/Anduin2017/HowToCook/git/trees/master?recursive=1', {
    headers: { 'User-Agent': 'FitBite-Scanner' }
  });
  if (!res.ok) {
    console.error('Failed to fetch tree:', res.status, res.statusText);
    return;
  }
  const data = await res.json();
  const allDishes: Array<{ path: string; sha: string; size: number }> = data.tree.filter(
    (i: any) => i.path.startsWith('dishes/') && i.path.endsWith('.md')
  );

  console.log('Total dishes in HowToCook:', allDishes.length);

  // Exclude keywords for heavy/fat/sweet
  const excludeKeywords = [
    '油炸', '炸', '拔丝', '红烧肉', '糖醋', '甜品', '奶茶', '重油', '脆皮',
    '红烧猪蹄', '烤串', '卤肉饭', '扣肉', '东坡肉', '肥肠', '排骨', '五花肉',
    '蛋糕', '饼干', '甜汤', '布丁', '双皮奶', '杨枝甘露', '芋圆', '酥',
    '臭豆腐', '炸酱面', '红烧排骨', '糖油粑粑'
  ];

  const allowedDirs = [
    'dishes/aquatic/',
    'dishes/meat_dish/',
    'dishes/vegetable_dish/',
    'dishes/soup/',
    'dishes/breakfast/'
  ];

  // Candidates
  const candidates = allDishes.filter(d => {
    if (!allowedDirs.some(dir => d.path.startsWith(dir))) return false;
    const name = d.path.split('/').pop()!.replace('.md', '');
    if (excludeKeywords.some(kw => name.includes(kw))) return false;
    return true;
  });

  console.log('Filtered candidates count:', candidates.length);

  const byDir: Record<string, number> = {};
  for (const c of candidates) {
    const dir = c.path.split('/')[1];
    byDir[dir] = (byDir[dir] || 0) + 1;
  }
  console.log('By category:', byDir);

  // Group by category and print names
  const grouped: Record<string, string[]> = {};
  for (const c of candidates) {
    const dir = c.path.split('/')[1];
    if (!grouped[dir]) grouped[dir] = [];
    grouped[dir].push(c.path);
  }

  for (const [dir, items] of Object.entries(grouped)) {
    console.log(`\n--- ${dir} (${items.length}) ---`);
    console.log(items.map(p => p.split('/').pop()!.replace('.md', '')).join(', '));
  }

  // Save candidates list to a json for reference
  fs.writeFileSync('data/howtocook_candidates.json', JSON.stringify(candidates, null, 2), 'utf-8');
}

scan().catch(console.error);
