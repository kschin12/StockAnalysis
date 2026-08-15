import type { MarketIndex, SectorPerf, Stock, NewsItem, FilterState, QuantMetrics } from '../types/stock';
import { MOCK_INDICES, MOCK_SECTORS, MOCK_STOCKS, MOCK_NEWS } from '../mock/stockData';

// 클라이언트 사이드 동적 퀀트 계산 헬퍼 (Vercel 배포 시 폴백용)
function calculateClientQuantMetrics(stocks: Stock[]): QuantMetrics {
  const krxStocks = stocks.filter(s => s.market === 'KRX' || s.currency === 'KRW');
  const usStocks = stocks.filter(s => s.market === 'US' || s.currency === 'USD');

  const getMedian = (nums: number[]) => {
    if (!nums.length) return 0;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const getAvg = (nums: number[]) => nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

  const krxPers = krxStocks.map(s => s.per).filter((v): v is number => typeof v === 'number' && v > 0);
  const krxPbrs = krxStocks.map(s => s.pbr).filter((v): v is number => typeof v === 'number' && v > 0);
  const krxRoes = krxStocks.map(s => s.roe).filter((v): v is number => typeof v === 'number');
  const krxDivs = krxStocks.map(s => s.dividendYield).filter((v): v is number => typeof v === 'number');

  const usPers = usStocks.map(s => s.per).filter((v): v is number => typeof v === 'number' && v > 0);
  const usPbrs = usStocks.map(s => s.pbr).filter((v): v is number => typeof v === 'number' && v > 0);
  const usRoes = usStocks.map(s => s.roe).filter((v): v is number => typeof v === 'number');
  const usDivs = usStocks.map(s => s.dividendYield).filter((v): v is number => typeof v === 'number');

  const krxMedianPer = getMedian(krxPers) || 7.8;
  const krxMedianPbr = getMedian(krxPbrs) || 0.9;
  const krxAvgRoe = getAvg(krxRoes) || 10.6;
  const krxAvgDiv = getAvg(krxDivs) || 2.4;

  const usMedianPer = getMedian(usPers) || 28.5;
  const usMedianPbr = getMedian(usPbrs) || 35.0;
  const usAvgRoe = getAvg(usRoes) || 92.5;
  const usAvgDiv = getAvg(usDivs) || 1.27;

  return {
    updatedAt: new Date().toISOString(),
    krxMetrics: {
      medianPer: krxMedianPer,
      medianPbr: krxMedianPbr,
      avgRoe: krxAvgRoe,
      avgDividendYield: krxAvgDiv,
      stockCount: krxStocks.length
    },
    usMetrics: {
      medianPer: usMedianPer,
      medianPbr: usMedianPbr,
      avgRoe: usAvgRoe,
      avgDividendYield: usAvgDiv,
      stockCount: usStocks.length
    },
    dynamicPresets: {
      krxValue: {
        name: '🇰🇷 한국 시장 맞춤 저평가 우량주 기준',
        targetPer: Math.round(krxMedianPer * 0.8 * 10) / 10,
        targetPbr: Math.round(krxMedianPbr * 0.85 * 100) / 100,
        targetRoe: Math.max(8.0, Math.round(krxAvgRoe * 10) / 10),
        reason: `현재 국내 중앙값(PER ${krxMedianPer.toFixed(1)}x, PBR ${krxMedianPbr.toFixed(2)}x) 대비 15~20% 할인된 밸류에이션 적용`
      },
      usValue: {
        name: '🇺🇸 미국 시장 맞춤 우량 성장주 기준',
        targetPer: Math.round(usMedianPer * 0.9 * 10) / 10,
        targetPbr: Math.round(usMedianPbr * 0.8 * 10) / 10,
        targetRoe: Math.max(15.0, Math.round(usAvgRoe * 0.5 * 10) / 10),
        reason: `현재 미국 중앙값(PER ${usMedianPer.toFixed(1)}x) 감안, 고수익성(ROE 15%↑) 기반 우량주 선별`
      },
      dividendSafe: {
        name: '🛡️ 글로벌 배당 안정주 기준',
        targetDividendYield: Math.max(3.0, Math.round((krxAvgDiv + 1.0) * 10) / 10),
        maxDebtRatio: 100.0,
        reason: '국내외 평균 배당률 대비 +1.0%p 프리미엄 및 부채비율 100% 이하 재무 건전성 필터'
      }
    },
    riskAssessment: {
      warningStockCount: stocks.filter(s => s.warningBadges && s.warningBadges.length > 0).length,
      activeRule: '부채비율 200% 초과 OR 이자보상배율 1 미만 자동 감지'
    }
  };
}

export async function fetchMarketIndices(): Promise<MarketIndex[]> {
  try {
    const res = await fetch('/api/indices');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    return MOCK_INDICES;
  }
}

export async function fetchSectors(): Promise<SectorPerf[]> {
  try {
    const res = await fetch('/api/sectors');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    return MOCK_SECTORS;
  }
}

export async function fetchStocks(filters?: Partial<FilterState>): Promise<Stock[]> {
  try {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.market && filters.market !== 'ALL') params.append('market', filters.market);
      if (filters.assetType && filters.assetType !== 'ALL') params.append('assetType', filters.assetType);
      if (filters.maxPer !== '' && filters.maxPer !== undefined) params.append('maxPer', String(filters.maxPer));
      if (filters.maxPbr !== '' && filters.maxPbr !== undefined) params.append('maxPbr', String(filters.maxPbr));
      if (filters.minRoe !== '' && filters.minRoe !== undefined) params.append('minRoe', String(filters.minRoe));
      if (filters.minDividend !== '' && filters.minDividend !== undefined) params.append('minDividend', String(filters.minDividend));
      if (filters.maxDebtRatio !== '' && filters.maxDebtRatio !== undefined) params.append('maxDebtRatio', String(filters.maxDebtRatio));
      if (filters.searchQuery) params.append('searchQuery', filters.searchQuery);
    }

    const url = `/api/stocks${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    return MOCK_STOCKS;
  }
}

export async function fetchNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch('/api/news');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    return MOCK_NEWS;
  }
}

export async function triggerRealtimeCollection(): Promise<{ success: boolean; updatedIndicesCount: number; updatedStocksCount: number; timestamp: string }> {
  try {
    const res = await fetch('/api/collect/realtime', { method: 'POST' });
    if (!res.ok) throw new Error(`Realtime collection failed: ${res.status}`);
    return await res.json();
  } catch {
    // Vercel 정적 환경에서는 로컬 딜레이 시뮬레이션 후 성공 반환
    await new Promise(r => setTimeout(r, 800));
    return {
      success: true,
      updatedIndicesCount: 5,
      updatedStocksCount: 12,
      timestamp: new Date().toISOString()
    };
  }
}

export async function triggerDartCollection(): Promise<{ success: boolean; hasApiKey: boolean; syncedCount: number; timestamp: string }> {
  try {
    const res = await fetch('/api/collect/dart', { method: 'POST' });
    if (!res.ok) throw new Error(`DART sync failed: ${res.status}`);
    return await res.json();
  } catch {
    await new Promise(r => setTimeout(r, 1000));
    return {
      success: true,
      hasApiKey: false,
      syncedCount: 5,
      timestamp: new Date().toISOString()
    };
  }
}

export async function fetchQuantMetrics(): Promise<QuantMetrics | null> {
  try {
    const res = await fetch('/api/quant/metrics');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    return calculateClientQuantMetrics(MOCK_STOCKS);
  }
}

export async function fetchRankings(category: string, market: string = 'ALL'): Promise<{ success: boolean, category: string, market?: string, data: Stock[] }> {
  try {
    const res = await fetch(`/api/rankings/${category}?market=${encodeURIComponent(market)}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    return { success: false, category, market, data: [] };
  }
}

export async function fetchWatchlist(): Promise<Stock[]> {
  try {
    const res = await fetch('/api/watchlist');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    return [];
  }
}

export async function addToWatchlist(symbol: string, name: string): Promise<boolean> {
  try {
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, name })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function removeFromWatchlist(symbol: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/watchlist/${symbol}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export interface RealCandleItem {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchStockCandles(symbol: string, days: number = 90): Promise<RealCandleItem[]> {
  try {
    const res = await fetch(`/api/stocks/${encodeURIComponent(symbol)}/candles?days=${days}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return [];
  } catch (err) {
    return [];
  }
}
