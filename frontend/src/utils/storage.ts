import type { CustomPreset } from '../types/stock';

const PRESET_STORAGE_KEY = 'QUANT_SCREENER_CUSTOM_PRESETS';
const WATCHLIST_STORAGE_KEY = 'QUANT_SCREENER_WATCHLIST';

export const DEFAULT_PRESETS: CustomPreset[] = [
  {
    id: 'value-bluechip',
    name: '저평가 우량주',
    description: 'PER 10배 이하 + PBR 1배 이하 + ROE 10% 이상',
    filters: {
      market: 'ALL',
      assetType: 'STOCK',
      maxPer: 10,
      maxPbr: 1.0,
      minRoe: 10,
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
    name: '배당 안정주',
    description: '배당수익률 3% 이상 + 부채비율 100% 이하',
    filters: {
      market: 'ALL',
      assetType: 'STOCK',
      maxPer: '',
      maxPbr: '',
      minRoe: '',
      minDividend: 3.0,
      minMarketCap: '',
      maxDebtRatio: 100,
      minRsi: '',
      maxRsi: '',
      searchQuery: ''
    }
  },
  {
    id: 'top-etfs',
    name: '대표 ETF 모음',
    description: '시장 지수 및 배당 우량 ETF만 필터링',
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
