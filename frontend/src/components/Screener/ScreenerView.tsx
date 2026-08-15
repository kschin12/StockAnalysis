import React, { useState, useEffect } from 'react';
import type { Stock, FilterState, CustomPreset, QuantMetrics } from '../../types/stock';
import { fetchRankings, fetchWatchlist } from '../../api/stockApi';
import { FilterPanel } from './FilterPanel';
import { StockTable } from './StockTable';
import { DynamicQuantGuide } from './DynamicQuantGuide';

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
  onSelectStock
}) => {
  // 동적 추천 기준 원클릭 주입
  const handleApplyDynamicFilters = (partial: Partial<FilterState>) => {
    setFilters(prev => ({
      ...prev,
      ...partial
    }));
  };

  const [activeCategory, setActiveCategory] = useState<'all' | 'market_cap' | 'volume' | 'rise' | 'watchlist'>('market_cap');
  const [dynamicStocks, setDynamicStocks] = useState<Stock[]>([]);
  const [isLoadingDynamic, setIsLoadingDynamic] = useState(false);

  useEffect(() => {
    async function loadDynamic() {
      if (activeCategory === 'all') return;
      setIsLoadingDynamic(true);
      try {
        if (activeCategory === 'watchlist') {
          const data = await fetchWatchlist();
          setDynamicStocks(data);
        } else {
          const res = await fetchRankings(activeCategory, filters.market || 'ALL');
          if (res.success && res.data) {
            setDynamicStocks(res.data);
          } else {
            setDynamicStocks([]);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingDynamic(false);
      }
    }
    loadDynamic();
  }, [activeCategory, filters.market]);

  // 필터 적용 로직 (카테고리 선택 시 0초 즉시 정렬 표시)
  const getCategoryBaseStocks = () => {
    if (activeCategory === 'all') {
      return stocks;
    }
    if (activeCategory === 'watchlist') {
      return dynamicStocks.length > 0 ? dynamicStocks : stocks.filter(s => watchlist.includes(s.symbol));
    }
    if (activeCategory === 'market_cap') {
      return dynamicStocks.length > 0 ? dynamicStocks : [...stocks].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
    }
    if (activeCategory === 'volume') {
      return dynamicStocks.length > 0 ? dynamicStocks : [...stocks].sort((a, b) => (b.volume || 0) - (a.volume || 0));
    }
    if (activeCategory === 'rise') {
      return dynamicStocks.length > 0 ? dynamicStocks : [...stocks].sort((a, b) => (b.changeRate || 0) - (a.changeRate || 0));
    }
    return dynamicStocks.length > 0 ? dynamicStocks : stocks;
  };

  const baseStocks = getCategoryBaseStocks();
  const filteredStocks = baseStocks.filter(s => {
    // 1. Market
    if (filters.market !== 'ALL') {
      if (filters.market === 'US' && s.market !== 'US' && s.currency !== 'USD') return false;
      if (filters.market === 'KRX' && s.market !== 'KRX' && s.currency !== 'KRW') return false;
    }
    // 2. Asset Type
    if (filters.assetType !== 'ALL' && s.assetType !== filters.assetType) {
      return false;
    }
    // 3. PER
    if (filters.maxPer !== '' && (s.per === null || s.per > filters.maxPer)) {
      return false;
    }
    // 4. PBR
    if (filters.maxPbr !== '' && (s.pbr === null || s.pbr > filters.maxPbr)) {
      return false;
    }
    // 5. ROE
    if (filters.minRoe !== '' && (s.roe === null || s.roe < filters.minRoe)) {
      return false;
    }
    // 6. Dividend
    if (filters.minDividend !== '' && (s.dividendYield === null || s.dividendYield < filters.minDividend)) {
      return false;
    }
    // 7. Debt Ratio
    if (filters.maxDebtRatio !== '' && (s.debtRatio !== undefined && s.debtRatio !== null && s.debtRatio > filters.maxDebtRatio)) {
      return false;
    }
    // 8. Search Query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchSymbol = s.symbol.toLowerCase().includes(q);
      if (!matchName && !matchSymbol) return false;
    }

    return true;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Dynamic Quant Strategy Guide Card */}
      <DynamicQuantGuide
        metrics={quantMetrics}
        onApplyDynamicFilters={handleApplyDynamicFilters}
      />

      {/* 동적 디스커버리 탭 메뉴 & 시장 선택 바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(17, 24, 39, 0.6)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          <button 
            className={`btn ${activeCategory === 'market_cap' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveCategory('market_cap')}
          >
            🏆 시가총액 상위
          </button>
          <button 
            className={`btn ${activeCategory === 'volume' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveCategory('volume')}
          >
            🔥 거래량 상위
          </button>
          <button 
            className={`btn ${activeCategory === 'rise' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveCategory('rise')}
          >
            🚀 급등주
          </button>
          <button 
            className={`btn ${activeCategory === 'watchlist' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveCategory('watchlist')}
          >
            ⭐ 내 관심종목
          </button>
          <button 
            className={`btn ${activeCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveCategory('all')}
          >
            🌐 전체 종목 필터링
          </button>
        </div>

        {/* 시장 전환 퀵 버튼 (전체 / 한국 / 미국) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-muted)', marginRight: '4px' }}>시장:</span>
          <button
            className={`badge ${filters.market === 'ALL' ? 'badge-tag' : ''}`}
            style={{ cursor: 'pointer', padding: '5px 10px', border: filters.market === 'ALL' ? '1px solid var(--color-brand)' : '1px solid var(--border-subtle)', background: filters.market === 'ALL' ? 'rgba(99, 102, 241, 0.2)' : 'transparent', color: filters.market === 'ALL' ? '#fff' : 'var(--text-secondary)' }}
            onClick={() => setFilters(prev => ({ ...prev, market: 'ALL' }))}
          >
            전체 (KRX+US)
          </button>
          <button
            className={`badge ${filters.market === 'KRX' ? 'badge-tag' : ''}`}
            style={{ cursor: 'pointer', padding: '5px 10px', border: filters.market === 'KRX' ? '1px solid var(--color-brand)' : '1px solid var(--border-subtle)', background: filters.market === 'KRX' ? 'rgba(99, 102, 241, 0.2)' : 'transparent', color: filters.market === 'KRX' ? '#fff' : 'var(--text-secondary)' }}
            onClick={() => setFilters(prev => ({ ...prev, market: 'KRX' }))}
          >
            🇰🇷 한국 (KRX)
          </button>
          <button
            className={`badge ${filters.market === 'US' ? 'badge-tag' : ''}`}
            style={{ cursor: 'pointer', padding: '5px 10px', border: filters.market === 'US' ? '1px solid var(--color-brand)' : '1px solid var(--border-subtle)', background: filters.market === 'US' ? 'rgba(99, 102, 241, 0.2)' : 'transparent', color: filters.market === 'US' ? '#fff' : 'var(--text-secondary)' }}
            onClick={() => setFilters(prev => ({ ...prev, market: 'US' }))}
          >
            🇺🇸 미국 (US)
          </button>
        </div>
      </div>

      {isLoadingDynamic ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          데이터 수집 중...
        </div>
      ) : (
        <>
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

          {/* Watchlist Input Form */}
          {activeCategory === 'watchlist' && (
            <div style={{ padding: '16px 20px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '10px', border: '1px solid var(--border-subtle)', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>⭐ 관심 종목 직접 등록 (국내 & 미국 실시간 연동)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>예: 미국(AAPL, TSLA, NVDA, PLTR, SPY) / 한국(005930, 000660)</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  id="watchlist-symbol"
                  type="text" 
                  placeholder="종목 티커 또는 코드 입력 (예: TSLA, NVDA, AAPL, 005930)" 
                  className="input-field"
                  style={{ flex: 1, padding: '9px 12px', fontSize: '0.85rem' }}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      const input = e.currentTarget;
                      const symbol = input.value.trim().toUpperCase();
                      if (!symbol) return;
                      input.disabled = true;
                      try {
                        const { addToWatchlist, fetchWatchlist } = await import('../../api/stockApi');
                        await addToWatchlist(symbol, '');
                        input.value = '';
                        const data = await fetchWatchlist();
                        setDynamicStocks(data);
                      } finally {
                        input.disabled = false;
                        input.focus();
                      }
                    }
                  }}
                />
                <button 
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap', padding: '9px 16px', fontSize: '0.85rem' }}
                  onClick={async () => {
                    const input = document.getElementById('watchlist-symbol') as HTMLInputElement;
                    const symbol = input?.value?.trim().toUpperCase();
                    if (!symbol) return;
                    input.disabled = true;
                    try {
                      const { addToWatchlist, fetchWatchlist } = await import('../../api/stockApi');
                      await addToWatchlist(symbol, '');
                      input.value = '';
                      const data = await fetchWatchlist();
                      setDynamicStocks(data);
                    } finally {
                      input.disabled = false;
                    }
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
            onToggleWatchlist={onToggleWatchlist}
            onSelectStock={onSelectStock}
          />
        </>
      )}
    </div>
  );
};
