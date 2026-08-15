const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'stocks.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ SQLite 연결 실패:', err.message);
  } else {
    console.log('✅ SQLite 데이터베이스 연결 성공:', DB_PATH);
    initTablesAndSeed();
  }
});

function initTablesAndSeed() {
  db.serialize(() => {
    // 1. Stocks
    db.run(`
      CREATE TABLE IF NOT EXISTS stocks (
        symbol TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        market TEXT NOT NULL,
        assetType TEXT DEFAULT 'STOCK',
        sector TEXT,
        price REAL,
        changeRate REAL,
        volume INTEGER,
        marketCap REAL,
        per REAL,
        pbr REAL,
        psr REAL,
        roe REAL,
        dividendYield REAL,
        debtRatio REAL,
        currentRatio REAL,
        interestCoverage REAL,
        rsi14 REAL,
        high52w REAL,
        low52w REAL,
        currency TEXT DEFAULT 'KRW',
        warningBadges TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Market Indices
    db.run(`
      CREATE TABLE IF NOT EXISTS market_indices (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        value REAL NOT NULL,
        change REAL,
        changeRate REAL,
        sparkline TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Financials (DART 분기/연간 실적)
    db.run(`
      CREATE TABLE IF NOT EXISTS financials (
        symbol TEXT NOT NULL,
        fiscal_year INTEGER NOT NULL,
        quarter TEXT NOT NULL,
        revenue REAL,
        operating_income REAL,
        net_income REAL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (symbol, fiscal_year, quarter)
      )
    `);

    // 3. Sectors
    db.run(`
      CREATE TABLE IF NOT EXISTS sectors (
        name TEXT PRIMARY KEY,
        changeRate REAL,
        marketCap REAL,
        topStock TEXT
      )
    `);

    // 4. News
    db.run(`
      CREATE TABLE IF NOT EXISTS news (
        id TEXT PRIMARY KEY,
        symbol TEXT,
        companyName TEXT,
        title TEXT NOT NULL,
        summary TEXT,
        source TEXT,
        date TEXT,
        url TEXT,
        sentiment TEXT,
        isDisclosure INTEGER DEFAULT 0
      )
    `);

    // 데이터 존재 여부 확인 후 초기 시드 삽입
    db.get('SELECT COUNT(*) as count FROM stocks', (err, row) => {
      if (!err && row.count === 0) {
        seedInitialData();
      }
    });
  });
}

function seedInitialData() {
  console.log('🌱 SQLite 초기 데이터 시딩 시작...');

  const indices = [
    ['^KS11', '코스피 (KOSPI)', 2664.25, 18.50, 0.70, JSON.stringify([2640, 2645, 2650, 2648, 2658, 2664.25])],
    ['^KQ11', '코스닥 (KOSDAQ)', 872.40, -3.20, -0.37, JSON.stringify([878, 876, 874, 870, 875, 872.40])],
    ['^GSPC', 'S&P 500', 5127.79, 42.15, 0.83, JSON.stringify([5080, 5095, 5110, 5105, 5120, 5127.79])],
    ['^IXIC', '나스닥 종합', 16288.30, 180.40, 1.12, JSON.stringify([16050, 16120, 16180, 16200, 16250, 16288.30])],
    ['USDKRW=X', '원/달러 환율', 1332.80, -4.50, -0.34, JSON.stringify([1340, 1338, 1336, 1335, 1334, 1332.80])]
  ];
  const idxStmt = db.prepare('INSERT OR REPLACE INTO market_indices (code, name, value, change, changeRate, sparkline) VALUES (?, ?, ?, ?, ?, ?)');
  indices.forEach(idx => idxStmt.run(idx));
  idxStmt.finalize();

  const sectors = [
    ['반도체 & AI', 2.85, 850, 'SK하이닉스 (+4.2%)'],
    ['빅테크 (미국)', 1.64, 1200, 'NVIDIA (+3.8%)'],
    ['자동차 & 모빌리티', 0.95, 320, '현대차 (+1.5%)'],
    ['2차전지', -1.82, 280, 'LG에너지솔루션 (-2.1%)'],
    ['금융 & 배당', 0.42, 210, 'KB금융 (+0.8%)'],
    ['바이오 & 헬스케어', -0.65, 190, '삼성바이오 (-0.4%)']
  ];
  const secStmt = db.prepare('INSERT OR REPLACE INTO sectors (name, changeRate, marketCap, topStock) VALUES (?, ?, ?, ?)');
  sectors.forEach(sec => secStmt.run(sec));
  secStmt.finalize();

  const stocks = [
    // 1. 국내 대형주 (KRX)
    ['005930', '삼성전자', 'KRX', 'STOCK', '전기전자', 274500, 2.43, 18420000, 4680000, 13.8, 1.25, 1.62, 10.4, 2.35, 26.5, 245.0, 18.4, 62.5, 290000, 210000, 'KRW', null],
    ['000660', 'SK하이닉스', 'KRX', 'STOCK', '전기전자', 182000, 4.23, 5120000, 1320000, 9.8, 1.85, 2.15, 22.1, 1.15, 48.2, 165.0, 12.8, 71.0, 195000, 110000, 'KRW', null],
    ['373220', 'LG에너지솔루션', 'KRX', 'STOCK', '전기전자', 382000, -1.80, 320000, 890000, 68.5, 4.20, 2.90, 5.8, 0.0, 78.5, 135.0, 4.5, 38.5, 480000, 320000, 'KRW', null],
    ['207940', '삼성바이오로직스', 'KRX', 'STOCK', '의약품', 795000, 0.63, 85000, 565000, 58.2, 5.40, 15.2, 9.8, 0.0, 62.0, 180.0, 14.2, 52.0, 860000, 680000, 'KRW', null],
    ['005380', '현대차', 'KRX', 'STOCK', '운수장비', 248000, 0.81, 1200000, 520000, 5.4, 0.65, 0.35, 13.8, 4.85, 58.0, 140.0, 9.5, 55.4, 275000, 170000, 'KRW', null],
    ['000270', '기아', 'KRX', 'STOCK', '운수장비', 118000, 1.29, 1450000, 472000, 4.8, 0.82, 0.48, 19.5, 5.10, 45.0, 155.0, 18.0, 64.0, 132000, 76000, 'KRW', null],
    ['005490', 'POSCO홀딩스', 'KRX', 'STOCK', '철강금속', 368000, -0.54, 480000, 311000, 18.2, 0.58, 0.42, 3.4, 2.80, 52.0, 175.0, 5.8, 41.0, 495000, 340000, 'KRW', null],
    ['105560', 'KB금융', 'KRX', 'STOCK', '금융업', 79200, 1.15, 1650000, 310000, 5.9, 0.48, 0.80, 9.6, 5.20, 115.0, 110.0, 6.2, 58.2, 84000, 48000, 'KRW', null],
    ['055550', '신한지주', 'KRX', 'STOCK', '금융업', 49500, 0.81, 1820000, 252000, 5.2, 0.42, 0.65, 8.8, 5.45, 120.0, 105.0, 5.5, 54.0, 54000, 34000, 'KRW', null],
    ['035420', 'NAVER', 'KRX', 'STOCK', '서비스업', 172000, -0.58, 680000, 280000, 21.5, 1.15, 2.80, 6.8, 0.85, 38.0, 195.0, 15.0, 42.0, 220000, 155000, 'KRW', null],
    ['035720', '카카오', 'KRX', 'STOCK', '서비스업', 39800, -1.24, 1250000, 177000, 34.0, 1.35, 2.10, 3.2, 0.35, 65.0, 140.0, 4.8, 36.0, 61000, 35000, 'KRW', null],
    ['068270', '셀트리온', 'KRX', 'STOCK', '의약품', 195000, 2.10, 980000, 418000, 38.5, 2.85, 12.0, 8.2, 0.50, 42.0, 210.0, 11.5, 61.0, 240000, 140000, 'KRW', null],
    ['006400', '삼성SDI', 'KRX', 'STOCK', '전기전자', 342000, -2.15, 240000, 235000, 16.5, 1.10, 1.05, 7.4, 0.30, 72.0, 125.0, 7.2, 32.0, 490000, 310000, 'KRW', null],
    ['012330', '현대모비스', 'KRX', 'STOCK', '운수장비', 228000, 0.44, 180000, 212000, 5.8, 0.48, 0.38, 8.9, 2.15, 42.0, 190.0, 16.0, 51.0, 260000, 205000, 'KRW', null],
    ['999999', '부실건설 (가상)', 'KRX', 'STOCK', '건설업', 3200, -3.5, 420000, 450, 2.8, 0.35, 0.15, 1.2, 0.0, 320.0, 82.0, 0.6, 28.0, 5000, 3000, 'KRW', JSON.stringify(['가치함정 의심', '이자보상 1 미만', '고부채(300%↑)'])],

    // 2. 국내 대표 ETF (KRX)
    ['069500', 'KODEX 200', 'KRX', 'ETF', '국내 대표지수', 36250, 0.69, 4500000, 68000, 11.5, 0.98, null, 8.5, 2.10, null, null, null, 56.0, 38000, 32000, 'KRW', null],
    ['360750', 'TIGER 미국나스닥100', 'KRX', 'ETF', '해외 테크지수', 104200, 1.25, 890000, 32000, 28.5, 4.80, null, 22.0, 0.45, null, null, null, 65.0, 112000, 78000, 'KRW', null],
    ['122630', 'KODEX 레버리지', 'KRX', 'ETF', '국내 파생지수', 18450, 1.37, 12500000, 24000, null, null, null, null, 0.0, null, null, null, 58.0, 22000, 14000, 'KRW', null],
    ['091160', 'KODEX 반도체', 'KRX', 'ETF', '국내 섹터테마', 39500, 3.12, 1850000, 11500, 14.2, 1.65, null, 14.5, 0.90, null, null, null, 68.0, 43000, 26000, 'KRW', null],

    // 3. 미국 우량주 (US)
    ['AAPL', 'Apple Inc.', 'US', 'STOCK', 'Technology', 224.50, 1.25, 48500000, 3420000, 33.5, 45.2, 8.9, 145.0, 0.52, 140.0, 105.0, 28.0, 58.0, 237.0, 164.0, 'USD', null],
    ['MSFT', 'Microsoft Corp.', 'US', 'STOCK', 'Technology', 428.00, 1.45, 21500000, 3180000, 36.2, 12.8, 13.2, 38.5, 0.72, 42.0, 135.0, 34.0, 61.0, 468.0, 315.0, 'USD', null],
    ['NVDA', 'NVIDIA Corp.', 'US', 'STOCK', 'Semiconductors', 128.80, 3.82, 85200000, 3160000, 65.4, 52.0, 32.5, 115.0, 0.03, 22.0, 380.0, 45.0, 68.5, 140.0, 40.0, 'USD', null],
    ['GOOGL', 'Alphabet Inc.', 'US', 'STOCK', 'Communication', 165.50, -0.42, 28000000, 2050000, 24.1, 6.8, 6.5, 29.8, 0.48, 12.0, 210.0, 55.0, 48.0, 191.0, 128.0, 'USD', null],
    ['AMZN', 'Amazon.com Inc.', 'US', 'STOCK', 'Consumer Cyclical', 182.20, 0.95, 34000000, 1910000, 42.5, 8.5, 3.2, 21.4, 0.0, 55.0, 110.0, 12.0, 53.0, 201.0, 118.0, 'USD', null],
    ['TSLA', 'Tesla Inc.', 'US', 'STOCK', 'Automotive', 218.00, -2.40, 68000000, 695000, 58.0, 10.5, 7.2, 18.2, 0.0, 18.0, 175.0, 19.0, 44.0, 271.0, 138.0, 'USD', null],
    ['KO', 'The Coca-Cola Co.', 'US', 'STOCK', 'Consumer Defensive', 68.40, 0.15, 12400000, 295000, 24.8, 11.2, 6.4, 42.0, 3.10, 145.0, 115.0, 14.5, 52.0, 72.0, 51.0, 'USD', null],
    ['JNJ', 'Johnson & Johnson', 'US', 'STOCK', 'Healthcare', 162.00, 0.38, 8500000, 389000, 17.5, 5.2, 4.5, 31.0, 3.05, 48.0, 120.0, 22.0, 51.0, 168.0, 143.0, 'USD', null],

    // 4. 미국 대표 ETF (US)
    ['SPY', 'SPDR S&P 500 ETF Trust', 'US', 'ETF', 'US Broad Market', 512.50, 0.85, 52000000, 5200000, 26.2, 4.6, null, 18.5, 1.28, null, null, null, 61.0, 550.0, 410.0, 'USD', null],
    ['QQQ', 'Invesco QQQ Trust', 'US', 'ETF', 'US Tech Index', 478.20, 1.35, 38000000, 2800000, 32.5, 7.8, null, 26.0, 0.58, null, null, null, 64.0, 503.0, 350.0, 'USD', null],
    ['SCHD', 'Schwab US Dividend Equity ETF', 'US', 'ETF', 'US High Dividend', 82.30, 0.22, 3200000, 580000, 15.8, 2.8, null, 24.5, 3.42, null, null, null, 54.0, 84.5, 68.0, 'USD', null],
    ['SOXX', 'iShares Semiconductor ETF', 'US', 'ETF', 'Semiconductor Index', 228.50, 2.80, 12000000, 145000, 38.0, 8.5, null, 28.0, 0.75, null, null, null, 66.0, 268.0, 140.0, 'USD', null]
  ];

  const stkStmt = db.prepare(`
    INSERT OR REPLACE INTO stocks (
      symbol, name, market, assetType, sector, price, changeRate, volume, marketCap,
      per, pbr, psr, roe, dividendYield, debtRatio, currentRatio, interestCoverage,
      rsi14, high52w, low52w, currency, warningBadges
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stocks.forEach(stk => stkStmt.run(stk));
  stkStmt.finalize();

  const news = [
    ['n1', '005930', '삼성전자', '삼성전자, HBM3E 12단 양산 본격화… 글로벌 AI 반도체 공급 확대', '차세대 고대역폭 메모리(HBM) 경쟁력 강화로 2분기 이후 반도체 실적 턴어라운드 가속화 기대.', '한국경제', '2026-08-15 11:20', '#', 'positive', 0],
    ['n2', '005930', '삼성전자', '[공시] 최대주주등소유주식변동신고서 제출', '임원 주요주주 특정증권등 소유상황보고서 전자공시 접수.', 'DART 전자공시', '2026-08-14 16:45', '#', 'neutral', 1],
    ['n3', '000660', 'SK하이닉스', 'SK하이닉스, 영업이익 사상 최대 전망에 외국인 5일 연속 순매수', 'AI 데이터센터 수요 폭증으로 프리미엄 서버 D램 및 NAND 흑자 전환 폭 확대.', '매일경제', '2026-08-15 09:30', '#', 'positive', 0],
    ['n4', 'AAPL', 'Apple Inc.', 'Apple Unveils Next-Gen AI Services Integrated Across Devices', '애플, 온디바이스 AI 기능 강화로 차기 아이폰 교체 사이클 도래 분석 리포트 잇따라.', 'Bloomberg', '2026-08-15 07:15', '#', 'positive', 0]
  ];
  const newsStmt = db.prepare('INSERT OR REPLACE INTO news (id, symbol, companyName, title, summary, source, date, url, sentiment, isDisclosure) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  news.forEach(n => newsStmt.run(n));
  newsStmt.finalize();

  console.log('✅ SQLite 초기 데이터 시딩 완료.');
}

// Data Access Helpers
function getIndices() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM market_indices', (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(r => ({
        ...r,
        sparkline: r.sparkline ? JSON.parse(r.sparkline) : []
      })));
    });
  });
}

function getSectors() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM sectors', (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getStocks(filters = {}) {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM stocks WHERE 1=1';
    const params = [];

    if (filters.market && filters.market !== 'ALL') {
      if (filters.market === 'KRX') {
        query += " AND (market = 'KRX' OR currency = 'KRW')";
      } else if (filters.market === 'US') {
        query += " AND (market = 'US' OR currency = 'USD')";
      }
    }

    if (filters.assetType && filters.assetType !== 'ALL') {
      query += ' AND assetType = ?';
      params.push(filters.assetType);
    }

    if (filters.maxPer) {
      query += ' AND per IS NOT NULL AND per <= ?';
      params.push(parseFloat(filters.maxPer));
    }

    if (filters.maxPbr) {
      query += ' AND pbr IS NOT NULL AND pbr <= ?';
      params.push(parseFloat(filters.maxPbr));
    }

    if (filters.minRoe) {
      query += ' AND roe IS NOT NULL AND roe >= ?';
      params.push(parseFloat(filters.minRoe));
    }

    if (filters.minDividend) {
      query += ' AND dividendYield IS NOT NULL AND dividendYield >= ?';
      params.push(parseFloat(filters.minDividend));
    }

    if (filters.maxDebtRatio) {
      query += ' AND (debtRatio IS NULL OR debtRatio <= ?)';
      params.push(parseFloat(filters.maxDebtRatio));
    }

    if (filters.searchQuery) {
      query += ' AND (name LIKE ? OR symbol LIKE ?)';
      params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`);
    }

    query += ' ORDER BY marketCap DESC';

    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(r => ({
        ...r,
        warningBadges: r.warningBadges ? JSON.parse(r.warningBadges) : undefined
      })));
    });
  });
}

function getStock(symbol) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM stocks WHERE symbol = ?', [symbol], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      resolve({
        ...row,
        warningBadges: row.warningBadges ? JSON.parse(row.warningBadges) : undefined
      });
    });
  });
}

function getNews() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM news ORDER BY date DESC', (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(r => ({
        ...r,
        isDisclosure: Boolean(r.isDisclosure)
      })));
    });
  });
}

module.exports = {
  db,
  getIndices,
  getSectors,
  getStocks,
  getStock,
  getNews
};
