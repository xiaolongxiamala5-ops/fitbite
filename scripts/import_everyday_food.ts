#!/usr/bin/env tsx
/**
 * import_everyday_food.ts
 *
 * 从本地 EveryDay_Food (每日食光) 数据集导入减脂/增肌/营养菜谱。
 *
 * 约束:
 *   - 仅处理 data/external_sources/everyday_food.json 本地文件
 *   - 仅保留 fat-loss / muscle-gain / nutrition 分类
 *   - 食材必须含具体克重，步骤 >= 2，热量 > 0
 *   - 幂等：按 name 去重，不丢失已有菜谱
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import type { FitBiteRecipe, FitBiteIngredientItem, FitBitePantryItem, RecipeProvenance } from './pipeline/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── 配置 ───────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const SOURCE_FILE = 'data/external_sources/everyday_food.json';
const OUTPUT_FILE = 'data/recipes_imported.json';
const ALLOWED_CATEGORIES = new Set(['fat-loss', 'muscle-gain', 'nutrition']);

// ─── 食材名称 → Canonical ID 映射 ───────────────────────────────────────────

const INGREDIENT_MAP: Record<string, { id: string; name: string; cat: 'protein' | 'vegetable' | 'carb' | 'other' }> = {
  // === 蛋白质 ===
  '鸡胸肉':       { id: 'p_chicken_breast', name: '鸡胸肉', cat: 'protein' },
  '去皮鸡腿肉':   { id: 'p_chicken_leg', name: '去皮鸡腿肉', cat: 'protein' },
  '去骨鸡腿肉':   { id: 'p_chicken_leg', name: '去骨鸡腿肉', cat: 'protein' },
  '鸡腿肉':       { id: 'p_chicken_leg', name: '鸡腿肉', cat: 'protein' },
  '鸡块':         { id: 'p_chicken_breast', name: '鸡块', cat: 'protein' },
  '鸡蛋':         { id: 'p_egg', name: '鸡蛋', cat: 'protein' },
  '鸡蛋清':       { id: 'p_egg', name: '鸡蛋清', cat: 'protein' },
  '蛋清':         { id: 'p_egg', name: '蛋清', cat: 'protein' },
  '卤蛋':         { id: 'p_egg', name: '卤蛋', cat: 'protein' },
  '牛肉片':       { id: 'p_beef', name: '牛肉片', cat: 'protein' },
  '瘦牛肉片':     { id: 'p_beef', name: '瘦牛肉片', cat: 'protein' },
  '牛肉末':       { id: 'p_beef', name: '牛肉末', cat: 'protein' },
  '瘦牛肉末':     { id: 'p_beef', name: '瘦牛肉末', cat: 'protein' },
  '牛肉丸':       { id: 'p_beef', name: '牛肉丸', cat: 'protein' },
  '牛里脊':       { id: 'p_beef', name: '牛里脊', cat: 'protein' },
  '牛腱':         { id: 'p_beef', name: '牛腱', cat: 'protein' },
  '牛腱子':       { id: 'p_beef', name: '牛腱子', cat: 'protein' },
  '牛腩':         { id: 'p_beef', name: '牛腩', cat: 'protein' },
  '卤牛肉':       { id: 'p_beef', name: '卤牛肉', cat: 'protein' },
  '西冷牛排':     { id: 'p_beef', name: '西冷牛排', cat: 'protein' },
  '肥牛卷':       { id: 'p_beef', name: '肥牛卷', cat: 'protein' },
  '瘦肉丝':       { id: 'p_pork', name: '瘦肉丝', cat: 'protein' },
  '瘦肉片':       { id: 'p_pork', name: '瘦肉片', cat: 'protein' },
  '肉末':         { id: 'p_pork', name: '肉末', cat: 'protein' },
  '猪里脊末':     { id: 'p_pork', name: '猪里脊末', cat: 'protein' },
  '猪肋排':       { id: 'p_pork', name: '猪肋排', cat: 'protein' },
  '猪肝':         { id: 'p_pork', name: '猪肝', cat: 'protein' },
  '虾仁':         { id: 'p_shrimp', name: '虾仁', cat: 'protein' },
  '基围虾':       { id: 'p_shrimp', name: '基围虾', cat: 'protein' },
  '鲜虾':         { id: 'p_shrimp', name: '鲜虾', cat: 'protein' },
  '大虾':         { id: 'p_shrimp', name: '大虾', cat: 'protein' },
  '虾皮':         { id: 'p_shrimp', name: '虾皮', cat: 'protein' },
  '三文鱼':       { id: 'p_fish_salmon', name: '三文鱼', cat: 'protein' },
  '三文鱼排':     { id: 'p_fish_salmon', name: '三文鱼排', cat: 'protein' },
  '鳕鱼':         { id: 'p_fish_white', name: '鳕鱼', cat: 'protein' },
  '鳕鱼块':       { id: 'p_fish_white', name: '鳕鱼块', cat: 'protein' },
  '龙利鱼柳':     { id: 'p_fish_white', name: '龙利鱼柳', cat: 'protein' },
  '鲈鱼':         { id: 'p_fish_white', name: '鲈鱼', cat: 'protein' },
  '石斑鱼':       { id: 'p_fish_white', name: '石斑鱼', cat: 'protein' },
  '鲭鱼段':       { id: 'p_fish_white', name: '鲭鱼段', cat: 'protein' },
  '鲜鱿鱼':       { id: 'p_seafood', name: '鲜鱿鱼', cat: 'protein' },
  '羊排':         { id: 'p_lamb', name: '羊排', cat: 'protein' },
  '羊腿肉':       { id: 'p_lamb', name: '羊腿肉', cat: 'protein' },
  '北豆腐':       { id: 'p_tofu_firm', name: '北豆腐', cat: 'protein' },
  '嫩豆腐':       { id: 'p_tofu_silken', name: '嫩豆腐', cat: 'protein' },
  '千张':         { id: 'p_tofu', name: '千张', cat: 'protein' },
  '水浸金枪鱼罐头': { id: 'p_seafood', name: '水浸金枪鱼罐头', cat: 'protein' },
  '乳清蛋白粉':   { id: 'other_supplement', name: '乳清蛋白粉', cat: 'other' },
  // === 蔬菜 ===
  '西兰花':       { id: 'v_broccoli', name: '西兰花', cat: 'vegetable' },
  '菠菜':         { id: 'v_spinach', name: '菠菜', cat: 'vegetable' },
  '生菜':         { id: 'v_lettuce', name: '生菜', cat: 'vegetable' },
  '混合生菜':     { id: 'v_lettuce', name: '混合生菜', cat: 'vegetable' },
  '黄瓜':         { id: 'v_cucumber', name: '黄瓜', cat: 'vegetable' },
  '番茄':         { id: 'v_tomato', name: '番茄', cat: 'vegetable' },
  '小番茄':       { id: 'v_tomato', name: '小番茄', cat: 'vegetable' },
  '圣女果':       { id: 'v_tomato', name: '圣女果', cat: 'vegetable' },
  '洋葱':         { id: 'v_onion', name: '洋葱', cat: 'vegetable' },
  '胡萝卜':       { id: 'v_carrot', name: '胡萝卜', cat: 'vegetable' },
  '青椒':         { id: 'v_green_bell_pepper', name: '青椒', cat: 'vegetable' },
  '彩椒':         { id: 'v_green_bell_pepper', name: '彩椒', cat: 'vegetable' },
  '青红椒':       { id: 'v_green_bell_pepper', name: '青红椒', cat: 'vegetable' },
  '西葫芦':       { id: 'v_zucchini', name: '西葫芦', cat: 'vegetable' },
  '芦笋':         { id: 'v_asparagus', name: '芦笋', cat: 'vegetable' },
  '秋葵':         { id: 'v_okra', name: '秋葵', cat: 'vegetable' },
  '芹菜':         { id: 'v_celery', name: '芹菜', cat: 'vegetable' },
  '西芹':         { id: 'v_celery', name: '西芹', cat: 'vegetable' },
  '荷兰豆':       { id: 'v_snow_pea', name: '荷兰豆', cat: 'vegetable' },
  '豌豆':         { id: 'v_pea', name: '豌豆', cat: 'vegetable' },
  '青豆':         { id: 'v_pea', name: '青豆', cat: 'vegetable' },
  '玉米':         { id: 'v_corn', name: '玉米', cat: 'vegetable' },
  '玉米粒':       { id: 'v_corn', name: '玉米粒', cat: 'vegetable' },
  '香菇':         { id: 'v_shiitake', name: '香菇', cat: 'vegetable' },
  '鲜香菇':       { id: 'v_shiitake', name: '鲜香菇', cat: 'vegetable' },
  '干香菇':       { id: 'v_shiitake', name: '干香菇', cat: 'vegetable' },
  '金针菇':       { id: 'v_mushroom', name: '金针菇', cat: 'vegetable' },
  '口蘑':         { id: 'v_mushroom', name: '口蘑', cat: 'vegetable' },
  '白玉菇':       { id: 'v_mushroom', name: '白玉菇', cat: 'vegetable' },
  '木耳':         { id: 'v_wood_ear', name: '木耳', cat: 'vegetable' },
  '干木耳':       { id: 'v_wood_ear', name: '干木耳', cat: 'vegetable' },
  '泡发木耳':     { id: 'v_wood_ear', name: '泡发木耳', cat: 'vegetable' },
  '大白菜':       { id: 'v_cabbage', name: '大白菜', cat: 'vegetable' },
  '卷心菜':       { id: 'v_cabbage', name: '卷心菜', cat: 'vegetable' },
  '娃娃菜':       { id: 'v_baby_cabbage', name: '娃娃菜', cat: 'vegetable' },
  '菜心':         { id: 'v_choy_sum', name: '菜心', cat: 'vegetable' },
  '上海青':       { id: 'v_bok_choy', name: '上海青', cat: 'vegetable' },
  '小青菜':       { id: 'v_bok_choy', name: '小青菜', cat: 'vegetable' },
  '芥兰':         { id: 'v_kale', name: '芥兰', cat: 'vegetable' },
  '苦瓜':         { id: 'v_bitter_melon', name: '苦瓜', cat: 'vegetable' },
  '丝瓜':         { id: 'v_loofah', name: '丝瓜', cat: 'vegetable' },
  '冬瓜':         { id: 'v_winter_melon', name: '冬瓜', cat: 'vegetable' },
  '南瓜':         { id: 'v_pumpkin', name: '南瓜', cat: 'vegetable' },
  '紫甘蓝':       { id: 'v_purple_cabbage', name: '紫甘蓝', cat: 'vegetable' },
  '白萝卜':       { id: 'v_radish', name: '白萝卜', cat: 'vegetable' },
  '莲藕':         { id: 'v_lotus_root', name: '莲藕', cat: 'vegetable' },
  '山药':         { id: 'v_yam', name: '山药', cat: 'vegetable' },
  '毛豆荚':       { id: 'v_edamame', name: '毛豆荚', cat: 'vegetable' },
  '黄豆芽':       { id: 'v_sprouts', name: '黄豆芽', cat: 'vegetable' },
  '海带':         { id: 'v_seaweed', name: '海带', cat: 'vegetable' },
  '干海带':       { id: 'v_seaweed', name: '干海带', cat: 'vegetable' },
  '鲜百合':       { id: 'v_lily_bulb', name: '鲜百合', cat: 'vegetable' },
  // === 碳水 ===
  '米饭':         { id: 'c_rice', name: '米饭', cat: 'carb' },
  '糙米饭':       { id: 'c_brown_rice', name: '糙米饭', cat: 'carb' },
  '糙米':         { id: 'c_brown_rice', name: '糙米', cat: 'carb' },
  '杂粮饭':       { id: 'c_mixed_grain', name: '杂粮饭', cat: 'carb' },
  '藜麦饭':       { id: 'c_quinoa', name: '藜麦饭', cat: 'carb' },
  '藜麦':         { id: 'c_quinoa', name: '藜麦', cat: 'carb' },
  '燕麦片':       { id: 'c_oats', name: '燕麦片', cat: 'carb' },
  '即食燕麦片':   { id: 'c_oats', name: '即食燕麦片', cat: 'carb' },
  '燕麦米':       { id: 'c_oats', name: '燕麦米', cat: 'carb' },
  '全麦面包':     { id: 'c_bread', name: '全麦面包', cat: 'carb' },
  '全麦面粉':     { id: 'c_flour', name: '全麦面粉', cat: 'carb' },
  '全麦意面':     { id: 'c_pasta', name: '全麦意面', cat: 'carb' },
  '意面':         { id: 'c_pasta', name: '意面', cat: 'carb' },
  '荞麦面':       { id: 'c_noodles', name: '荞麦面', cat: 'carb' },
  '红薯':         { id: 'c_sweet_potato', name: '红薯', cat: 'carb' },
  '紫薯':         { id: 'c_sweet_potato', name: '紫薯', cat: 'carb' },
  '土豆':         { id: 'c_potato', name: '土豆', cat: 'carb' },
  '魔芋':         { id: 'c_konjac', name: '魔芋', cat: 'carb' },
  '魔芋丝':       { id: 'c_konjac', name: '魔芋丝', cat: 'carb' },
  '魔芋结':       { id: 'c_konjac', name: '魔芋结', cat: 'carb' },
  '魔芋面':       { id: 'c_konjac', name: '魔芋面', cat: 'carb' },
  '糯米粉':       { id: 'c_flour', name: '糯米粉', cat: 'carb' },
  '红薯粉丝':     { id: 'c_noodles', name: '红薯粉丝', cat: 'carb' },
  '黑米':         { id: 'c_rice', name: '黑米', cat: 'carb' },
  '小米':         { id: 'c_millet', name: '小米', cat: 'carb' },
  // === 其他/辅料 ===
  '牛油果':       { id: 'other_avocado', name: '牛油果', cat: 'other' },
  '柠檬':         { id: 'other_lemon', name: '柠檬', cat: 'other' },
  '柠檬汁':       { id: 'other_lemon', name: '柠檬汁', cat: 'other' },
  '苹果':         { id: 'other_apple', name: '苹果', cat: 'other' },
  '橙子':         { id: 'other_orange', name: '橙子', cat: 'other' },
  '猕猴桃':       { id: 'other_kiwi', name: '猕猴桃', cat: 'other' },
  '草莓':         { id: 'other_strawberry', name: '草莓', cat: 'other' },
  '蓝莓':         { id: 'other_blueberry', name: '蓝莓', cat: 'other' },
  '香蕉':         { id: 'other_banana', name: '香蕉', cat: 'other' },
  '原味酸奶':     { id: 'other_yogurt', name: '原味酸奶', cat: 'other' },
  '希腊酸奶':     { id: 'other_yogurt', name: '希腊酸奶', cat: 'other' },
  '无糖酸奶':     { id: 'other_yogurt', name: '无糖酸奶', cat: 'other' },
  '牛奶':         { id: 'other_milk', name: '牛奶', cat: 'other' },
  '芝士碎':       { id: 'other_cheese', name: '芝士碎', cat: 'other' },
  '低脂蛋黄酱':   { id: 'other_mayonnaise', name: '低脂蛋黄酱', cat: 'other' },
  '芝麻酱':       { id: 'other_sesame_paste', name: '芝麻酱', cat: 'other' },
  '味噌':         { id: 'other_miso', name: '味噌', cat: 'other' },
  '番茄膏':       { id: 'other_tomato_paste', name: '番茄膏', cat: 'other' },
  '番茄酱':       { id: 'other_ketchup', name: '番茄酱', cat: 'other' },
  '辣椒油':       { id: 'other_chili_oil', name: '辣椒油', cat: 'other' },
  '高汤':         { id: 'other_broth', name: '高汤', cat: 'other' },
  '熟鹰嘴豆':     { id: 'other_chickpea', name: '熟鹰嘴豆', cat: 'other' },
  '鹰嘴豆':       { id: 'other_chickpea', name: '鹰嘴豆', cat: 'other' },
  '枸杞':         { id: 'other_goji', name: '枸杞', cat: 'other' },
  '红枣':         { id: 'other_jujube', name: '红枣', cat: 'other' },
  '莲子':         { id: 'other_lotus_seed', name: '莲子', cat: 'other' },
  '干银耳':       { id: 'other_tremella', name: '干银耳', cat: 'other' },
  '海苔':         { id: 'other_nori', name: '海苔', cat: 'other' },
  '马蹄':         { id: 'other_water_chestnut', name: '马蹄', cat: 'other' },
  '蒸肉米粉':     { id: 'other_rice_flour', name: '蒸肉米粉', cat: 'other' },
  '南瓜籽':       { id: 'other_pumpkin_seed', name: '南瓜籽', cat: 'other' },
  '巴旦木':       { id: 'other_nut', name: '巴旦木', cat: 'other' },
  '核桃仁':       { id: 'other_walnut', name: '核桃仁', cat: 'other' },
  '核桃碎':       { id: 'other_walnut', name: '核桃碎', cat: 'other' },
  '花生碎':       { id: 'other_peanut', name: '花生碎', cat: 'other' },
  '白芝麻':       { id: 'other_sesame', name: '白芝麻', cat: 'other' },
  '黑芝麻':       { id: 'other_sesame', name: '黑芝麻', cat: 'other' },
};

// 调料 → pantry ID
const PANTRY_MAP: Record<string, { id: string; name: string }> = {
  '食用油':       { id: 'pantry_oil', name: '食用油' },
  '橄榄油':       { id: 'pantry_oil', name: '橄榄油' },
  '盐':           { id: 'pantry_salt', name: '盐' },
  '海盐':         { id: 'pantry_salt', name: '海盐' },
  '生抽':         { id: 'pantry_soy_sauce', name: '生抽' },
  '老抽':         { id: 'pantry_soy_sauce', name: '老抽' },
  '蚝油':         { id: 'preset_oyster_sauce', name: '蚝油' },
  '料酒':         { id: 'preset_cooking_wine', name: '料酒' },
  '醋':           { id: 'preset_vinegar', name: '醋' },
  '香醋':         { id: 'preset_vinegar', name: '香醋' },
  '白糖':         { id: 'preset_sugar', name: '白糖' },
  '冰糖':         { id: 'preset_sugar', name: '冰糖' },
  '蜂蜜':         { id: 'preset_sugar', name: '蜂蜜' },
  '淀粉':         { id: 'preset_starch', name: '淀粉' },
  '蒜':           { id: 'pantry_garlic', name: '蒜' },
  '蒜末':         { id: 'pantry_garlic', name: '蒜末' },
  '姜':           { id: 'preset_ginger', name: '姜' },
  '姜末':         { id: 'preset_ginger', name: '姜末' },
  '小葱':         { id: 'preset_scallion', name: '小葱' },
  '大葱':         { id: 'preset_scallion', name: '大葱' },
  '香菜':         { id: 'preset_coriander', name: '香菜' },
  '欧芹':         { id: 'other_herb', name: '欧芹' },
  '迷迭香':       { id: 'other_herb', name: '迷迭香' },
  '黑胡椒':       { id: 'pantry_black_pepper', name: '黑胡椒' },
  '黑胡椒碎':     { id: 'pantry_black_pepper', name: '黑胡椒碎' },
  '白胡椒':       { id: 'other_pepper', name: '白胡椒' },
  '白胡椒粉':     { id: 'other_pepper', name: '白胡椒粉' },
  '花椒':         { id: 'other_pepper', name: '花椒' },
  '干辣椒':       { id: 'other_chili', name: '干辣椒' },
  '小米辣':       { id: 'other_chili', name: '小米辣' },
  '辣椒粉':       { id: 'other_chili', name: '辣椒粉' },
  '郫县豆瓣酱':   { id: 'other_douban', name: '郫县豆瓣酱' },
  '香油':         { id: 'pantry_oil', name: '香油' },
  '蒸鱼豉油':     { id: 'pantry_soy_sauce', name: '蒸鱼豉油' },
  '照烧汁':       { id: 'other_sauce', name: '照烧汁' },
  '五香粉':       { id: 'other_spice', name: '五香粉' },
  '孜然粉':       { id: 'other_spice', name: '孜然粉' },
  '孜然粒':       { id: 'other_spice', name: '孜然粒' },
  '八角':         { id: 'other_spice', name: '八角' },
  '桂皮':         { id: 'other_spice', name: '桂皮' },
  '香叶':         { id: 'other_spice', name: '香叶' },
  '陈皮':         { id: 'other_spice', name: '陈皮' },
  '桂花':         { id: 'other_spice', name: '桂花' },
  '卤汁':         { id: 'other_sauce', name: '卤汁' },
  '椒盐':         { id: 'other_spice', name: '椒盐' },
  '清水':         { id: 'water', name: '清水' },
  '温水':         { id: 'water', name: '温水' },
};

// ─── 食材字符串解析 ─────────────────────────────────────────────────────────

/**
 * 解析 "鸡胸肉 150 克" / "小番茄 8 颗" / "黄瓜 半根" / "柠檬汁 半勺" 等
 * 返回 { name, amount, unit } 或 null
 */
function parseIngredientStr(raw: string): { name: string; amount?: number; unit?: string } | null {
  const cleaned = raw.replace(/[（(][^)）]*[)）]/g, '').trim(); // 去括号注释
  if (!cleaned) return null;

  // 跳过纯调料组合如 "生抽、蚝油 各 1 勺" → 取第一个
  const parts = cleaned.split(/[、，,]/);
  const primary = parts[0].trim();

  // 匹配: 名称 + 数量 + 单位
  // 支持: "150 克", "8 颗", "半根", "2 个", "1/2 个", "1 勺"
  const m = primary.match(
    /^(.+?)\s+([\d½¼¾⅓⅔/.\-]+)\s*(克|g|ml|毫升|个|只|颗|根|条|片|块|勺|匙|碗|把|朵|枝|包|盒|罐|袋|支|段|块|餐|份|人|中|大|小|适量|少许|半)?\s*$/
  );
  if (m) {
    const name = m[1].trim();
    let amount = parseChineseFraction(m[2]);
    const unit = m[3] || undefined;
    if (amount !== null && name) {
      return { name, amount, unit };
    }
    return { name };
  }

  // 仅名称无数值: "盐 适量", "黑胡椒 少许", "清水"
  const nameOnly = primary.replace(/\s*(适量|少许|少量|半勺|各\s*\d*\s*勺)?\s*$/, '').trim();
  if (nameOnly) {
    return { name: nameOnly };
  }
  return null;
}

function parseChineseFraction(s: string): number | null {
  const map: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.667 };
  if (map[s]) return map[s];
  if (s === '半') return 0.5;
  if (s.includes('/')) {
    const [n, d] = s.split('/').map(Number);
    if (d && !isNaN(n)) return n / d;
  }
  const num = parseFloat(s);
  return Number.isFinite(num) ? num : null;
}

// ─── 核心转换 ───────────────────────────────────────────────────────────────

function contentHash(obj: unknown): string {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s\-]+/g, '_')
    .replace(/[^a-z0-9_一-龥]/g, '')
    .slice(0, 60);
}

interface EveryDayFoodRecipe {
  id: string;
  name: string;
  category: string;
  cuisine: string;
  methods: string[];
  flavors: string[];
  kcal: number;
  desc: string;
  ingredients: string[];
  steps: string[];
  nutrition: { protein: number; carbs: number; fat: number };
  per100g: { protein: number; carbs: number; fat: number };
  servingSize: { amount: number; unit: string };
  mealType: string[];
}

function toFitBiteRecipe(r: EveryDayFoodRecipe): FitBiteRecipe | null {
  // 质量门槛
  if (!r.kcal || r.kcal <= 0) return null;
  if (!r.steps || r.steps.length < 2) return null;
  if (!r.ingredients || r.ingredients.length === 0) return null;

  const id = `imported_everyday-food_${slugify(r.name)}`;

  // 解析食材
  const mainIngredients: FitBiteIngredientItem[] = [];
  const pantryItems: FitBitePantryItem[] = [];

  for (const rawIng of r.ingredients) {
    const parsed = parseIngredientStr(rawIng);
    if (!parsed) continue;

    const lookupKey = parsed.name.replace(/\s+/g, '');
    const pantryMatch = PANTRY_MAP[lookupKey];

    if (pantryMatch) {
      pantryItems.push({
        id: pantryMatch.id,
        name: pantryMatch.name,
        amount: parsed.amount,
        unit: parsed.unit,
        originalRawText: rawIng,
      });
    } else {
      const ingMatch = INGREDIENT_MAP[lookupKey];
      if (ingMatch) {
        mainIngredients.push({
          id: ingMatch.id,
          name: ingMatch.name,
          amount: parsed.amount,
          unit: parsed.unit,
          originalRawText: rawIng,
        });
      } else {
        // 未映射食材 → other_ 前缀兜底
        mainIngredients.push({
          id: `other_${slugify(lookupKey)}`,
          name: lookupKey,
          amount: parsed.amount,
          unit: parsed.unit,
          originalRawText: rawIng,
        });
      }
    }
  }

  if (mainIngredients.length === 0) return null;

  const servings = r.servingSize?.amount ? Math.round(r.servingSize.amount / 200) || 1 : 1;

  const provenance: RecipeProvenance = {
    source: 'everyday-food',
    sourceId: r.id,
    sourceUrl: 'https://github.com/Jiayu-zheng1/EveryDay_Food',
    sourceFile: SOURCE_FILE,
    license: 'MIT',
    contentHash: contentHash(r),
  };

  // 分类映射
  const categoryMap: Record<string, string> = {
    'fat-loss': '减脂',
    'muscle-gain': '增肌',
    'nutrition': '营养',
  };

  const tags: string[] = [categoryMap[r.category] || r.category];
  if (r.mealType) tags.push(...r.mealType);

  return {
    id,
    name: r.name,
    category: categoryMap[r.category] || r.category,
    provenance,
    requiredIngredients: mainIngredients,
    pantryIngredients: pantryItems,
    instructions: r.steps,
    tags,
    cookingMethod: r.methods?.[0] || null,
    nutrition: {
      calories: r.kcal,
      protein: r.nutrition.protein,
      fat: r.nutrition.fat,
      carbs: r.nutrition.carbs,
      confidence: 'verified',
    },
    servings,
    difficulty: null,
    estimatedMinutes: null,
  };
}

// ─── 主流程 ─────────────────────────────────────────────────────────────────

function main() {
  const sourcePath = path.join(ROOT, SOURCE_FILE);
  const outputPath = path.join(ROOT, OUTPUT_FILE);

  if (!fs.existsSync(sourcePath)) {
    console.error(`[FATAL] 数据文件不存在: ${sourcePath}`);
    process.exit(1);
  }

  const allRecipes: EveryDayFoodRecipe[] = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║   EveryDay_Food 减脂增肌菜谱导入脚本                    ║`);
  console.log(`╚══════════════════════════════════════════════════════╝`);
  console.log(`\n📂 源文件: ${sourcePath}`);
  console.log(`📦 总菜谱数: ${allRecipes.length}`);

  // 1. 分类过滤
  const filtered = allRecipes.filter(r => ALLOWED_CATEGORIES.has(r.category));
  const catCount: Record<string, number> = {};
  filtered.forEach(r => { catCount[r.category] = (catCount[r.category] || 0) + 1; });
  console.log(`\n🎯 目标分类过滤后: ${filtered.length} 道`);
  Object.entries(catCount).forEach(([k, v]) => console.log(`   ${k}: ${v}`));

  // 2. 加载已有数据库
  let existing: FitBiteRecipe[] = [];
  if (fs.existsSync(outputPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      if (!Array.isArray(existing)) existing = [];
    } catch { existing = []; }
  }
  const existingNames = new Set(existing.map(r => r.name));
  console.log(`\n📦 当前数据库已有: ${existing.length} 道`);

  // 3. 转换
  let converted = 0;
  let skippedQuality = 0;
  let skippedDuplicate = 0;
  const newRecipes: FitBiteRecipe[] = [];

  for (const r of filtered) {
    const fitBite = toFitBiteRecipe(r);
    if (!fitBite) {
      skippedQuality++;
      console.log(`[SKIP] ${r.name} — 质量不达标`);
      continue;
    }
    if (existingNames.has(fitBite.name)) {
      skippedDuplicate++;
      continue;
    }
    newRecipes.push(fitBite);
    converted++;
    console.log(`[PASS] ${fitBite.name} | ${fitBite.nutrition!.calories} kcal | P:${fitBite.nutrition!.protein}g F:${fitBite.nutrition!.fat}g C:${fitBite.nutrition!.carbs}g`);
  }

  // 4. 合并（按 id 去重，绝不丢失）
  const recipeMap = new Map<string, FitBiteRecipe>();
  for (const r of existing) recipeMap.set(r.id, r);
  for (const r of newRecipes) recipeMap.set(r.id, r);
  const merged = Array.from(recipeMap.values());

  fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2), 'utf-8');

  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║                  📊 导入统计报表                      ║`);
  console.log(`╠══════════════════════════════════════════════════════╣`);
  console.log(`║  源分类过滤:  ${String(filtered.length).padEnd(37)}║`);
  console.log(`║  质量不达标:  ${String(skippedQuality).padEnd(37)}║`);
  console.log(`║  重复跳过:    ${String(skippedDuplicate).padEnd(37)}║`);
  console.log(`║  ✅ 新增成功: ${String(converted).padEnd(37)}║`);
  console.log(`║  📦 数据库总量: ${String(merged.length).padEnd(35)}║`);
  console.log(`╚══════════════════════════════════════════════════════╝\n`);
}

main();
