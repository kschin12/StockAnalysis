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
    // symbol, name, market, assetType, sector, price, changeRate, volume, marketCap, per, pbr, psr, roe, dividendYield, debtRatio, currentRatio, interestCoverage, rsi14, high52w, low52w, currency, warningBadges
    ['005930', '삼성전자', 'KRX', 'STOCK', '전기전자', 78500, 1.68, 15420000, 4680000, 13.8, 1.25, 1.62, 10.4, 2.35, 26.5, 245.0, 18.4, 62.5, 86000, 67000, 'KRW', null],
    ['000660', 'SK하이닉스', 'KRX', 'STOCK', '전기전자', 182000, 4.23, 5120000, 1320000, 9.8, 1.85, 2.15, 22.1, 1.15, 48.2, 165.0, 12.8, 71.0, 195000, 110000, 'KRW', null],
    ['005380', '현대차', 'KRX', 'STOCK', '운수장비', 248000, 0.81, 1200000, 520000, 5.4, 0.65, 0.35, 13.8, 4.85, 58.0, 140.0, 9.5, 55.4, 275000, 170000, 'KRW', null],
    ['105560', 'KB금융', 'KRX', 'STOCK', '금융업', 79200, 1.15, 1650000, 310000, 5.9, 0.48, 0.80, 9.6, 5.20, 115.0, 110.0, 6.2, 58.2, 84000, 48000, 'KRW', null],
    ['035420', 'NAVER', 'KRX', 'STOCK', '서비스업', 172000, -0.58, 680000, 280000, 21.5, 1.15, 2.80, 6.8, 0.85, 38.0, 195.0, 15.0, 42.0, 220000, 155000, 'KRW', null],
    ['999999', '부실건설 (가상)', 'KRX', 'STOCK', '건설업', 3200, -3.5, 420000, 450, 2.8, 0.35, 0.15, 1.2, 0.0, 320.0, 82.0, 0.6, 28.0, 5000, 3000, 'KRW', JSON.stringify(['가치함정 의심', '이자보상배율 1 미만', '고부채(300%↑)'])],
    ['069500', 'KODEX 200', 'KRX', 'ETF', '국내 대표지수', 36250, 0.69, 4500000, 68000, 11.5, 0.98, null, 8.5, 2.10, null, null, null, 56.0, 38000, 32000, 'KRW', null],
    ['360750', 'TIGER 미국S&P500', 'KRX', 'ETF', '해외 대표지수', 18450, 0.82, 2800000, 45000, 22.0, 4.2, null, 18.0, 1.45, null, null, null, 61.0, 19000, 14000, 'KRW', null],
    ['AAPL', 'Apple Inc.', 'US', 'STOCK', 'Technology', 188.50, 1.25, 54000000, 2900000, 28.5, 38.0, 7.4, 145.0, 0.55, 140.0, 105.0, 28.0, 64.0, 199.62, 164.08, 'USD', null],
    ['NVDA', 'NVIDIA Corporation', 'US', 'STOCK', 'Technology', 885.20, 3.84, 48000000, 2180000, 42.0, 35.0, 26.5, 91.5, 0.08, 42.0, 350.0, 45.0, 73.5, 974.00, 395.00, 'USD', null],
    ['KO', 'The Coca-Cola Company', 'US', 'STOCK', 'Consumer Defensive', 61.20, 0.35, 12000000, 264000, 24.0, 9.8, 5.8, 41.0, 3.18, 145.0, 115.0, 14.5, 52.0, 63.50, 51.55, 'USD', null],
    ['SPY', 'SPDR S&P 500 ETF Trust', 'US', 'ETF', 'Index ETF', 512.40, 0.85, 68000000, 520000, 24.5, 4.5, null, 19.5, 1.35, null, null, null, 62.0, 518.00, 410.00, 'USD', null],
    ['SCHD', 'Schwab U.S. Dividend Equity ETF', 'US', 'ETF', 'Dividend ETF', 79.80, 0.42, 3800000, 55000, 15.2, 2.8, null, 16.5, 3.45, null, null, null, 54.0, 82.00, 70.00, 'USD', null]
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
