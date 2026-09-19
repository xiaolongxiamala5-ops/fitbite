import React from 'react';
import { IngredientInput } from '../components/ingredients/IngredientInput';
import { IngredientTags } from '../components/ingredients/IngredientTags';
import { PantrySelector } from '../components/ingredients/PantrySelector';
import { RecipeRecommendationList } from '../components/recipes/RecipeRecommendationList';
import { useRecipeMatcher } from '../hooks/useRecipeMatcher';
import { useFridge } from '../context/FridgeContext';
import { getPantryItemName } from '../ui/pantryPresets';

export const HomeView: React.FC = () => {
  const matchGroups = useRecipeMatcher();
  const { fridgeIngredients, pantryIngredients } = useFridge();
  const allMatchResults = React.useMemo(() => {
    const map = new Map<string, any>();
    [
      ...matchGroups.favoritedCanMake,
      ...matchGroups.canMakeNow,
      ...matchGroups.missingOneOrTwo,
      ...matchGroups.other
    ].forEach(item => {
      map.set(item.recipe.id, item);
    });
    return Array.from(map.values());
  }, [matchGroups]);

  // 核心护栏 1：统一使用“主食材决定可做性”计算就绪道数
  const availableCount = React.useMemo(() => {
    return allMatchResults.filter(item => item.missingIngredients.length === 0).length;
  }, [allMatchResults]);

  const pantrySummary = pantryIngredients
    .map(id => getPantryItemName(id))
    .filter((name): name is string => Boolean(name && !name.startsWith('custom_pantry_') && !name.includes('_')))
    .slice(0, 3)
    .join(' · ');

  return (
    <div className="home-page">
      <div className="home-inner">
        {/* 顶部品牌与温馨标语 */}
        <header className="home-topbar">
          <div className="home-brand">
            <span className="brand-badge">F</span>
            <span className="brand-name">FitBite</span>
            <span className="brand-tagline">厨房助手</span>
          </div>
          <div className="home-topbar-note">Your Home Kitchen</div>
        </header>

        {/* 核心 Hero：根据你的冰箱食材，今天能做什么 */}
        <section className="today-card">
          <div className="today-title-block">
            <div className="today-label">
              ✨ 今日可做 · <span className="today-en-accent">Today</span> ✨
            </div>
            <p>根据你的冰箱食材</p>
            <div style={{ fontSize: '12px', color: '#4a6052', marginTop: '6px', fontWeight: 500 }}>
              今天为你推荐的家常好菜
            </div>
          </div>
          <div className="today-count">
            <strong>{availableCount}</strong>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#245e46' }}>道菜就绪</span>
            <span className="today-en-sub">Ready to Cook</span>
          </div>
        </section>

        {/* 冰箱食材面板 */}
        <section className="home-panel fridge-panel">
          <div className="home-section-heading">
            <div>
              <span className="section-en-label">My Fridge</span>
              <h2>我的冰箱</h2>
            </div>
            <b>{fridgeIngredients.length > 0 ? `已有 ${fridgeIngredients.length} 样食材` : '冰箱目前为空'}</b>
          </div>
          <IngredientInput />
          <IngredientTags />
        </section>

        {/* 常备调料面板 */}
        <section className="home-panel pantry-panel">
          <div className="home-section-heading compact">
            <div>
              <span className="section-en-label">Seasoning</span>
              <h2>常备调料</h2>
            </div>
            <b>{pantrySummary ? `已备：${pantrySummary}` : '尚未选择'}</b>
          </div>
          <PantrySelector />
        </section>

        {/* 推荐菜谱主区域 */}
        <main className="home-recipes">
          <div className="home-section-heading recipes-heading">
            <div>
              <span className="section-en-label">Recommendations</span>
              <h2>今天吃什么？</h2>
            </div>
            <b>按现有食材量身推荐</b>
          </div>
          <RecipeRecommendationList matchGroups={matchGroups} />
        </main>

        <footer className="home-footer">
          FitBite · 用现有食材做好每一餐
          <span className="footer-en-note">Cook with what you have</span>
        </footer>
      </div>
    </div>
  );
};