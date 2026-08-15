const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getIndices, getSectors, getStocks, getStock, getNews, getWatchlist, addWatchlist, removeWatchlist } = require('./db');
const { runRealtimeCollection, runDynamicCollection, syncSingleStock, fetchStockCandles, fetchDetailedStockMetrics } = require('./collector');
const { evaluateMarketQuantMetrics } = require('./quantEngine');
const { runDartFinancialSync } = require('./dartCollector');

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

// 10. 동적 종목 디스커버리 랭킹 (한국 + 미국 지원) - 초고속 DB 즉시 반환 + 비동기 백그라운드 갱신
app.get('/api/rankings/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { market } = req.query; // 'ALL', 'KRX', 'US'
    
    let orderBy = 'marketCap DESC';
    if (category === 'volume') orderBy = 'volume DESC';
    else if (category === 'rise') orderBy = 'changeRate DESC';
    else if (category === 'tech') orderBy = 'roe DESC';

    let whereConditions = ['price > 0'];
    if (market === 'KRX') {
      whereConditions.push("(market = 'KRX' OR currency = 'KRW')");
    } else if (market === 'US') {
      whereConditions.push("(market = 'US' OR currency = 'USD')");
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const query = `SELECT * FROM stocks ${whereClause} ORDER BY ${orderBy} LIMIT 60`;

    const { db } = require('./db');
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('DB Rankings error:', err);
        return res.status(500).json({ error: 'Database ranking query failed' });
      }

      // 백그라운드에서 비동기로 추가 수집 (클라이언트 응답 지연 없음)
      runDynamicCollection(category, market || 'ALL').catch(e => {
        console.warn('[Background Dynamic Collection Warning]', e.message);
      });

      res.json({
        success: true,
        category,
        market: market || 'ALL',
        count: rows.length,
        data: rows,
        timestamp: new Date().toISOString()
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

// 10. 프로덕션 프론트엔드 정적 파일 서빙 (Single Port 통합 배포)
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
});
