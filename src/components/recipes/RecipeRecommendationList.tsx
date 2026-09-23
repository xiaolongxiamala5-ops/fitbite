import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MatchGroups, MatchResult } from '../../core/matcher/types';
import { searchRecipesByKeyword } from '../../core/matcher/matcher';
import { useFridge } from '../../context/FridgeContext';
import { RecipeCard } from './RecipeCard';
import { RecipeDetailModal } from './RecipeDetailModal';

interface RecipeRecommendationListProps {
  matchGroups: MatchGroups;
}

// 方案 3：精选置顶 + 步进展开核心常量
export const INITIAL_VISIBLE_COUNT = 5;
export const PAGE_STEP = 6;
export const DEFAULT_RECIPE_DISPLAY_LIMIT = 3; // 兼容既有生产套件单测引用

type FilterMode = 'all' | 'ready' | 'lean' | 'favorites';

interface CollapsibleRecipeGridProps {
  list: MatchResult[];
  onSelect: (result: MatchResult) => void;
  initialLimit?: number;
}

/**
 * 兼容导出：可折叠网格组件
 */
export const CollapsibleRecipeGrid: React.FC<CollapsibleRecipeGridProps> = ({
  list,
  onSelect,
  initialLimit = DEFAULT_RECIPE_DISPLAY_LIMIT
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasMore = list.length > initialLimit;
  const visibleList = isExpanded ? list : list.slice(0, initialLimit);

  const handleToggle = () => {
    if (isExpanded) {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    setIsExpanded(prev => !prev);
  };

  return (
    <div ref={containerRef} className="collapsible-recipe-section">
      <div className="recipe-grid">
        {visibleList.map((item, index) => (
          <RecipeCard
            key={item.recipe.id}
            result={item}
            onSelect={() => onSelect(item)}
            className={index >= initialLimit ? 'recipe-card-animated' : ''}
          />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className="recipe-expand-btn"
          onClick={handleToggle}
        >
          <span>{isExpanded ? '收起' : `查看全部（${list.length}）`}</span>
          <span className={`recipe-expand-icon ${isExpanded ? 'expanded' : ''}`}>
            ▾
          </span>
        </button>
      )}
    </div>
  );
};

/**
 * 轻量精致的内联 SVG 放大镜图标
 */
const SearchIcon: React.FC = () => (
  <svg
    className="island-search-icon-svg"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="8.5" cy="8.5" r="5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12.5 12.5L16.5 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const RecipeRecommendationList: React.FC<RecipeRecommendationListProps> = ({ matchGroups }) => {
  const { favorites } = useFridge();
  const favoriteCount = favorites.length;

  const [selectedResult, setSelectedResult] = useState<MatchResult | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 吸顶态内联搜索展开状态（不触发任何滚动，原地展开）
  const [isStickySearchOpen, setIsStickySearchOpen] = useState(false);
  const stickySearchRef = useRef<HTMLInputElement>(null);
  const pageSearchRef = useRef<HTMLInputElement>(null);

  // 方案 3：分页可见数量状态与列表容器引用
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // 筛选标签定义（收藏数量动态）
  const FILTER_TABS: { value: FilterMode; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'ready', label: '✓ 现成可做' },
    { value: 'lean', label: '减脂优选' },
    { value: 'favorites', label: `❤️ 收藏${favoriteCount > 0 ? ` (${favoriteCount})` : ''}` }
  ];

  // 状态重置机制：当用户切换顶部筛选 Tab、输入搜索词或匹配结果变动时，自动将 visibleCount 重置回 INITIAL_VISIBLE_COUNT
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [filterMode, searchKeyword, matchGroups]);

  // 吸顶岛：监听滚动容器，scrollTop > 50 时折叠为 44px
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY ?? document.documentElement.scrollTop ?? 0;
      const collapsed = scrollTop > 50;
      setIsCollapsed(collapsed);
      if (!collapsed) setIsStickySearchOpen(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 点击放大镜：原地展开吸顶搜索框，不触发任何滚动
  const handleOpenStickySearch = () => {
    setIsStickySearchOpen(true);
    requestAnimationFrame(() => stickySearchRef.current?.focus());
  };

  // 取消吸顶搜索：清空关键词，收起搜索框，恢复标签栏
  const handleCloseStickySearch = () => {
    setSearchKeyword('');
    setIsStickySearchOpen(false);
  };

  // 统一聚合所有结果，并严格按"主食材决定可做性"重组、排序与分流
  const filteredRecipes = useMemo(() => {
    const map = new Map<string, MatchResult>();
    [
      ...matchGroups.favoritedCanMake,
      ...matchGroups.canMakeNow,
      ...matchGroups.missingOneOrTwo,
      ...matchGroups.other
    ].forEach(item => {
      map.set(item.recipe.id, item);
    });

    let list = Array.from(map.values());

    // 搜索过滤（支持菜名、标签与上位词层级反查）
    if (searchKeyword.trim()) {
      list = searchRecipesByKeyword(searchKeyword, list);
    }

    // 筛选标签过滤
    if (filterMode === 'favorites') {
      const favoriteSet = new Set(favorites);
      list = list.filter(item => favoriteSet.has(item.recipe.id));
    } else if (filterMode === 'ready') {
      list = list.filter(item => item.missingIngredients.length === 0);
    } else if (filterMode === 'lean') {
      list = list.filter(item => item.calorieTier === 'lean_choice');
    }

    // 综合加权排序（精选置顶排序流）：
    // 1. 收藏优先
    // 2. 主食材可做性优先 (缺0样 > 缺1-2样 > 缺更多)
    // 3. 健康加权分与匹配分优先（减脂优选置顶 +15，高能分食 -30% 降权后移）
    const favoriteSet = new Set(favorites);
    list.sort((a, b) => {
      // 1. 收藏优先
      const aFav = favoriteSet.has(a.recipe.id);
      const bFav = favoriteSet.has(b.recipe.id);
      if (bFav !== aFav) {
        return (bFav ? 1 : 0) - (aFav ? 1 : 0);
      }

      // 2. 主食材可做性优先
      if (a.missingIngredients.length !== b.missingIngredients.length) {
        return a.missingIngredients.length - b.missingIngredients.length;
      }

      // 3. 健康加权分优先
      const aScore = a.healthAdjustedScore ?? a.matchScore;
      const bScore = b.healthAdjustedScore ?? b.matchScore;
      return bScore - aScore;
    });

    return list;
  }, [matchGroups, searchKeyword, filterMode, favorites]);

  // 数据切片渲染：实际渲染在列表中的菜谱
  const displayedRecipes = filteredRecipes.slice(0, visibleCount);
  const remaining = filteredRecipes.length - visibleCount;
  const showPaginationBtn = filteredRecipes.length > INITIAL_VISIBLE_COUNT;
  const isAllExpanded = visibleCount >= filteredRecipes.length;

  return (
    <div ref={listContainerRef} className="recommendation-list">
      {/* 44px 毛玻璃悬浮双轴吸顶岛：展开态=搜索框+标签，折叠-标签态=横滑胶囊+放大镜，折叠-搜索态=原位输入框 */}
      <div className={`recommendation-island-wrap ${isCollapsed ? 'is-collapsed' : ''}`}>

        {/* ── 展开态：完整搜索框 ── */}
        {!isCollapsed && (
          <div className="recipe-search-bar">
            <input
              ref={pageSearchRef}
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="🔍 搜索菜谱名或食材（如：鱼、豆腐、五花肉...）"
              className="recipe-search-input"
            />
            {searchKeyword && (
              <button
                type="button"
                className="recipe-search-clear"
                onClick={() => setSearchKeyword('')}
                aria-label="清空搜索"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* ── 折叠-搜索激活态：原位紧凑输入框 + 取消 ── */}
        {isCollapsed && isStickySearchOpen && (
          <div className="island-inline-search">
            <input
              ref={stickySearchRef}
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="搜索菜谱名或食材…"
              className="island-inline-search-input"
            />
            <button
              type="button"
              className="island-inline-search-cancel"
              onClick={handleCloseStickySearch}
              aria-label="取消搜索"
            >
              取消
            </button>
          </div>
        )}

        {/* ── 筛选标签胶囊（折叠搜索激活时隐藏）── */}
        {!(isCollapsed && isStickySearchOpen) && (
          <div className="island-tabs-scroll" aria-label="筛选推荐">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.value}
                type="button"
                aria-pressed={filterMode === tab.value}
                className={`island-filter-tab ${filterMode === tab.value ? 'active' : ''}`}
                onClick={() => setFilterMode(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ── 折叠-标签态：SVG 放大镜按钮（搜索激活时隐藏）── */}
        {isCollapsed && !isStickySearchOpen && (
          <button
            type="button"
            className="island-mini-search-btn"
            onClick={handleOpenStickySearch}
            aria-label="展开搜索"
          >
            <SearchIcon />
          </button>
        )}
      </div>

      {/* ── 推荐列表主体 ── */}
      {filteredRecipes.length === 0 ? (
        filterMode === 'favorites' ? (
          <div className="empty-recipes empty-favorites">
            <p className="empty-favorites-icon">🤍</p>
            <p className="empty-favorites-title">暂无收藏菜谱</p>
            <p className="empty-favorites-hint">
              点击卡片右侧心形图标，把喜欢的家常菜存到这里吧
            </p>
          </div>
        ) : (
          <div className="empty-recipes">
            {searchKeyword
              ? `未找到与 "${searchKeyword}" 相关的菜谱，换个关键词试一试。`
              : '目前还没有满足条件的菜谱，在上方输入或勾选更多食材试一试。'}
          </div>
        )
      ) : (
        <div className="collapsible-recipe-section">
          {/* 单行紧凑推荐网格 (Dense Rows) */}
          <div className="recipe-grid">
            {displayedRecipes.map((item, index) => (
              <RecipeCard
                key={item.recipe.id}
                result={item}
                onSelect={() => setSelectedResult(item)}
                className={index >= INITIAL_VISIBLE_COUNT ? 'recipe-card-animated' : ''}
              />
            ))}
          </div>

          {/* 方案 3：底部按钮文案与步进交互 */}
          {showPaginationBtn && (
            <div className="recipe-pagination-wrap">
              <button
                type="button"
                className="recipe-pagination-btn"
                onClick={() => {
                  if (!isAllExpanded) {
                    setVisibleCount(prev => Math.min(prev + PAGE_STEP, filteredRecipes.length));
                  } else {
                    setVisibleCount(INITIAL_VISIBLE_COUNT);
                    listContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                <span>
                  {!isAllExpanded
                    ? `查看更多 (剩余 ${remaining} 道)`
                    : '收起至精选'}
                </span>
                <span className="recipe-pagination-icon">
                  {!isAllExpanded ? '▾' : '▴'}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 菜谱详情弹窗 (Portal 挂载到 document.body) */}
      <RecipeDetailModal
        recipe={selectedResult?.recipe || null}
        matchResult={selectedResult}
        onClose={() => setSelectedResult(null)}
      />
    </div>
  );
};