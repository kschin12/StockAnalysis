const { db } = require('./db');

// 1. 네이버 증권 무료 실시간 시세 수집 (국내 주식)
async function fetchNaverQuote(symbol) {
  try {
    const url = `https://polling.finance.naver.com/api/realtime/domestic/stock/${symbol}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const s = data.datas?.[0];
    if (!s) return null;

    const price = parseFloat(String(s.closePrice).replace(/,/g, '')) || 0;
    const changeRate = parseFloat(s.fluctuationsRatio) || 0;
    const volume = parseInt(String(s.accumulatedTradingVolume).replace(/,/g, ''), 10) || 0;

    return {
      symbol,
      price,
      changeRate,
      volume
    };
  } catch (err) {
    console.warn(`[Collector] 네이버 ${symbol} 수집 실패:`, err.message);
    return null;
  }
}

// 2. Yahoo Finance 무료 실시간 시세 수집 (지수 및 미국 주식/ETF)
async function fetchYahooQuote(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.previousClose || meta.chartPreviousClose || price;
    const change = price - prevClose;
    const changeRate = prevClose ? (change / prevClose) * 100 : 0;
    const volume = meta.regularMarketVolume || 0;

    const quotes = result.indicators?.quote?.[0]?.close || [];
    const sparkline = quotes.filter(p => typeof p === 'number' && !isNaN(p)).map(p => Math.round(p * 100) / 100);

    return {
      symbol,
      price,
      change,
      changeRate,
      volume,
      sparkline
    };
  } catch (err) {
    console.warn(`[Collector] Yahoo ${symbol} 수집 실패:`, err.message);
    return null;
  }
}

// 주요 시장 지수 및 환율 실시간 업데이트
async function updateMarketIndices() {
  const indexMap = [
    { yahooSym: '^KS11', code: '^KS11', name: '코스피 (KOSPI)' },
    { yahooSym: '^KQ11', code: '^KQ11', name: '코스닥 (KOSDAQ)' },
    { yahooSym: '^GSPC', code: '^GSPC', name: 'S&P 500' },
    { yahooSym: '^IXIC', code: '^IXIC', name: '나스닥 종합' },
    { yahooSym: 'USDKRW=X', code: 'USDKRW=X', name: '원/달러 환율' }
  ];

  const results = [];

  for (const item of indexMap) {
    const quote = await fetchYahooQuote(item.yahooSym);
    if (quote && quote.price) {
      const sparklineJson = JSON.stringify(quote.sparkline.length > 0 ? quote.sparkline : [quote.price]);
      db.run(
        `INSERT OR REPLACE INTO market_indices (code, name, value, change, changeRate, sparkline, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
        [item.code, item.name, quote.price, quote.change, quote.changeRate, sparklineJson]
      );
      results.push({ code: item.code, name: item.name, value: quote.price, changeRate: quote.changeRate });
    }
  }

  return results;
}

// 상장 주식 실시간 현재가 및 거래량 업데이트 (네이버 + Yahoo 하이브리드)
async function updateStockPrices() {
  // 국내 종목: 네이버 증권 초고속 실시간 수집
  const krxSymbols = [
    '005930', '000660', '373220', '207940', '005380',
    '000270', '005490', '105560', '055550', '035420',
    '035720', '068270', '006400', '012330', '069500',
    '360750', '122630', '091160'
  ];

  const updatedStocks = [];

  for (const sym of krxSymbols) {
    const quote = await fetchNaverQuote(sym);
    if (quote && quote.price > 0) {
      db.run(
        `UPDATE stocks 
         SET price = ?, changeRate = ?, volume = ?, updated_at = datetime('now', 'localtime') 
         WHERE symbol = ?`,
        [quote.price, quote.changeRate, quote.volume, sym]
      );
      updatedStocks.push({ symbol: sym, price: quote.price, changeRate: quote.changeRate });
    }
  }

  // 미국 종목: Yahoo Finance 수집
  const usStockMap = [
    { dbSym: 'AAPL', yahooSym: 'AAPL' },
    { dbSym: 'MSFT', yahooSym: 'MSFT' },
    { dbSym: 'NVDA', yahooSym: 'NVDA' },
    { dbSym: 'GOOGL', yahooSym: 'GOOGL' },
    { dbSym: 'AMZN', yahooSym: 'AMZN' },
    { dbSym: 'TSLA', yahooSym: 'TSLA' },
    { dbSym: 'KO', yahooSym: 'KO' },
    { dbSym: 'JNJ', yahooSym: 'JNJ' },
    { dbSym: 'SPY', yahooSym: 'SPY' },
    { dbSym: 'QQQ', yahooSym: 'QQQ' },
    { dbSym: 'SCHD', yahooSym: 'SCHD' },
    { dbSym: 'SOXX', yahooSym: 'SOXX' }
  ];

  for (const item of usStockMap) {
    const quote = await fetchYahooQuote(item.yahooSym);
    if (quote && quote.price) {
      db.run(
        `UPDATE stocks 
         SET price = ?, changeRate = ?, volume = ?, updated_at = datetime('now', 'localtime') 
         WHERE symbol = ?`,
        [quote.price, quote.changeRate, quote.volume, item.dbSym]
      );
      updatedStocks.push({ symbol: item.dbSym, price: quote.price, changeRate: quote.changeRate });
    }
  }

  return updatedStocks;
}

// 실시간 수집 마스터 실행 함수
async function runRealtimeCollection() {
  console.log('⚡ 실시간 시장 데이터 수집 시작 (네이버 + Yahoo)...');
  const indices = await updateMarketIndices();
  const stocks = await updateStockPrices();
  console.log(`✅ 실시간 수집 완료 (지수 ${indices.length}건, 종목 ${stocks.length}건 갱신)`);
  return {
    success: true,
    updatedIndicesCount: indices.length,
    updatedStocksCount: stocks.length,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  fetchNaverQuote,
  fetchYahooQuote,
  runRealtimeCollection
};
