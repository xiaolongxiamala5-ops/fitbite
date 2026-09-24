# FitBite 🥗

智能减脂菜谱推荐应用 — 基于食材匹配的个性化健康饮食方案。

## 功能特性

- **智能食材匹配** — 根据冰箱里的食材推荐可做的菜
- **营养数据** — 每道菜含热量、蛋白质、脂肪、碳水化合物
- **减脂/增肌分类** — 自动标注菜谱适用场景
- **263 道中文菜谱** — 覆盖家常菜、减脂餐、增肌餐、营养食疗
- **本地优先** — 无需服务器，数据全部本地存储

## 数据来源

| 来源 | 数量 | 说明 |
|------|------|------|
| [HowToCook](https://github.com/Anduin2017/HowToCook) | 114 道 | 开源家常菜谱 (CC-BY-4.0) |
| [EveryDay_Food](https://github.com/Jiayu-zheng1/EveryDay_Food) | 149 道 | 减脂增肌营养餐 (MIT) |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试 (190 项)
npm test

# 导入菜谱数据
npm run batch:import
```

## 技术栈

- React 18 + TypeScript
- Vite
- Vitest
- 菜谱解析管线 (Parse → Normalize → Validate)
- 双轨营养计算引擎 (确定性单位 + 校准厨房单位)

## 项目结构

```
src/                  # 前端应用
  components/         # UI 组件
  views/              # 页面视图
  core/               # 核心匹配逻辑
  data/               # 菜谱数据
shared/               # 共享模块
  ingredients/        # 食材规范目录
  nutrition/          # 营养计算引擎
scripts/              # 数据管线脚本
  pipeline/           # 解析/规范化/校验
  nutrition/          # 营养评估
data/                 # 菜谱数据库
  raw_recipes/        # 原始菜谱文件
  recipes_imported.json  # 导入后的结构化数据
tests/                # 测试套件
```

## 开源协议

本项目代码基于 MIT 协议开源。菜谱数据来自各原始仓库，遵循其各自的许可证。
