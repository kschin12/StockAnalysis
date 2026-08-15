const { db } = require('./db');

// Yahoo Finance 무료 차트 엔드포인트를 통한 실시간 시세 수집
async function fetchYahooQuote(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
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

    // 5일간 종가 스파크라인 추출
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
    console.warn(`[Collector] ${symbol} 시세 수집 실패:`, err.message);
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

// 상장 주식 실시간 현재가 및 거래량 업데이트
async function updateStockPrices() {
  const stockMap = [
    { dbSym: '005930', yahooSym: '005930.KS' },
    { dbSym: '000660', yahooSym: '000660.KS' },
    { dbSym: '005380', yahooSym: '005380.KS' },
    { dbSym: '105560', yahooSym: '105560.KS' },
    { dbSym: '035420', yahooSym: '035420.KS' },
    { dbSym: '069500', yahooSym: '069500.KS' },
    { dbSym: '360750', yahooSym: '360750.KS' },
    { dbSym: 'AAPL', yahooSym: 'AAPL' },
    { dbSym: 'NVDA', yahooSym: 'NVDA' },
    { dbSym: 'KO', yahooSym: 'KO' },
    { dbSym: 'SPY', yahooSym: 'SPY' },
    { dbSym: 'SCHD', yahooSym: 'SCHD' }
  ];

  const updatedStocks = [];

  for (const item of stockMap) {
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
  console.log('⚡ 실시간 시장 데이터 수집 시작...');
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
  fetchYahooQuote,
  runRealtimeCollection
};
