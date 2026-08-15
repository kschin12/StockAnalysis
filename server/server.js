const express = require('express');
const cors = require('cors');
const { getIndices, getSectors, getStocks, getStock, getNews } = require('./db');
const { runRealtimeCollection } = require('./collector');
const { evaluateMarketQuantMetrics } = require('./quantEngine');

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
    const stock = await getStock(symbol);
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    res.json(stock);
  } catch (err) {
    console.error('Error fetching stock detail:', err);
    res.status(500).json({ error: 'Failed to fetch stock detail' });
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

// 8. 시장 통계 기반 동적 퀀트 추천 기준 산출
app.get('/api/quant/metrics', async (req, res) => {
  try {
    const metrics = await evaluateMarketQuantMetrics();
    res.json(metrics);
  } catch (err) {
    console.error('Quant metrics error:', err);
    res.status(500).json({ error: 'Failed to evaluate quant metrics' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AlphaQuant REST API Server listening on port ${PORT}`);
  console.log(`👉 http://localhost:${PORT}/api/health`);
});
