import type { MarketIndex, SectorPerf, Stock, NewsItem, FilterState, QuantMetrics } from '../types/stock';
import { MOCK_INDICES, MOCK_SECTORS, MOCK_STOCKS, MOCK_NEWS } from '../mock/stockData';

export async function fetchMarketIndices(): Promise<MarketIndex[]> {
  try {
    const res = await fetch('/api/indices');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('API 서버 연결 실패 (Mock 데이터 폴백):', err);
    return MOCK_INDICES;
  }
}

export async function fetchSectors(): Promise<SectorPerf[]> {
  try {
    const res = await fetch('/api/sectors');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('API 서버 연결 실패 (Mock 데이터 폴백):', err);
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
    console.warn('API 서버 연결 실패 (Mock 데이터 폴백):', err);
    return MOCK_STOCKS;
  }
}

export async function fetchNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch('/api/news');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('API 서버 연결 실패 (Mock 데이터 폴백):', err);
    return MOCK_NEWS;
  }
}

export async function triggerRealtimeCollection(): Promise<{ success: boolean; updatedIndicesCount: number; updatedStocksCount: number; timestamp: string }> {
  const res = await fetch('/api/collect/realtime', { method: 'POST' });
  if (!res.ok) throw new Error(`Realtime collection failed: ${res.status}`);
  return await res.json();
}

export async function fetchQuantMetrics(): Promise<QuantMetrics | null> {
  try {
    const res = await fetch('/api/quant/metrics');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Quant metrics fetch failed:', err);
    return null;
  }
}
