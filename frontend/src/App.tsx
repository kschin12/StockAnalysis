import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { MarketDashboard } from './components/MarketDashboard/MarketDashboard';
import { ScreenerView } from './components/Screener/ScreenerView';
import { StockChart } from './components/ChartView/StockChart';
import { NewsFeed } from './components/NewsFeed/NewsFeed';
import type { FilterState, CustomPreset, Stock, MarketIndex, SectorPerf, NewsItem, QuantMetrics } from './types/stock';
import { getSavedPresets, saveCustomPreset, deleteCustomPreset, getWatchlist, toggleWatchlist } from './utils/storage';
import { fetchMarketIndices, fetchSectors, fetchStocks, fetchNews, fetchQuantMetrics, triggerRealtimeCollection } from './api/stockApi';
import { RefreshCw, Zap } from 'lucide-react';

const INITIAL_FILTERS: FilterState = {
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
  searchQuery: ''
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'screener' | 'chart' | 'news'>('dashboard');
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string>('005930');
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [presets, setPresets] = useState<CustomPreset[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  
  // Real DB data states
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [sectors, setSectors] = useState<SectorPerf[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [quantMetrics, setQuantMetrics] = useState<QuantMetrics | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isCollecting, setIsCollecting] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  const loadAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [idxData, secData, stkData, newsData, metricsData] = await Promise.all([
        fetchMarketIndices(),
        fetchSectors(),
        fetchStocks(),
        fetchNews(),
        fetchQuantMetrics()
      ]);
      setIndices(idxData);
      setSectors(secData);
      setStocks(stkData);
      setNews(newsData);
      setQuantMetrics(metricsData);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('데이터 로드 실패:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRealtimeCollect = async () => {
    setIsCollecting(true);
    try {
      const res = await triggerRealtimeCollection();
      if (res.success) {
        await loadAllData();
      }
    } catch (e) {
      console.error('실시간 수집 실패:', e);
      alert('실시간 시세 수집에 실패했습니다. 백엔드 서버 상태를 확인해 주세요.');
    } finally {
      setIsCollecting(false);
    }
  };

  useEffect(() => {
    setPresets(getSavedPresets());
    setWatchlist(getWatchlist());
    loadAllData();
  }, [loadAllData]);

  const handleSelectStock = (symbol: string) => {
    setSelectedStockSymbol(symbol);
    setActiveTab('chart');
  };

  const handleApplyPreset = (preset: CustomPreset) => {
    setFilters(preset.filters);
  };

  const handleSavePreset = (name: string, description: string) => {
    const newPreset: CustomPreset = {
      id: `custom-${Date.now()}`,
      name: `⭐ ${name}`,
      description: description || '사용자 지정 필터 조건',
      filters: { ...filters }
    };
    saveCustomPreset(newPreset);
    setPresets(getSavedPresets());
  };

  const handleDeletePreset = (id: string) => {
    deleteCustomPreset(id);
    setPresets(getSavedPresets());
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const handleToggleWatchlist = (symbol: string) => {
    const updated = toggleWatchlist(symbol);
    setWatchlist(updated);
  };

  const handleNavigateToScreenerWithPreset = (presetId: string) => {
    const target = presets.find(p => p.id === presetId);
    if (target) {
      setFilters(target.filters);
    }
    setActiveTab('screener');
  };

  const selectedStock = stocks.find(s => s.symbol === selectedStockSymbol) || stocks[0] || {
    symbol: '005930',
    name: '삼성전자',
    market: 'KRX',
    assetType: 'STOCK',
    sector: '전기전자',
    price: 78500,
    changeRate: 1.68,
    volume: 15420000,
    marketCap: 4680000,
    per: 13.8,
    pbr: 1.25,
    roe: 10.4,
    dividendYield: 2.35,
    currency: 'KRW'
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Sticky Nav */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedStockSymbol={selectedStock.symbol}
      />

      {/* Quick Status Sub-Bar */}
      <div style={{
        background: 'rgba(17, 24, 39, 0.75)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '8px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        fontSize: '0.78rem',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span>📦 로컬 DB: <strong style={{ color: '#fff' }}>data/stocks.db ({stocks.length}개 종목)</strong></span>
          <span>⚡ API 서버: <strong style={{ color: 'var(--color-up)' }}>Connected (Port 5000)</strong></span>
          {lastSyncTime && <span>🕒 마지막 동기화: {lastSyncTime}</span>}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleRealtimeCollect}
            disabled={isCollecting}
            className="btn btn-primary"
            style={{ padding: '5px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Yahoo Finance 무료 피드로부터 최신 시세와 지수를 즉시 크롤링하여 DB에 갱신합니다."
          >
            <Zap size={13} className={isCollecting ? 'animate-pulse' : ''} />
            {isCollecting ? '실시간 시세 수집 중...' : '⚡ 실시간 시세 즉시 갱신'}
          </button>

          <button
            onClick={loadAllData}
            disabled={isRefreshing}
            className="btn btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            DB 새로고침
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        maxWidth: '1440px',
        width: '100%',
        margin: '0 auto',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {isLoading ? (
          <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
              SQLite 데이터베이스 연결 및 퀀트 지표 로딩 중...
            </div>
            <p style={{ fontSize: '0.85rem' }}>잠시만 기다려 주세요.</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <MarketDashboard
                indices={indices}
                sectors={sectors}
                stocks={stocks}
                onSelectStock={handleSelectStock}
                onNavigateToScreenerWithPreset={handleNavigateToScreenerWithPreset}
              />
            )}

            {activeTab === 'screener' && (
              <ScreenerView
                stocks={stocks}
                filters={filters}
                setFilters={setFilters}
                presets={presets}
                watchlist={watchlist}
                quantMetrics={quantMetrics}
                onApplyPreset={handleApplyPreset}
                onSavePreset={handleSavePreset}
                onDeletePreset={handleDeletePreset}
                onResetFilters={handleResetFilters}
                onToggleWatchlist={handleToggleWatchlist}
                onSelectStock={handleSelectStock}
              />
            )}

            {activeTab === 'chart' && (
              <StockChart
                stock={selectedStock}
                news={news}
                allStocks={stocks}
                onSelectStock={setSelectedStockSymbol}
              />
            )}

            {activeTab === 'news' && (
              <NewsFeed
                news={news}
                onSelectStock={handleSelectStock}
              />
            )}
          </>
        )}
      </main>

      {/* Footer & Disclaimer */}
      <footer style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--border-subtle)',
        padding: '24px',
        textAlign: 'center',
        background: 'rgba(10, 13, 20, 0.95)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p>
            ⚠️ <strong>투자 권유 유의사항 및 법적 면책고지</strong>: 본 웹 애플리케이션에서 제공하는 지수, 시세, 스크리너 필터 및 재무 지표는 투자 참고용 정보이며, 특정 종목의 매수 또는 매도를 권유하지 않습니다. 투자에 따른 모든 손익과 법적 책임은 투자자 본인에게 있습니다.
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>
            데이터 출처: 한국투자증권 KIS Open API · 금융감독원 DART · Alpha Vantage · Yahoo Finance (무료 피드 15분 지연 시세)
          </p>
          <p style={{ marginTop: '4px', fontSize: '0.75rem' }}>
            © 2026 AlphaQuant Analytics. Personal Quant Platform.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
