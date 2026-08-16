const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getIndices, getSectors, getStocks, getStock, getNews, getWatchlist, addWatchlist, removeWatchlist, computeStockWarningBadges, computeStockMomentumBadges } = require('./db');
const { runRealtimeCollection, runDynamicCollection, syncSingleStock, fetchStockCandles, fetchDetailedStockMetrics, refreshAllRankingsAndSave, getCollectorSettings, saveCollectorSettings } = require('./collector');
const { evaluateMarketQuantMetrics } = require('./quantEngine');
const { runDartFinancialSync } = require('./dartCollector');
const { syncAllRealNews, searchLatestNewsForStock } = require('./newsCollector');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 2. Market Indices (지수 & 환율)
app.get('/api/indices', async (req, res) => {
  try {
    const indices = await getIndices();
    res.json(indices);
  } catch (err) {
    console.error('Error fetching indices:', err);
    res.status(500).json({ error: 'Failed to fetch indices' });
  }
});

// 3. Sectors (섹터 등락률)
app.get('/api/sectors', async (req, res) => {
  try {
    const sectors = await getSectors();
    res.json(sectors);
  } catch (err) {
    console.error('Error fetching sectors:', err);
    res.status(500).json({ error: 'Failed to fetch sectors' });
  }
});

// 4. Stocks (스크리너 필터 쿼리)
app.get('/api/stocks', async (req, res) => {
  try {
    const {
      market,
      assetType,
      maxPer,
      maxPbr,
      minRoe,
      minDividend,
      maxDebtRatio,
      searchQuery
    } = req.query;

    const stocks = await getStocks({
      market,
      assetType,
      maxPer,
      maxPbr,
      minRoe,
      minDividend,
      maxDebtRatio,
      searchQuery
    });

    res.json(stocks);
  } catch (err) {
    console.error('Error fetching stocks:', err);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

// 5. Stock Detail
app.get('/api/stocks/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    let stock = await getStock(symbol);
    if (!stock) {
      // 자동 실시간 수집 시도
      await syncSingleStock(symbol);
      stock = await getStock(symbol);
    }
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    res.json(stock);
  } catch (err) {
    console.error('Error fetching stock detail:', err);
    res.status(500).json({ error: 'Failed to fetch stock detail' });
  }
});

// 5-1. Real Daily Candles (실제 일봉 OHLCV 차트 데이터)
app.get('/api/stocks/:symbol/candles', async (req, res) => {
  try {
    const { symbol } = req.params;
    const days = parseInt(req.query.days, 10) || 90;
    const candles = await fetchStockCandles(symbol, days);
    res.json(candles);
  } catch (err) {
    console.error('Error fetching stock candles:', err);
    res.status(500).json({ error: 'Failed to fetch candles' });
  }
});

// 6. News & Disclosures
app.get('/api/news', async (req, res) => {
  try {
    const news = await getNews();
    res.json(news);
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// 6-1. 특정 종목 최신 뉴스 및 공시 실시간 맞춤 검색
app.post('/api/stocks/:symbol/news/search', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const companyName = req.body?.name || req.query?.name;
    const news = await searchLatestNewsForStock(symbol, companyName);
    res.json({ success: true, count: news.length, data: news });
  } catch (err) {
    console.error('Error searching stock news:', err);
    res.status(500).json({ error: 'Failed to search stock news' });
  }
});

// 7. 실시간 시세 및 지수 수집 실행 (온디맨드 트리거)
app.post('/api/collect/realtime', async (req, res) => {
  try {
    const result = await runRealtimeCollection();
    res.json(result);
  } catch (err) {
    console.error('Realtime collection error:', err);
    res.status(500).json({ error: 'Failed to collect realtime data' });
  }
});

// 7-1. 수집 조건 설정 조회 및 저장 API
app.get('/api/collector/settings', (req, res) => {
  try {
    const settings = getCollectorSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

app.post('/api/collector/settings', (req, res) => {
  try {
    const updated = saveCollectorSettings(req.body || {});
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Save settings error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// 7-2. 맞춤 유니버스 종목 수집 실행 (사용자 정의 조건 적용)
app.post('/api/collect/universe', async (req, res) => {
  try {
    const customConfig = req.body;
    const result = await refreshAllRankingsAndSave(customConfig);
    res.json(result);
  } catch (err) {
    console.error('Universe collect error:', err);
    res.status(500).json({ error: 'Failed to collect custom universe' });
  }
});

// 8. DART 재무제표 동기화 실행 (Node.js 기반)
app.post('/api/collect/dart', async (req, res) => {
  try {
    const result = await runDartFinancialSync();
    res.json(result);
  } catch (err) {
    console.error('DART sync error:', err);
    res.status(500).json({ error: 'Failed to sync DART data' });
  }
});

// 8-1. 전체 뉴스 및 DART 공시 실시간 수집 실행 (온디맨드 트리거)
app.post('/api/collect/news', async (req, res) => {
  try {
    await syncAllRealNews();
    const news = await getNews();
    res.json({ success: true, count: news.length, data: news });
  } catch (err) {
    console.error('News collection error:', err);
    res.status(500).json({ error: 'Failed to collect news' });
  }
});

// 8-3. 한국투자증권 (KIS) Open API 계좌 상태, 실시간 잔고 및 주문
const { kisService } = require('./kisService');

app.get('/api/kis/status', (req, res) => {
  try {
    const status = kisService.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/kis/balance', async (req, res) => {
  try {
    const balance = await kisService.getAccountBalance();
    res.json(balance);
  } catch (err) {
    console.error('KIS balance error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/kis/order', async (req, res) => {
  try {
    const { symbol, type, quantity, price, orderType } = req.body;
    if (!symbol || !quantity) {
      return res.status(400).json({ error: '종목코드(symbol)와 수량(quantity)은 필수입니다.' });
    }
    const result = await kisService.sendOrder({ symbol, type, quantity, price, orderType });
    res.json(result);
  } catch (err) {
    console.error('KIS order error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 8-2. DB 데이터 내용 초기화 및 신규 클라우드 라이브 데이터 수집 (테이블 구조 유지)
app.post('/api/admin/reset-data', async (req, res) => {
  try {
    const { db } = require('./db');
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('DELETE FROM stocks;');
        db.run('DELETE FROM market_indices;');
        db.run('DELETE FROM financials;');
        db.run('DELETE FROM sectors;');
        db.run('DELETE FROM news;');
        db.run('DELETE FROM market_rankings;', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
    console.log('🧹 [Admin] 구글 클라우드 DB 테이블 데이터 내용 초기화 완료');

    // 즉시 라이브 데이터 새로 수집
    const rankingRes = await refreshAllRankingsAndSave();
    const newsRes = await syncAllRealNews();

    res.json({
      success: true,
      message: 'DB 데이터 초기화 및 최신 클라우드 실시간 수집 완료',
      rankings: rankingRes,
      news: newsRes
    });
  } catch (err) {
    console.error('Reset data error:', err);
    res.status(500).json({ error: 'Failed to reset data', details: err.message });
  }
});

// 9. 시장 통계 기반 동적 퀀트 추천 기준 산출
app.get('/api/quant/metrics', async (req, res) => {
  try {
    const metrics = await evaluateMarketQuantMetrics();
    res.json(metrics);
  } catch (err) {
    console.error('Quant metrics error:', err);
    res.status(500).json({ error: 'Failed to evaluate quant metrics' });
  }
});

// 10. 동적 종목 디스커버리 랭킹 (한국 + 미국 지원) - 사전 캐시 1ms 초고속 응답
app.get('/api/rankings/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { market } = req.query; // 'ALL', 'KRX', 'US', 'KOSPI', 'KOSDAQ'
    const targetMarket = market || 'ALL';

    const { db } = require('./db');

    // 1. 캐시 테이블 market_rankings 에서 1위~60위 즉시 조회
    let query = `
      SELECT r.ranking, s.* FROM market_rankings r
      JOIN stocks s ON r.symbol = s.symbol
      WHERE r.category = ? AND (r.market = ? OR ? = 'ALL')
      ORDER BY r.ranking ASC
      LIMIT 60
    `;

    db.all(query, [category, targetMarket, targetMarket], (err, rows) => {
      if (!err && rows && rows.length > 0) {
        const enriched = rows.map(r => ({
          ...r,
          warningBadges: computeStockWarningBadges(r),
          momentumBadges: computeStockMomentumBadges(r)
        }));
        return res.json({
          success: true,
          category,
          market: targetMarket,
          count: enriched.length,
          data: enriched,
          timestamp: new Date().toISOString()
        });
      }

      // 2. 캐시가 아직 비어있을 경우 stocks 테이블에서 즉시 정렬 반환
      let orderBy = 's.marketCap DESC';
      if (category === 'volume') orderBy = 's.volume DESC';
      else if (category === 'rise') orderBy = 's.changeRate DESC';
      else if (category === 'fall') orderBy = 's.changeRate ASC';

      let whereConditions = ['s.price > 0'];
      if (targetMarket === 'KRX') {
        whereConditions.push("(s.market = 'KRX' OR s.currency = 'KRW')");
      } else if (targetMarket === 'US') {
        whereConditions.push("(s.market = 'US' OR s.currency = 'USD')");
      }

      const fallbackQuery = `SELECT * FROM stocks s WHERE ${whereConditions.join(' AND ')} ORDER BY ${orderBy} LIMIT 60`;
      db.all(fallbackQuery, [], (err2, fallbackRows) => {
        const enrichedFallback = (fallbackRows || []).map(r => ({
          ...r,
          warningBadges: computeStockWarningBadges(r),
          momentumBadges: computeStockMomentumBadges(r)
        }));
        res.json({
          success: true,
          category,
          market: targetMarket,
          count: enrichedFallback.length,
          data: enrichedFallback,
          timestamp: new Date().toISOString()
        });
      });
    });
  } catch (err) {
    console.error('Rankings error:', err);
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

// 11. Watchlist (관심종목) API
app.get('/api/watchlist', async (req, res) => {
  try {
    const list = await getWatchlist();
    res.json(list);
  } catch (err) {
    console.error('Watchlist fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

app.post('/api/watchlist', async (req, res) => {
  try {
    const { symbol, name } = req.body;
    if (!symbol) return res.status(400).json({ error: 'Symbol is required' });
    const cleanSym = symbol.trim().toUpperCase();
    
    // 한국/미국 주식 실시간 시세 및 기본정보 동기화
    await syncSingleStock(cleanSym, name || '');
    await addWatchlist(cleanSym, name || cleanSym);
    
    res.json({ success: true, symbol: cleanSym });
  } catch (err) {
    console.error('Watchlist add error:', err);
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
});

app.delete('/api/watchlist/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const cleanSym = symbol.trim().toUpperCase();
    await removeWatchlist(cleanSym);
    res.json({ success: true, symbol: cleanSym });
  } catch (err) {
    console.error('Watchlist remove error:', err);
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
});

// 12. 프로덕션 프론트엔드 정적 파일 서빙 (Single Port 통합 배포)
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`🚀 AlphaQuant REST API Server listening on port ${PORT}`);
  console.log(`👉 Web App & API: http://localhost:${PORT}`);

  // 서버 최초 시작 2초 후 초기 DB 동기화 순차 실행 (신규 배포 시 즉각 데이터 확보)
  setTimeout(async () => {
    try {
      await refreshAllRankingsAndSave();
      await syncAllRealNews();
    } catch (e) {
      console.warn('Initial background sync warning:', e.message);
    }
  }, 2000);

  // =========================================================================
  // 🔍 [DAILY_6AM_SCHEDULE] 미접속 시 매일 오전 6시(06:00) 전 테이블 백엔드 자동 수집
  // 검색 키워드: DAILY_6AM_SCHEDULE 또는 '매일 6시 수집'
  // 수집 대상: 시세, 지수, 섹터, 뉴스, DART 공시, 재무제표, 랭킹 전 테이블
  // =========================================================================
  let lastDailySyncDate = '';

  async function runFullDailySync() {
    console.log(`[${new Date().toISOString()}] 🌅 [Daily 06:00 AM Sync] 전 테이블(시세, 지수, 섹터, 뉴스, 공시, 재무, 랭킹) 일괄 수집 시작...`);
    try {
      // 1. 시장 지수, 당일 상위 종목 시세 & 랭킹 수집 및 DB 정돈
      await refreshAllRankingsAndSave();
      // 2. 실시간 뉴스 및 DART 공시 수집
      await syncAllRealNews();
      // 3. DART 재무제표 동기화
      await runDartFinancialSync();
      console.log(`[${new Date().toISOString()}] ✅ [Daily 06:00 AM Sync] 전 테이블 일괄 동기화 완료!`);
    } catch (err) {
      console.warn(`❌ [Daily 06:00 AM Sync Error]:`, err.message);
    }
  }

  // 매 30초마다 현재 시각을 확인하여 매일 오전 6시(06:00)에 1회 자동 수집
  setInterval(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    // 매일 오전 6시 정각 (06:00) 감지
    if (now.getHours() === 6 && now.getMinutes() === 0 && lastDailySyncDate !== todayStr) {
      lastDailySyncDate = todayStr;
      runFullDailySync();
    }
  }, 30000);
});
