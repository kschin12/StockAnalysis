import type { CustomPreset } from '../types/stock';

const PRESET_STORAGE_KEY = 'QUANT_SCREENER_CUSTOM_PRESETS';
const WATCHLIST_STORAGE_KEY = 'QUANT_SCREENER_WATCHLIST';

export const DEFAULT_PRESETS: CustomPreset[] = [
  {
    id: 'kospi-value',
    name: '코스피 저평가 가치주',
    description: '코스피 대형주 PER 10배 이하 + PBR 0.9배 이하 + ROE 8% 이상 + 부채 100% 이하',
    filters: {
      market: 'KOSPI',
      assetType: 'STOCK',
      maxPer: 10,
      maxPbr: 0.9,
      minRoe: 8,
      minDividend: '',
      minMarketCap: '',
      maxDebtRatio: 100,
      minRsi: '',
      maxRsi: '',
      searchQuery: ''
    }
  },
  {
    id: 'kosdaq-growth',
    name: '코스닥 고성장 테크',
    description: '코스닥 소부장/바이오 ROE 15% 이상 + 고성장 모멘텀 (PER 45배 완화)',
    filters: {
      market: 'KOSDAQ',
      assetType: 'STOCK',
      maxPer: 45,
      maxPbr: '',
      minRoe: 15,
      minDividend: '',
      minMarketCap: '',
      maxDebtRatio: 120,
      minRsi: '',
      maxRsi: '',
      searchQuery: ''
    }
  },
  {
    id: 'us-growth',
    name: '미국 빅테크 성장주',
    description: '글로벌 독점력 기반 미국 우량 빅테크 (PER 25배 이하 + ROE 15% 이상)',
    filters: {
      market: 'US',
      assetType: 'STOCK',
      maxPer: 25,
      maxPbr: '',
      minRoe: 15,
      minDividend: '',
      minMarketCap: '',
      maxDebtRatio: '',
      minRsi: '',
      maxRsi: '',
      searchQuery: ''
    }
  },
  {
    id: 'dividend-safe',
    name: '고배당 캐시카우',
    description: '배당수익률 3.5% 이상 + 부채비율 90% 이하 재무 건전성',
    filters: {
      market: 'ALL',
      assetType: 'STOCK',
      maxPer: '',
      maxPbr: '',
      minRoe: '',
      minDividend: 3.5,
      minMarketCap: '',
      maxDebtRatio: 90,
      minRsi: '',
      maxRsi: '',
      searchQuery: ''
    }
  },
  {
    id: 'top-etfs',
    name: '대표 ETF 모음',
    description: '시장 대표 지수 및 배당 우량 ETF 모음',
    filters: {
      market: 'ALL',
      assetType: 'ETF',
      maxPer: '',
      maxPbr: '',
      minRoe: '',
      minDividend: '',
      minMarketCap: '',
      maxDebtRatio: '',
      minRsi: '',
      maxRsi: '',
      searchQuery: ''
    }
  }
];

export function getSavedPresets(): CustomPreset[] {
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    const custom: CustomPreset[] = raw ? JSON.parse(raw) : [];
    const all = [...DEFAULT_PRESETS, ...custom];
    return all.map(p => ({
      ...p,
      name: p.name.replace(/^[^\w\s가-힣]+/, '').trim()
    }));
  } catch {
    return DEFAULT_PRESETS;
  }
}

export function saveCustomPreset(preset: CustomPreset) {
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    const existing: CustomPreset[] = raw ? JSON.parse(raw) : [];
    const updated = [...existing.filter(p => p.id !== preset.id), preset];
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('프리셋 저장 실패:', e);
  }
}

export function deleteCustomPreset(id: string) {
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) return;
    const existing: CustomPreset[] = JSON.parse(raw);
    const updated = existing.filter(p => p.id !== id);
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('프리셋 삭제 실패:', e);
  }
}

export function getWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : ['005930', 'AAPL', 'SPY'];
  } catch {
    return ['005930', 'AAPL', 'SPY'];
  }
}

export function toggleWatchlist(symbol: string): string[] {
  try {
    const list = getWatchlist();
    const updated = list.includes(symbol)
      ? list.filter(s => s !== symbol)
      : [...list, symbol];
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
