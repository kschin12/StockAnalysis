import type { Stock, MarketIndex, SectorPerf, NewsItem, CandleData } from '../types/stock';

export const MOCK_INDICES: MarketIndex[] = [
  { code: '^KS11', name: '코스피 (KOSPI)', value: 2664.25, change: 18.50, changeRate: 0.70, sparkline: [2640, 2645, 2650, 2648, 2658, 2664.25] },
  { code: '^KQ11', name: '코스닥 (KOSDAQ)', value: 872.40, change: -3.20, changeRate: -0.37, sparkline: [878, 876, 874, 870, 875, 872.40] },
  { code: '^GSPC', name: 'S&P 500', value: 5127.79, change: 42.15, changeRate: 0.83, sparkline: [5080, 5095, 5110, 5105, 5120, 5127.79] },
  { code: '^IXIC', name: '나스닥 종합', value: 16288.30, change: 180.40, changeRate: 1.12, sparkline: [16050, 16120, 16180, 16200, 16250, 16288.30] },
  { code: 'USDKRW=X', name: '원/달러 환율', value: 1332.80, change: -4.50, changeRate: -0.34, sparkline: [1340, 1338, 1336, 1335, 1334, 1332.80] }
];

export const MOCK_SECTORS: SectorPerf[] = [
  { name: '반도체 & AI', changeRate: 2.85, marketCap: 850, topStock: 'SK하이닉스 (+4.2%)' },
  { name: '빅테크 (미국)', changeRate: 1.64, marketCap: 1200, topStock: 'NVIDIA (+3.8%)' },
  { name: '자동차 & 모빌리티', changeRate: 0.95, marketCap: 320, topStock: '현대차 (+1.5%)' },
  { name: '2차전지', changeRate: -1.82, marketCap: 280, topStock: 'LG에너지솔루션 (-2.1%)' },
  { name: '금융 & 배당', changeRate: 0.42, marketCap: 210, topStock: 'KB금융 (+0.8%)' },
  { name: '바이오 & 헬스케어', changeRate: -0.65, marketCap: 190, topStock: '삼성바이오 (-0.4%)' }
];

export const MOCK_STOCKS: Stock[] = [
  // 국내 종목
  {
    symbol: '005930',
    name: '삼성전자',
    market: 'KRX',
    assetType: 'STOCK',
    sector: '전기전자',
    price: 78500,
    changeRate: 1.68,
    volume: 15420000,
    marketCap: 4680000, // 468조
    per: 13.8,
    pbr: 1.25,
    psr: 1.62,
    roe: 10.4,
    dividendYield: 2.35,
    debtRatio: 26.5,
    currentRatio: 245.0,
    interestCoverage: 18.4,
    rsi14: 62.5,
    high52w: 86000,
    low52w: 67000,
    currency: 'KRW'
  },
  {
    symbol: '000660',
    name: 'SK하이닉스',
    market: 'KRX',
    assetType: 'STOCK',
    sector: '전기전자',
    price: 182000,
    changeRate: 4.23,
    volume: 5120000,
    marketCap: 1320000,
    per: 9.8,
    pbr: 1.85,
    psr: 2.15,
    roe: 22.1,
    dividendYield: 1.15,
    debtRatio: 48.2,
    currentRatio: 165.0,
    interestCoverage: 12.8,
    rsi14: 71.0,
    high52w: 195000,
    low52w: 110000,
    currency: 'KRW'
  },
  {
    symbol: '005380',
    name: '현대차',
    market: 'KRX',
    assetType: 'STOCK',
    sector: '운수장비',
    price: 248000,
    changeRate: 0.81,
    volume: 1200000,
    marketCap: 520000,
    per: 5.4,
    pbr: 0.65,
    psr: 0.35,
    roe: 13.8,
    dividendYield: 4.85,
    debtRatio: 58.0,
    currentRatio: 140.0,
    interestCoverage: 9.5,
    rsi14: 55.4,
    high52w: 275000,
    low52w: 170000,
    currency: 'KRW'
  },
  {
    symbol: '105560',
    name: 'KB금융',
    market: 'KRX',
    assetType: 'STOCK',
    sector: '금융업',
    price: 79200,
    changeRate: 1.15,
    volume: 1650000,
    marketCap: 310000,
    per: 5.9,
    pbr: 0.48,
    psr: 0.80,
    roe: 9.6,
    dividendYield: 5.20,
    debtRatio: 115.0,
    currentRatio: 110.0,
    interestCoverage: 6.2,
    rsi14: 58.2,
    high52w: 84000,
    low52w: 48000,
    currency: 'KRW'
  },
  {
    symbol: '035420',
    name: 'NAVER',
    market: 'KRX',
    assetType: 'STOCK',
    sector: '서비스업',
    price: 172000,
    changeRate: -0.58,
    volume: 680000,
    marketCap: 280000,
    per: 21.5,
    pbr: 1.15,
    psr: 2.80,
    roe: 6.8,
    dividendYield: 0.85,
    debtRatio: 38.0,
    currentRatio: 195.0,
    interestCoverage: 15.0,
    rsi14: 42.0,
    high52w: 220000,
    low52w: 155000,
    currency: 'KRW'
  },
  {
    symbol: '999999',
    name: '부실건설 (가상)',
    market: 'KRX',
    assetType: 'STOCK',
    sector: '건설업',
    price: 3200,
    changeRate: -3.5,
    volume: 420000,
    marketCap: 450,
    per: 2.8,
    pbr: 0.35,
    roe: 1.2,
    dividendYield: 0.0,
    debtRatio: 320.0,
    currentRatio: 82.0,
    interestCoverage: 0.6,
    rsi14: 28.0,
    currency: 'KRW',
    warningBadges: ['가치함정 의심', '이자보상배율 1 미만', '고부채(300%↑)']
  },

  // 국내 ETF
  {
    symbol: '069500',
    name: 'KODEX 200',
    market: 'KRX',
    assetType: 'ETF',
    sector: '국내 대표지수',
    price: 36250,
    changeRate: 0.69,
    volume: 4500000,
    marketCap: 68000,
    per: 11.5,
    pbr: 0.98,
    roe: 8.5,
    dividendYield: 2.10,
    currency: 'KRW'
  },
  {
    symbol: '360750',
    name: 'TIGER 미국S&P500',
    market: 'KRX',
    assetType: 'ETF',
    sector: '해외 대표지수',
    price: 18450,
    changeRate: 0.82,
    volume: 2800000,
    marketCap: 45000,
    per: 22.0,
    pbr: 4.2,
    roe: 18.0,
    dividendYield: 1.45,
    currency: 'KRW'
  },

  // 미국 주식
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    market: 'US',
    assetType: 'STOCK',
    sector: 'Technology',
    price: 188.50,
    changeRate: 1.25,
    volume: 54000000,
    marketCap: 2900000, // $2.9T
    per: 28.5,
    pbr: 38.0,
    psr: 7.4,
    roe: 145.0,
    dividendYield: 0.55,
    debtRatio: 140.0,
    currentRatio: 105.0,
    interestCoverage: 28.0,
    rsi14: 64.0,
    high52w: 199.62,
    low52w: 164.08,
    currency: 'USD'
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    market: 'US',
    assetType: 'STOCK',
    sector: 'Technology',
    price: 885.20,
    changeRate: 3.84,
    volume: 48000000,
    marketCap: 2180000,
    per: 42.0,
    pbr: 35.0,
    psr: 26.5,
    roe: 91.5,
    dividendYield: 0.08,
    debtRatio: 42.0,
    currentRatio: 350.0,
    interestCoverage: 45.0,
    rsi14: 73.5,
    high52w: 974.00,
    low52w: 395.00,
    currency: 'USD'
  },
  {
    symbol: 'KO',
    name: 'The Coca-Cola Company',
    market: 'US',
    assetType: 'STOCK',
    sector: 'Consumer Defensive',
    price: 61.20,
    changeRate: 0.35,
    volume: 12000000,
    marketCap: 264000,
    per: 24.0,
    pbr: 9.8,
    psr: 5.8,
    roe: 41.0,
    dividendYield: 3.18,
    debtRatio: 145.0,
    currentRatio: 115.0,
    interestCoverage: 14.5,
    rsi14: 52.0,
    high52w: 63.50,
    low52w: 51.55,
    currency: 'USD'
  },

  // 미국 ETF
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    market: 'US',
    assetType: 'ETF',
    sector: 'Index ETF',
    price: 512.40,
    changeRate: 0.85,
    volume: 68000000,
    marketCap: 520000,
    per: 24.5,
    pbr: 4.5,
    roe: 19.5,
    dividendYield: 1.35,
    currency: 'USD'
  },
  {
    symbol: 'SCHD',
    name: 'Schwab U.S. Dividend Equity ETF',
    market: 'US',
    assetType: 'ETF',
    sector: 'Dividend ETF',
    price: 79.80,
    changeRate: 0.42,
    volume: 3800000,
    marketCap: 55000,
    per: 15.2,
    pbr: 2.8,
    roe: 16.5,
    dividendYield: 3.45,
    currency: 'USD'
  }
];

export const MOCK_NEWS: NewsItem[] = [
  {
    id: 'n1',
    symbol: '005930',
    companyName: '삼성전자',
    title: '삼성전자, HBM3E 12단 양산 본격화… 글로벌 AI 반도체 공급 확대',
    summary: '차세대 고대역폭 메모리(HBM) 경쟁력 강화로 2분기 이후 반도체 실적 턴어라운드 가속화 기대.',
    source: '한국경제',
    date: '2026-08-15 11:20',
    url: '#',
    sentiment: 'positive',
    isDisclosure: false
  },
  {
    id: 'n2',
    symbol: '005930',
    companyName: '삼성전자',
    title: '[공시] 최대주주등소유주식변동신고서 제출',
    summary: '임원 주요주주 특정증권등 소유상황보고서 전자공시 접수.',
    source: 'DART 전자공시',
    date: '2026-08-14 16:45',
    url: '#',
    sentiment: 'neutral',
    isDisclosure: true
  },
  {
    id: 'n3',
    symbol: '000660',
    companyName: 'SK하이닉스',
    title: 'SK하이닉스, 영업이익 사상 최대 전망에 외국인 5일 연속 순매수',
    summary: 'AI 데이터센터 수요 폭증으로 프리미엄 서버 D램 및 NAND 흑자 전환 폭 확대.',
    source: '매일경제',
    date: '2026-08-15 09:30',
    url: '#',
    sentiment: 'positive',
    isDisclosure: false
  },
  {
    id: 'n4',
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    title: 'Apple Unveils Next-Gen AI Services Integrated Across Devices',
    summary: '애플, 온디바이스 AI 기능 강화로 차기 아이폰 교체 사이클 도래 분석 리포트 잇따라.',
    source: 'Bloomberg',
    date: '2026-08-15 07:15',
    url: '#',
    sentiment: 'positive',
    isDisclosure: false
  }
];

export function generateSampleCandles(basePrice: number, days: number = 60): CandleData[] {
  const candles: CandleData[] = [];
  let current = basePrice * 0.85;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // 주말 제외
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const dateStr = d.toISOString().split('T')[0];
    const fluctuation = (Math.random() - 0.48) * (basePrice * 0.03);
    const open = current;
    const close = Math.max(1, current + fluctuation);
    const high = Math.max(open, close) + Math.random() * (basePrice * 0.015);
    const low = Math.min(open, close) - Math.random() * (basePrice * 0.015);
    const volume = Math.floor(Math.random() * 5000000 + 500000);

    candles.push({
      time: dateStr,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume
    });

    current = close;
  }

  return candles;
}
