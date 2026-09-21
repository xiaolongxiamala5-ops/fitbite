import { resolveAlias } from '../src/core/ingredients/aliasResolver';

const list = ['鱼', '虾', '鸡蛋', '豆腐', '番茄', '西红柿', '鸡胸肉', '鸡翅', '猪肉', '牛肉', '土豆', '黄瓜', '西兰花', '洋葱'];
list.forEach(item => {
  const res = resolveAlias(item);
  console.log(item, '->', res ? `${res.id} (${res.name})` : 'NULL (未识别)');
});
