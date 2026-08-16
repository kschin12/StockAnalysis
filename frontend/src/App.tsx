import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { MarketDashboard } from './components/MarketDashboard/MarketDashboard';
import { ScreenerView } from './components/Screener/ScreenerView';
import { StockChart } from './components/ChartView/StockChart';
import { NewsFeed } from './components/NewsFeed/NewsFeed';
import { KisAccountModal } from './components/Kis/KisAccountModal';
import type { FilterState, CustomPreset, Stock, MarketIndex, SectorPerf, NewsItem, QuantMetrics } from './types/stock';
import { getSavedPresets, saveCustomPreset, deleteCustomPreset, getWatchlist, toggleWatchlist } from './utils/storage';
import { fetchMarketIndices, fetchSectors, fetchStocks, fetchNews, fetchQuantMetrics, triggerRealtimeCollection, triggerNewsCollection } from './api/stockApi';
import { RefreshCw, ShieldCheck } from 'lucide-react';

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
  // 브라우저 뒤로가기/앞으로가기 (이전 페이지 / 다음 페이지) 연동
  const parseHash = () => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return { tab: 'dashboard' as const, symbol: '005930' };
    const [tabPart, queryPart] = hash.split('?');
    const validTabs: Array<'dashboard' | 'screener' | 'chart' | 'news'> = ['dashboard', 'screener', 'chart', 'news'];
    const tab = validTabs.includes(tabPart as any) ? (tabPart as 'dashboard' | 'screener' | 'chart' | 'news') : 'dashboard';
    const params = new URLSearchParams(queryPart || '');
    const symbol = params.get('symbol') || '005930';
    return { tab, symbol };
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'screener' | 'chart' | 'news'>(() => parseHash().tab);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string>(() => parseHash().symbol);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [presets, setPresets] = useState<CustomPreset[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>(() => getWatchlist());

  // 탭 변경 시 브라우저 히스토리에 푸시 (이전/다음 페이지 활성화)
  const handleTabChange = (tab: 'dashboard' | 'screener' | 'chart' | 'news') => {
    setActiveTab(tab);
    const newHash = tab === 'chart' ? `#chart?symbol=${selectedStockSymbol}` : `#${tab}`;
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', newHash);
    }
  };

  // 브라우저 뒤로가기 / 앞으로가기 이벤트 감지
  useEffect(() => {
    const handlePopState = () => {
      const { tab, symbol } = parseHash();
      setActiveTab(tab);
      if (symbol) setSelectedStockSymbol(symbol);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

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
  const [isKisModalOpen, setIsKisModalOpen] = useState<boolean>(false);

  const loadAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { fetchWatchlist } = await import('./api/stockApi');
      const [idxData, secData, stkData, newsData, metricsData, wlData] = await Promise.all([
        fetchMarketIndices(),
        fetchSectors(),
        fetchStocks(),
        fetchNews(),
        fetchQuantMetrics(),
        fetchWatchlist()
      ]);
      setIndices(idxData);
      setSectors(secData);
      setStocks(stkData);
      setNews(newsData);
      setQuantMetrics(metricsData);
      const localWl = getWatchlist();
      const serverSymbols = wlData && wlData.length > 0 ? wlData.map(w => w.symbol) : [];
      const mergedWl = Array.from(new Set([...localWl, ...serverSymbols]));
      if (localWl.length > 0 && serverSymbols.length === 0) {
        import('./api/stockApi').then(({ addToWatchlist }) => {
          for (const s of localWl) {
            addToWatchlist(s, '').catch(() => {});
          }
        });
      }
      localStorage.setItem('QUANT_SCREENER_WATCHLIST', JSON.stringify(mergedWl));
      setWatchlist(mergedWl);
      setLastSyncTime(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
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

  const [isNewsSyncing, setIsNewsSyncing] = useState<boolean>(false);

  const handleNewsSync = async () => {
    setIsNewsSyncing(true);
    try {
      await triggerNewsCollection();
      const freshNews = await fetchNews();
      setNews(freshNews);
    } catch (e) {
      console.error('뉴스 동기화 실패:', e);
    } finally {
      setIsNewsSyncing(false);
    }
  };

  useEffect(() => {
    setPresets(getSavedPresets());
    // 1) ⚡ 첫 화면 접속 시: 로컬 DB에 저장된 시세, 지수, 뉴스, 공시 데이터를 0.01초 즉시 로딩
    loadAllData();

    // 2) ⏱️ 장중 실시간 시세 업데이트: 첫 화면 접속 시 백그라운드로 1회 즉시 실행 + 접속 중 5분마다 자동 갱신
    triggerRealtimeCollection()
      .then(() => loadAllData())
      .catch((e) => console.warn('Initial price sync error:', e));

    const priceInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        triggerRealtimeCollection()
          .then(() => loadAllData())
          .catch((e) => console.warn('5-min price poll error:', e));
      }
    }, 300 * 1000); // 5분 주기

    return () => clearInterval(priceInterval);
  }, [loadAllData]);

  const handleSelectStock = (symbol: string) => {
    setSelectedStockSymbol(symbol);
    setActiveTab('chart');
    const newHash = `#chart?symbol=${symbol}`;
    if (window.location.hash !== newHash) {
      window.history.pushState(null, '', newHash);
    }
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

  const handleToggleWatchlist = async (symbol: string) => {
    const isWatch = watchlist.includes(symbol);
    toggleWatchlist(symbol);
    if (isWatch) {
      const { removeFromWatchlist } = await import('./api/stockApi');
      await removeFromWatchlist(symbol);
      setWatchlist(prev => prev.filter(s => s !== symbol));
    } else {
      const { addToWatchlist } = await import('./api/stockApi');
      const st = stocks.find(s => s.symbol === symbol);
      await addToWatchlist(symbol, st?.name || '');
      setWatchlist(prev => Array.from(new Set([...prev, symbol])));
    }
  };

  const handleNavigateToScreenerWithPreset = (presetId: string) => {
    const target = presets.find(p => p.id === presetId);
    if (target) {
      setFilters(target.filters);
    }
    handleTabChange('screener');
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
        setActiveTab={handleTabChange}
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
          <span>로컬 DB: <strong style={{ color: '#fff' }}>data/stocks.db ({stocks.length}개 종목)</strong></span>
          <span>API 서버: <strong style={{ color: 'var(--color-up)' }}>Connected (Online)</strong></span>
          {lastSyncTime && <span>마지막 동기화: {lastSyncTime}</span>}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setIsKisModalOpen(true)}
            className="btn btn-secondary"
            style={{
              padding: '5px 12px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              borderColor: 'rgba(59, 130, 246, 0.5)',
              background: 'rgba(59, 130, 246, 0.12)',
              color: '#60a5fa',
              fontWeight: 600
            }}
            title="한국투자증권 Open API를 통해 실시간 계좌 잔고, 수익률 및 원클릭 주문을 실행합니다."
          >
            <ShieldCheck size={13} />
            한투 실계좌 연동
          </button>

          <button
            onClick={handleRealtimeCollect}
            disabled={isCollecting}
            className="btn btn-primary"
            style={{ padding: '5px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Yahoo Finance 무료 피드로부터 최신 시세와 지수를 즉시 크롤링하여 DB에 갱신합니다."
          >
            {isCollecting ? '시세 수집 중...' : '실시간 시세 갱신'}
          </button>

          <button
            onClick={handleNewsSync}
            disabled={isNewsSyncing}
            className="btn btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="실시간 주요 언론사 뉴스 및 DART 공시를 웹에서 새로 크롤링하여 DB에 갱신합니다."
          >
            <RefreshCw size={12} className={isNewsSyncing ? 'animate-spin' : ''} />
            {isNewsSyncing ? '뉴스 수집 중...' : '뉴스 & 공시 갱신'}
          </button>

          <button
            onClick={loadAllData}
            disabled={isRefreshing}
            className="btn btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {/* Main Content Area (전체 화면 폭 풀와이드 활용) */}
      <main style={{
        flex: 1,
        width: '100%',
        padding: '24px 32px',
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
                onRefreshData={loadAllData}
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
                indices={indices}
                sectors={sectors}
                stocks={stocks}
                quantMetrics={quantMetrics}
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

      {/* KIS Open API 실계좌 연동 모달 */}
      <KisAccountModal
        isOpen={isKisModalOpen}
        onClose={() => setIsKisModalOpen(false)}
        defaultSymbol={selectedStock.symbol}
      />
    </div>
  );
};

export default App;
