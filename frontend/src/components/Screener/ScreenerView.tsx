import React from 'react';
import type { Stock, FilterState, CustomPreset, QuantMetrics } from '../../types/stock';
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

  // 필터 적용 로직
  const filteredStocks = stocks.filter(s => {
    // 1. Market
    if (filters.market !== 'ALL' && s.market !== filters.market && (filters.market === 'US' ? s.currency !== 'USD' : s.currency !== 'KRW')) {
      return false;
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

      {/* 3. Results Data Table */}
      <StockTable
        stocks={filteredStocks}
        watchlist={watchlist}
        onToggleWatchlist={onToggleWatchlist}
        onSelectStock={onSelectStock}
      />
    </div>
  );
};
