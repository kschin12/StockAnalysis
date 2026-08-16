import React, { useState } from 'react';
import type { Stock, FilterState, CustomPreset, QuantMetrics } from '../../types/stock';
import { FilterPanel } from './FilterPanel';
import { StockTable } from './StockTable';
import { DynamicQuantGuide } from './DynamicQuantGuide';
import { CollectorSettingsModal } from './CollectorSettingsModal';
import { Sliders } from 'lucide-react';

interface ScreenerViewProps {
  stocks: Stock[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  presets: CustomPreset[];
  watchlist: string[];
  quantMetrics: QuantMetrics | null;
  onApplyPreset: (preset: CustomPreset) => void;
  onSavePreset: (name: string, description: string) => void;
  onDeletePreset: (id: string) => void;
  onResetFilters: () => void;
  onToggleWatchlist: (symbol: string) => void;
  onSelectStock: (symbol: string) => void;
  onRefreshData?: () => Promise<void>;
}

export const ScreenerView: React.FC<ScreenerViewProps> = ({
  stocks,
  filters,
  setFilters,
  presets,
  watchlist,
  quantMetrics,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onResetFilters,
  onToggleWatchlist,
  onSelectStock,
  onRefreshData
}) => {
  // 동적 추천 기준 원클릭 주입 (기존 필터와 누적/중복되지 않도록 클린 리셋 후 적용)
  const handleApplyDynamicFilters = (partial: Partial<FilterState>) => {
    setFilters({
      market: 'ALL',
      assetType: 'ALL',
      minRoe: '',
      maxPer: '',
      maxPbr: '',
      minDividend: '',
      minMarketCap: '',
      maxDebtRatio: '',
      minRsi: '',
      maxRsi: '',
      searchQuery: filters.searchQuery || '',
      ...partial
    });
  };

  const [activeCategory, setActiveCategory] = useState<'all' | 'market_cap' | 'volume' | 'rise' | 'fall' | 'watchlist'>('market_cap');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 필터 적용 로직 (카테고리 선택 시 즉시 정렬 및 조건별 상위 추출)
  const getCategoryBaseStocks = () => {
    // 1. 시장(Market) 분기 필터링 (KOSPI, KOSDAQ, US 정확 분기)
    let pool = stocks;
    if (filters.market === 'US') {
      pool = pool.filter(s => s.market === 'US' || s.currency === 'USD');
    } else if (filters.market === 'KOSPI') {
      pool = pool.filter(s => s.market === 'KOSPI');
    } else if (filters.market === 'KOSDAQ') {
      pool = pool.filter(s => s.market === 'KOSDAQ');
    } else if (filters.market === 'KRX') {
      pool = pool.filter(s => s.market === 'KOSPI' || s.market === 'KOSDAQ' || s.currency === 'KRW');
    }

    if (activeCategory === 'watchlist') {
      return pool.filter(s => watchlist.includes(s.symbol));
    }
    if (activeCategory === 'market_cap') {
      const sorted = [...pool].sort((a, b) => (Number(b.marketCap) || 0) - (Number(a.marketCap) || 0));
      const topCount = Math.max(20, Math.ceil(sorted.length * 0.3));
      return sorted.slice(0, topCount);
    }
    if (activeCategory === 'volume') {
      const sorted = [...pool].sort((a, b) => (Number(b.volume) || 0) - (Number(a.volume) || 0));
      const topCount = Math.max(20, Math.ceil(sorted.length * 0.3));
      return sorted.slice(0, topCount);
    }
    if (activeCategory === 'rise') {
      const sorted = [...pool].sort((a, b) => (Number(b.changeRate) || 0) - (Number(a.changeRate) || 0));
      return sorted.slice(0, 20);
    }
    if (activeCategory === 'fall') {
      const sorted = [...pool].sort((a, b) => (Number(a.changeRate) || 0) - (Number(b.changeRate) || 0));
      return sorted.slice(0, 20);
    }
    return pool;
  };

  const baseStocks = getCategoryBaseStocks();
  const filteredStocks = baseStocks.filter(s => {
    // 1. Search Query (검색어가 입력되었을 때만 이름/코드 일치 검사)
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchName = s.name ? s.name.toLowerCase().includes(q) : false;
      const matchSymbol = s.symbol ? s.symbol.toLowerCase().includes(q) : false;
      if (!matchName && !matchSymbol) return false;
    }

    // 2. 카테고리 탭(급등주, 급락주, 시총상위, 거래량상위, 관심종목)에서는 상위 종목 100% 즉시 반환
    if (activeCategory !== 'all') {
      return true;
    }

    // 3. '전체 종목' 커스텀 스크리닝 시에만 자산타입 및 세부 정량 퀀트 지표 필터링
    if (filters.assetType !== 'ALL' && s.assetType && s.assetType !== filters.assetType) {
      return false;
    }
    if (filters.maxPer !== '' && s.per !== null && s.per !== undefined && s.per > Number(filters.maxPer)) {
      return false;
    }
    if (filters.maxPbr !== '' && s.pbr !== null && s.pbr !== undefined && s.pbr > Number(filters.maxPbr)) {
      return false;
    }
    if (filters.minRoe !== '' && (s.roe === null || s.roe === undefined || s.roe < Number(filters.minRoe))) {
      return false;
    }
    if (filters.minDividend !== '' && (s.dividendYield === null || s.dividendYield === undefined || s.dividendYield < Number(filters.minDividend))) {
      return false;
    }
    if (filters.maxDebtRatio !== '' && s.debtRatio !== null && s.debtRatio !== undefined && s.debtRatio > Number(filters.maxDebtRatio)) {
      return false;
    }

    return true;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 2-Column Sidebar Layout */}
      <div className="screener-grid-layout">
        {/* Left Column: Dynamic Quant Guide & Filter Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Dynamic Quant Strategy Guide Card */}
          <DynamicQuantGuide
            metrics={quantMetrics}
            onApplyDynamicFilters={handleApplyDynamicFilters}
          />

          {/* 2. Screener Filter Panel */}
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            presets={presets}
            onApplyPreset={onApplyPreset}
            onSavePreset={onSavePreset}
            onDeletePreset={onDeletePreset}
            onResetFilters={onResetFilters}
          />
        </div>

        {/* Right Main Column: Category Tabs, Market Filter, Watchlist Input & Results Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {/* 동적 디스커버리 탭 메뉴 & 시장 선택 바 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '4px 2px' }}>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                className={`btn ${activeCategory === 'market_cap' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveCategory('market_cap')}
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                시총 상위
              </button>
              <button 
                className={`btn ${activeCategory === 'volume' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveCategory('volume')}
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                거래량 상위
              </button>
              <button 
                className={`btn ${activeCategory === 'rise' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveCategory('rise')}
                style={{ fontSize: '0.82rem', padding: '6px 12px', color: activeCategory === 'rise' ? '#fff' : 'var(--color-up)' }}
              >
                급등주
              </button>
              <button 
                className={`btn ${activeCategory === 'fall' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveCategory('fall')}
                style={{ fontSize: '0.82rem', padding: '6px 12px', color: activeCategory === 'fall' ? '#fff' : 'var(--color-down)' }}
              >
                급락주
              </button>
              <button 
                className={`btn ${activeCategory === 'watchlist' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveCategory('watchlist')}
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                관심종목
              </button>
              <button 
                className={`btn ${activeCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveCategory('all')}
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                전체 종목
              </button>
            </div>

            {/* 우측 컨트롤: 시장 전환 퀵 버튼 & 수집 조건 커스텀 버튼 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: 'var(--text-muted)', marginRight: '2px' }}>시장:</span>
                <button
                  className={`badge ${filters.market === 'ALL' ? 'badge-tag' : ''}`}
                  style={{ cursor: 'pointer', padding: '4px 8px', border: filters.market === 'ALL' ? '1px solid var(--color-brand)' : '1px solid var(--border-subtle)', background: filters.market === 'ALL' ? 'rgba(99, 102, 241, 0.2)' : 'transparent', color: filters.market === 'ALL' ? '#fff' : 'var(--text-secondary)' }}
                  onClick={() => setFilters(prev => ({ ...prev, market: 'ALL' }))}
                >
                  전체
                </button>
                <button
                  className={`badge ${filters.market === 'KOSPI' ? 'badge-tag' : ''}`}
                  style={{ cursor: 'pointer', padding: '4px 8px', border: filters.market === 'KOSPI' ? '1px solid #818cf8' : '1px solid var(--border-subtle)', background: filters.market === 'KOSPI' ? 'rgba(99, 102, 241, 0.25)' : 'transparent', color: filters.market === 'KOSPI' ? '#a5b4fc' : 'var(--text-secondary)', fontWeight: filters.market === 'KOSPI' ? 700 : 400 }}
                  onClick={() => setFilters(prev => ({ ...prev, market: 'KOSPI' }))}
                >
                  코스피
                </button>
                <button
                  className={`badge ${filters.market === 'KOSDAQ' ? 'badge-tag' : ''}`}
                  style={{ cursor: 'pointer', padding: '4px 8px', border: filters.market === 'KOSDAQ' ? '1px solid #10b981' : '1px solid var(--border-subtle)', background: filters.market === 'KOSDAQ' ? 'rgba(16, 185, 129, 0.25)' : 'transparent', color: filters.market === 'KOSDAQ' ? '#34d399' : 'var(--text-secondary)', fontWeight: filters.market === 'KOSDAQ' ? 700 : 400 }}
                  onClick={() => setFilters(prev => ({ ...prev, market: 'KOSDAQ' }))}
                >
                  코스닥
                </button>
                <button
                  className={`badge ${filters.market === 'US' ? 'badge-tag' : ''}`}
                  style={{ cursor: 'pointer', padding: '4px 8px', border: filters.market === 'US' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)', background: filters.market === 'US' ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: filters.market === 'US' ? '#fbbf24' : 'var(--text-secondary)' }}
                  onClick={() => setFilters(prev => ({ ...prev, market: 'US' }))}
                >
                  미국
                </button>
              </div>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.78rem',
                  padding: '5px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  borderRadius: '6px'
                }}
                title="코스피 200/코스닥 150/미국 시장별 시총, 거래량 수집 비율 및 급등락 종목 수를 커스텀 설정합니다."
              >
                <Sliders size={13} color="var(--color-brand)" />
                <span>수집 조건</span>
              </button>
            </div>
          </div>

          <CollectorSettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onRefreshData={onRefreshData}
          />

          {/* Watchlist Input Form */}
          {activeCategory === 'watchlist' && (
            <div style={{ padding: '16px 20px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '10px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>관심 종목 등록 (국내 & 미국 실시간 연동)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>예: 미국(AAPL, TSLA, NVDA, PLTR, SPY) / 한국(005930, 000660)</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  id="watchlist-symbol"
                  type="text" 
                  placeholder="종목 티커 또는 코드 입력 (예: TSLA, NVDA, AAPL, 005930)" 
                  className="input-field"
                  style={{ flex: 1, padding: '9px 12px', fontSize: '0.85rem' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.currentTarget;
                      const symbol = input.value.trim().toUpperCase();
                      if (!symbol) return;
                      onToggleWatchlist(symbol);
                      input.value = '';
                    }
                  }}
                />
                <button 
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap', padding: '9px 16px', fontSize: '0.85rem' }}
                  onClick={() => {
                    const input = document.getElementById('watchlist-symbol') as HTMLInputElement;
                    const symbol = input?.value?.trim().toUpperCase();
                    if (!symbol) return;
                    onToggleWatchlist(symbol);
                    input.value = '';
                  }}
                >
                  + 관심종목 추가
                </button>
              </div>
            </div>
          )}

          {/* 3. Results Data Table */}
          <StockTable
            stocks={filteredStocks}
            watchlist={watchlist}
            activeCategory={activeCategory}
            onToggleWatchlist={onToggleWatchlist}
            onSelectStock={onSelectStock}
          />
        </div>
      </div>
    </div>
  );
};
