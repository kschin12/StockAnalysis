export type AssetType = 'STOCK' | 'ETF' | 'ETN' | 'PREF'; // 보통주, ETF, ETN, 우선주
export type Market = 'KRX' | 'KOSPI' | 'KOSDAQ' | 'US' | 'NYSE' | 'NASDAQ';

export interface Stock {
  symbol: string;
  name: string;
  market: Market;
  assetType: AssetType;
  sector: string;
  price: number;
  changeRate: number;
  volume: number;
  marketCap: number; // KRW 또는 USD
  per: number | null;
  pbr: number | null;
  psr?: number | null;
  roe: number | null; // %
  dividendYield: number | null; // %
  debtRatio?: number | null; // 부채비율 %
  currentRatio?: number | null; // 유동비율 %
  interestCoverage?: number | null; // 이자보상배율
  rsi14?: number | null;
  high52w?: number | null;
  low52w?: number | null;
  currency: 'KRW' | 'USD';
  warningBadges?: string[]; // e.g., ['가치함정 의심', '고부채']
}

export interface MarketIndex {
  code: string;
  name: string;
  value: number;
  change: number;
  changeRate: number;
  sparkline?: number[];
}

export interface SectorPerf {
  name: string;
  changeRate: number;
  marketCap: number;
  topStock: string;
}

export interface NewsItem {
  id: string;
  symbol?: string;
  companyName?: string;
  title: string;
  summary: string;
  source: string;
  date: string;
  url: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  isDisclosure?: boolean; // DART 공시 여부
}

export interface FilterState {
  market: 'ALL' | 'KRX' | 'US';
  assetType: 'ALL' | 'STOCK' | 'ETF';
  minRoe: number | '';
  maxPer: number | '';
  maxPbr: number | '';
  minDividend: number | '';
  minMarketCap: number | ''; // 억 / M
  maxDebtRatio: number | '';
  minRsi: number | '';
  maxRsi: number | '';
  searchQuery: string;
}

export interface CustomPreset {
  id: string;
  name: string;
  description: string;
  filters: FilterState;
}

export interface CandleData {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface QuantMetrics {
  updatedAt: string;
  krxMetrics: {
    medianPer: number;
    medianPbr: number;
    avgRoe: number;
    avgDividendYield: number;
    stockCount: number;
  };
  usMetrics: {
    medianPer: number;
    medianPbr: number;
    avgRoe: number;
    avgDividendYield: number;
    stockCount: number;
  };
  dynamicPresets: {
    krxValue: {
      name: string;
      targetPer: number;
      targetPbr: number;
      targetRoe: number;
      reason: string;
    };
    usValue: {
      name: string;
      targetPer: number;
      targetPbr: number;
      targetRoe: number;
      reason: string;
    };
    dividendSafe: {
      name: string;
      targetDividendYield: number;
      maxDebtRatio: number;
      reason: string;
    };
  };
  riskAssessment: {
    warningStockCount: number;
    activeRule: string;
  };
}
