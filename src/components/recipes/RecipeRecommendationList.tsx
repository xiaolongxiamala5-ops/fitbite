import React, { useState, useMemo, useEffect } from 'react';
import { MatchGroups, MatchResult } from '../../core/matcher/types';
import { searchRecipesByKeyword } from '../../core/matcher/matcher';
import { useFridge } from '../../context/FridgeContext';
import { RecipeCard } from './RecipeCard';
import { RecipeDetailModal } from './RecipeDetailModal';

interface RecipeRecommendationListProps {
  matchGroups: MatchGroups;
}

export const DEFAULT_RECIPE_DISPLAY_LIMIT = 3;

type FilterMode = 'all' | 'ready' | 'lean' | 'favorites';

interface CollapsibleRecipeGridProps {
  list: MatchResult[];
  onSelect: (result: MatchResult) => void;
  initialLimit?: number;
}

export const CollapsibleRecipeGrid: React.FC<CollapsibleRecipeGridProps> = ({
  list,
  onSelect,
  initialLimit = DEFAULT_RECIPE_DISPLAY_LIMIT
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

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
          <span>{isExpanded ? '收起' : `查看更多（${list.length - initialLimit}）`}</span>
          <span className={`recipe-expand-icon ${isExpanded ? 'expanded' : ''}`}>
            ▾
          </span>
        </button>
      )}
    </div>
  );
};

/** 轻盈纤细的 SVG 放大镜图标（1.5px 线条，继承 currentColor）*/
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
  const stickySearchRef = React.useRef<HTMLInputElement>(null);
  const pageSearchRef = React.useRef<HTMLInputElement>(null);

  // 筛选标签定义（收藏数量动态）
  const FILTER_TABS: { value: FilterMode; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'ready', label: '✓ 现成可做' },
    { value: 'lean', label: '减脂优选' },
    { value: 'favorites', label: `❤️ 收藏${favoriteCount > 0 ? ` (${favoriteCount})` : ''}` }
  ];

  // 吸顶岛：监听实际滚动容器（当前页面由 window 承载滚动），scrollTop > 50 时折叠为 44px
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY ?? document.documentElement.scrollTop ?? 0;
      const collapsed = scrollTop > 50;
      setIsCollapsed(collapsed);
      // 回到顶部后自动收起吸顶搜索框，避免残留态
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

  // 统一聚合所有结果，并严格按"主食材决定可做性"进行重组与健康加权分流
  const { availableNow, oneStepAway, otherList, favoritedList } = useMemo(() => {
    const map = new Map<string, MatchResult>();
    [
      ...matchGroups.favoritedCanMake,
      ...matchGroups.canMakeNow,
      ...matchGroups.missingOneOrTwo,
      ...matchGroups.other
    ].forEach(item => {
      map.set(item.recipe.id, item);
    });

    let all = Array.from(map.values());

    // 搜索过滤（支持菜名、标签与上位词层级反查）
    if (searchKeyword.trim()) {
      all = searchRecipesByKeyword(searchKeyword, all);
    }

    // 收藏模式：仅展示已收藏菜谱（跨越可做/不可做边界，按收藏时间逆序暂不支持，改按 score 排）
    const favoriteSet = new Set(favorites);
    const favoritedAll = all
      .filter(item => favoriteSet.has(item.recipe.id))
      .sort((a, b) => {
        const aScore = a.healthAdjustedScore ?? a.matchScore;
        const bScore = b.healthAdjustedScore ?? b.matchScore;
        return bScore - aScore;
      });

    // 筛选标签过滤（收藏模式走独立分支，不再参与下方三栏分组）
    if (filterMode === 'ready') {
      all = all.filter(item => item.missingIngredients.length === 0);
    } else if (filterMode === 'lean') {
      all = all.filter(item => item.calorieTier === 'lean_choice');
    }

    // 核心护栏 1：主食材缺失为 0 时即为"现在就能做"，调料不参与阻断
    // 模块二：引入健康加权（lean_choice 优先加权，cheat_or_share 同度降权后移）
    const ready = all
      .filter(item => item.missingIngredients.length === 0)
      .sort((a, b) => {
        // 1. 收藏优先
        if (b.isFavorited !== a.isFavorited) {
          return (b.isFavorited ? 1 : 0) - (a.isFavorited ? 1 : 0);
        }
        // 2. 健康加权分优先：lean_choice 置顶，cheat_or_share 降权
        const aScore = a.healthAdjustedScore ?? a.matchScore;
        const bScore = b.healthAdjustedScore ?? b.matchScore;
        if (bScore !== aScore) {
          return bScore - aScore;
        }
        return 0;
      });

    // 主食材缺 1~2 样即为"就差一步"，调料不阻止
    const stepAway = all
      .filter(item => item.missingIngredients.length === 1 || item.missingIngredients.length === 2)
      .sort((a, b) => {
        if (a.missingIngredients.length !== b.missingIngredients.length) {
          return a.missingIngredients.length - b.missingIngredients.length;
        }
        const aScore = a.healthAdjustedScore ?? a.matchScore;
        const bScore = b.healthAdjustedScore ?? b.matchScore;
        return bScore - aScore;
      });

    // 主食材缺失 > 2 样归入其他
    const others = all.filter(item => item.missingIngredients.length > 2);

    return {
      availableNow: ready,
      oneStepAway: stepAway,
      otherList: others,
      favoritedList: favoritedAll
    };
  }, [matchGroups, searchKeyword, filterMode, favorites]);

  const renderSection = (enTitle: string, cnSubtitle: string, list: MatchResult[], badgeColor: string) => {
    if (list.length === 0) return null;
    return (
      <div className="recipe-section">
        <div className="recipe-section-heading">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <h3>{enTitle}</h3>
            <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--ios-forest)', fontFamily: 'var(--font-chinese-title)' }}>
              {cnSubtitle}
            </span>
          </div>
          <span className="recipe-count" style={{ backgroundColor: badgeColor }}>
            {list.length}
          </span>
        </div>
        <CollapsibleRecipeGrid
          list={list}
          onSelect={setSelectedResult}
        />
      </div>
    );
  };

  const totalActionable = availableNow.length + oneStepAway.length;

  return (
    <div className="recommendation-list">
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

      {/* ── 收藏模式独立渲染分支 ── */}
      {filterMode === 'favorites' ? (
        favoritedList.length > 0 ? (
          renderSection('My Favorites', '我的收藏', favoritedList, '#c45e2e')
        ) : (
          <div className="empty-recipes empty-favorites">
            <p className="empty-favorites-icon">🤍</p>
            <p className="empty-favorites-title">暂无收藏菜谱</p>
            <p className="empty-favorites-hint">
              点击卡片右上角的心形图标，把喜欢的家常菜存到这里吧
            </p>
          </div>
        )
      ) : (
        <>
          {renderSection('Available Now', '现在就能做', availableNow, '#2f765b')}
          {renderSection('One Step Away', '就差一步', oneStepAway, '#c97850')}

          {totalActionable === 0 && (
            <div className="empty-recipes">
              {searchKeyword ? `未找到与 "${searchKeyword}" 相关的菜谱，换个关键词试一试。` : '目前还没有满足条件的菜谱，在上方输入或勾选更多食材试一试。'}
            </div>
          )}

          {otherList.length > 0 && (
            <details className="other-recipes">
              <summary>查看其他暂不满足的菜谱 ({otherList.length})</summary>
              <div style={{ marginTop: '12px' }}>
                <CollapsibleRecipeGrid
                  list={otherList}
                  onSelect={setSelectedResult}
                />
              </div>
            </details>
          )}
        </>
      )}

      <RecipeDetailModal
        recipe={selectedResult?.recipe || null}
        matchResult={selectedResult}
        onClose={() => setSelectedResult(null)}
      />
    </div>
  );
};