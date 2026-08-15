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
  momentumBadges?: string[]; // e.g., ['신고가 근접', '추세강세']
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
  importance?: number; // 중요도 (1~5)
}

export interface FilterState {
  market: 'ALL' | 'KRX' | 'KOSPI' | 'KOSDAQ' | 'US';
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
  kospiMetrics?: {
    medianPer: number;
    medianPbr: number;
    avgRoe: number;
    avgDividendYield: number;
    stockCount: number;
  };
  kosdaqMetrics?: {
    medianPer: number;
    medianPbr: number;
    avgRoe: number;
    avgDividendYield: number;
    stockCount: number;
  };
  krxMetrics?: {
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
    kospiValue?: {
      name: string;
      market?: 'KOSPI' | 'ALL';
      targetPer: number | '';
      targetPbr: number | '';
      targetRoe: number | '';
      maxDebtRatio?: number | '';
      reason: string;
    };
    kosdaqGrowth?: {
      name: string;
      market?: 'KOSDAQ' | 'ALL';
      targetPer: number | '';
      targetPbr: number | '';
      targetRoe: number | '';
      maxDebtRatio?: number | '';
      reason: string;
    };
    krxValue?: {
      name: string;
      market?: 'KOSPI' | 'KRX' | 'ALL';
      targetPer: number | '';
      targetPbr: number | '';
      targetRoe: number | '';
      reason: string;
    };
    usValue?: {
      name: string;
      market?: 'US' | 'ALL';
      targetPer: number | '';
      targetPbr: number | '';
      targetRoe: number | '';
      reason: string;
    };
    usGrowth?: {
      name: string;
      market?: 'US' | 'ALL';
      targetPer: number | '';
      targetPbr: number | '';
      targetRoe: number | '';
      reason: string;
    };
    dividendSafe: {
      name: string;
      market?: 'ALL';
      targetDividendYield: number | '';
      maxDebtRatio: number | '';
      reason: string;
    };
  };
  riskAssessment: {
    warningStockCount: number;
    activeRule: string;
  };
}
