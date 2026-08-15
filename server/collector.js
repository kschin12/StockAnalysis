const { db } = require('./db');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

function dbRunAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function dbAllAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// 1. 네이버 증권 무료 실시간 시세 수집 (국내 주식)
async function fetchNaverQuote(symbol) {
  try {
    const url = `https://polling.finance.naver.com/api/realtime/domestic/stock/${symbol}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(4000)
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
      name: s.stockName || symbol,
      price,
      changeRate,
      volume,
      market: 'KRX',
      currency: 'KRW'
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
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(4000)
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
      name: meta.shortName || meta.symbol || symbol,
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changeRate: Math.round(changeRate * 100) / 100,
      volume,
      high52w: meta.fiftyTwoWeekHigh || null,
      low52w: meta.fiftyTwoWeekLow || null,
      currency: meta.currency || 'USD',
      sparkline
    };
  } catch (err) {
    console.warn(`[Collector] Yahoo ${symbol} 수집 실패:`, err.message);
    return null;
  }
}

// 3. 100% 실시간 정확한 펀더멘털 지표 수집 (PER, PBR, ROE, 배당률, 시가총액, 52주 최고/최저)
async function fetchDetailedStockMetrics(symbol) {
  const isKorean = /^[0-9]{6}$/.test(symbol);
  
  if (isKorean) {
    try {
      const url = `https://m.stock.naver.com/api/stock/${symbol}/integration`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) });
      if (!res.ok) return null;
      const data = await res.json();
      const infos = data.totalInfos || [];
      const getVal = (code) => infos.find(x => x.code === code)?.value;

      const parseNum = (str) => {
        if (!str || str === 'N/A' || str === '-') return null;
        const clean = String(str).replace(/,/g, '').replace(/배|%|원|USD|억|조/g, '').trim();
        return parseFloat(clean) || null;
      };

      const per = parseNum(getVal('per'));
      const pbr = parseNum(getVal('pbr'));
      const eps = parseNum(getVal('eps'));
      const bps = parseNum(getVal('bps'));
      const dividendYield = parseNum(getVal('dividendYieldRatio'));
      const high52w = parseNum(getVal('highPriceOf52Weeks'));
      const low52w = parseNum(getVal('lowPriceOf52Weeks'));
      
      const price = parseNum(getVal('openPrice')) || parseNum(getVal('lastClosePrice'));
      const changeRate = parseNum(data.fluctuationsRatio) || 0;
      const volume = parseNum(getVal('accumulatedTradingVolume')) || 0;

      let roe = null;
      if (eps && bps && bps > 0) {
        roe = Math.round((eps / bps) * 100 * 10) / 10;
      } else if (per && pbr && per > 0) {
        roe = Math.round((pbr / per) * 100 * 10) / 10;
      }

      const rawMarketVal = getVal('marketValue') || '';
      let marketCap = 0;
      if (rawMarketVal.includes('조')) {
        const parts = rawMarketVal.split('조');
        const jo = parseFloat(parts[0].replace(/,/g, '')) || 0;
        const eok = parseFloat((parts[1] || '').replace(/억|,/g, '')) || 0;
        marketCap = Math.round(jo * 10000 + eok);
      } else if (rawMarketVal.includes('억')) {
        marketCap = Math.round(parseFloat(rawMarketVal.replace(/억|,/g, '')) || 0);
      }

      return {
        symbol,
        name: data.stockName || symbol,
        market: 'KRX',
        currency: 'KRW',
        price,
        changeRate,
        volume,
        marketCap,
        per,
        pbr,
        roe,
        dividendYield,
        high52w,
        low52w
      };
    } catch (e) {
      console.warn(`[Collector] KR Detailed Metrics ${symbol} failed:`, e.message);
      return null;
    }
  } else {
    // US Stock
    try {
      const suffixes = ['.O', '.N', '.P', ''];
      let naverData = null;
      for (const suf of suffixes) {
        const u = `https://api.stock.naver.com/stock/${symbol}${suf}/basic`;
        const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(3000) });
        if (r.ok) {
          naverData = await r.json();
          break;
        }
      }

      const parseNum = (str) => {
        if (!str || str === 'N/A' || str === '-') return null;
        const clean = String(str).replace(/,/g, '').replace(/배|%|원|USD|억|조/g, '').trim();
        return parseFloat(clean) || null;
      };

      if (naverData) {
        const infos = naverData.stockItemTotalInfos || [];
        const getVal = (code) => infos.find(x => x.code === code)?.value;

        const per = parseNum(getVal('per'));
        const pbr = parseNum(getVal('pbr'));
        const eps = parseNum(getVal('eps'));
        const bps = parseNum(getVal('bps'));
        const dividendYield = parseNum(getVal('dividendYieldRatio'));
        const high52w = parseNum(getVal('highPriceOf52Weeks'));
        const low52w = parseNum(getVal('lowPriceOf52Weeks'));
        const price = parseNum(naverData.closePrice);
        const changeRate = parseNum(naverData.fluctuationsRatio) || 0;
        const volume = parseNum(getVal('accumulatedTradingVolume')) || 0;

        let roe = null;
        if (eps && bps && bps > 0) {
          roe = Math.round((eps / bps) * 100 * 10) / 10;
        } else if (per && pbr && per > 0) {
          roe = Math.round((pbr / per) * 100 * 10) / 10;
        }

        const rawMarketVal = getVal('marketValue') || '';
        let marketCap = 0; // In Millions USD
        if (rawMarketVal.includes('조')) {
          const parts = rawMarketVal.split('조');
          const jo = parseFloat(parts[0].replace(/,/g, '')) || 0;
          const eok = parseFloat((parts[1] || '').replace(/억|,|USD/g, '')) || 0;
          marketCap = Math.round(jo * 1000000 + eok * 100);
        } else if (rawMarketVal.includes('억')) {
          marketCap = Math.round((parseFloat(rawMarketVal.replace(/억|,|USD/g, '')) || 0) * 100);
        }

        return {
          symbol,
          name: naverData.stockName || symbol,
          market: 'US',
          currency: 'USD',
          price,
          changeRate,
          volume,
          marketCap,
          per,
          pbr,
          roe,
          dividendYield,
          high52w,
          low52w
        };
      }
    } catch (e) {
      console.warn(`[Collector] US Detailed Metrics ${symbol} failed:`, e.message);
      return null;
    }
  }
  return null;
}

// 4. 100% 실제 일봉 캔들 데이터 수집 (한국 + 미국 통합)
async function fetchStockCandles(symbol, count = 90) {
  const isKorean = /^[0-9]{6}$/.test(symbol);
  if (isKorean) {
    try {
      const url = `https://fchart.stock.naver.com/sise.nhn?symbol=${symbol}&timeframe=day&count=${count}&requestType=0`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const text = await res.text();
      const items = [];
      const lines = text.split('<item data=');
      for (let i = 1; i < lines.length; i++) {
        const raw = lines[i].split('"')[1] || lines[i].split("'")[1];
        if (!raw) continue;
        const parts = raw.split('|');
        if (parts.length >= 6) {
          const rawDate = parts[0];
          const dateStr = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
          items.push({
            time: dateStr,
            open: parseFloat(parts[1]) || 0,
            high: parseFloat(parts[2]) || 0,
            low: parseFloat(parts[3]) || 0,
            close: parseFloat(parts[4]) || 0,
            volume: parseInt(parts[5], 10) || 0
          });
        }
      }
      return items;
    } catch (e) {
      console.warn(`[Collector] KR Candles ${symbol} failed:`, e.message);
      return [];
    }
  } else {
    // US Stock Candles
    try {
      const range = count > 180 ? '1y' : count > 90 ? '6mo' : '3mo';
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
      const json = await res.json();
      const result = json.chart?.result?.[0];
      if (!result) return [];
      const timestamps = result.timestamp || [];
      const q = result.indicators?.quote?.[0] || {};
      const items = [];
      for (let i = 0; i < timestamps.length; i++) {
        const t = timestamps[i];
        const open = q.open?.[i];
        const high = q.high?.[i];
        const low = q.low?.[i];
        const close = q.close?.[i];
        const volume = q.volume?.[i] || 0;
        if (typeof close === 'number' && !isNaN(close)) {
          const d = new Date(t * 1000);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          items.push({
            time: `${yyyy}-${mm}-${dd}`,
            open: Math.round((open || close) * 100) / 100,
            high: Math.round((high || close) * 100) / 100,
            low: Math.round((low || close) * 100) / 100,
            close: Math.round(close * 100) / 100,
            volume
          });
        }
      }
      return items;
    } catch (e) {
      console.warn(`[Collector] US Candles ${symbol} failed:`, e.message);
      return [];
    }
  }
}

// 5. 주요 시장 지수 및 환율 실시간 업데이트
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
      const sparklineJson = JSON.stringify(quote.sparkline?.length > 0 ? quote.sparkline : [quote.price]);
      await dbRunAsync(
        `INSERT OR REPLACE INTO market_indices (code, name, value, change, changeRate, sparkline, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
        [item.code, item.name, quote.price, quote.change, quote.changeRate, sparklineJson]
      );
      results.push({ code: item.code, name: item.name, value: quote.price, changeRate: quote.changeRate });
    }
  }

  return results;
}

// 6. 미국 시가총액 상위 대표 종목 리스트
const US_MARKET_LEADERS = [
  { symbol: 'NVDA', name: 'NVIDIA', sector: '반도체/AI' },
  { symbol: 'AAPL', name: 'Apple', sector: '빅테크/스마트폰' },
  { symbol: 'MSFT', name: 'Microsoft', sector: '소프트웨어/클라우드' },
  { symbol: 'AMZN', name: 'Amazon', sector: '이커머스/클라우드' },
  { symbol: 'GOOGL', name: 'Alphabet (Google)', sector: '인터넷/AI' },
  { symbol: 'META', name: 'Meta Platforms', sector: 'SNS/메타버스' },
  { symbol: 'TSLA', name: 'Tesla', sector: '전기차/자율주행' },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway', sector: '금융/지주' },
  { symbol: 'AVGO', name: 'Broadcom', sector: '반도체/통신' },
  { symbol: 'LLY', name: 'Eli Lilly', sector: '제약/바이오' },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: '금융/은행' },
  { symbol: 'TSM', name: 'TSMC', sector: '파운드리' },
  { symbol: 'WMT', name: 'Walmart', sector: '유통/리테일' },
  { symbol: 'V', name: 'Visa', sector: '결제/핀테크' },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: '헬스케어' },
  { symbol: 'XOM', name: 'Exxon Mobil', sector: '에너지/정유' },
  { symbol: 'MA', name: 'Mastercard', sector: '결제/핀테크' },
  { symbol: 'PG', name: 'Procter & Gamble', sector: '소비재' },
  { symbol: 'COST', name: 'Costco', sector: '유통/할인점' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: '헬스케어/제약' },
  { symbol: 'HD', name: 'Home Depot', sector: '인테리어/유통' },
  { symbol: 'ABBV', name: 'AbbVie', sector: '바이오/제약' },
  { symbol: 'BAC', name: 'Bank of America', sector: '금융/은행' },
  { symbol: 'NFLX', name: 'Netflix', sector: '미디어/스트리밍' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: '반도체' },
  { symbol: 'CRM', name: 'Salesforce', sector: '클라우드/SaaS' },
  { symbol: 'KO', name: 'Coca-Cola', sector: '음료/소비재' },
  { symbol: 'ADBE', name: 'Adobe', sector: '소프트웨어' },
  { symbol: 'QCOM', name: 'Qualcomm', sector: '통신반도체' },
  { symbol: 'PEP', name: 'PepsiCo', sector: '식음료' },
  { symbol: 'DIS', name: 'Walt Disney', sector: '엔터테인먼트' },
  { symbol: 'ORCL', name: 'Oracle', sector: '데이터베이스/클라우드' },
  { symbol: 'INTC', name: 'Intel', sector: '반도체' },
  { symbol: 'PLTR', name: 'Palantir Technologies', sector: 'AI/빅데이터' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', sector: '지수 ETF', assetType: 'ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', sector: '나스닥 ETF', assetType: 'ETF' },
  { symbol: 'SCHD', name: 'Schwab US Dividend Equity ETF', sector: '배당 ETF', assetType: 'ETF' },
  { symbol: 'SOXX', name: 'iShares Semiconductor ETF', sector: '반도체 ETF', assetType: 'ETF' }
];

// 7. Yahoo Finance Screener 수집기 (미국 거래량상위, 급등주, 테크주)
async function fetchYahooScreener(scrId) {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=${scrId}&count=30`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return [];
    const json = await res.json();
    const quotes = json.finance?.result?.[0]?.quotes || [];
    return quotes.map(q => ({
      symbol: q.symbol,
      name: q.shortName || q.longName || q.displayName || q.symbol,
      market: 'US',
      assetType: q.quoteType === 'ETF' ? 'ETF' : 'STOCK',
      sector: q.sector || '미국 시장',
      price: Math.round((q.regularMarketPrice || 0) * 100) / 100,
      changeRate: Math.round((q.regularMarketChangePercent || 0) * 100) / 100,
      volume: q.regularMarketVolume || 0,
      marketCap: q.marketCap ? Math.round(q.marketCap / 1000000) : 0, // Millions USD
      per: q.trailingPE ? Math.round(q.trailingPE * 10) / 10 : null,
      pbr: q.priceToBook ? Math.round(q.priceToBook * 100) / 100 : null,
      high52w: q.fiftyTwoWeekHigh || null,
      low52w: q.fiftyTwoWeekLow || null,
      currency: 'USD'
    }));
  } catch (e) {
    console.warn(`[Collector] Yahoo screener ${scrId} error:`, e.message);
    return [];
  }
}

// 8. 미국 시가총액 상위 실시간 수집
async function fetchUSMarketCapRankings() {
  const results = await Promise.all(US_MARKET_LEADERS.map(async (item) => {
    const detailed = await fetchDetailedStockMetrics(item.symbol);
    if (detailed && detailed.price > 0) {
      return {
        ...detailed,
        assetType: item.assetType || 'STOCK',
        sector: item.sector
      };
    }
    const quote = await fetchYahooQuote(item.symbol);
    if (!quote || !quote.price) return null;
    return {
      symbol: item.symbol,
      name: item.name,
      market: 'US',
      assetType: item.assetType || 'STOCK',
      sector: item.sector,
      price: quote.price,
      changeRate: quote.changeRate,
      volume: quote.volume,
      high52w: quote.high52w,
      low52w: quote.low52w,
      currency: 'USD'
    };
  }));
  return results.filter(Boolean);
}

// 9. 네이버 증권 국내 랭킹 크롤링
async function scrapeNaverRankings(category) {
  let url = '';
  if (category === 'market_cap') url = 'https://finance.naver.com/sise/sise_market_sum.naver';
  else if (category === 'volume') url = 'https://finance.naver.com/sise/sise_quant.naver';
  else if (category === 'rise') url = 'https://finance.naver.com/sise/sise_rise.naver';
  else return [];

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const buffer = await res.arrayBuffer();
    const html = iconv.decode(Buffer.from(buffer), 'euc-kr');
    const $ = cheerio.load(html);
    
    const stocks = [];
    $('table.type_2 tbody tr').each((i, el) => {
      if ($(el).attr('onmouseover')) {
        const aTag = $(el).find('a.tltle');
        if (aTag.length) {
          const name = aTag.text().trim();
          const href = aTag.attr('href');
          const symbol = href.split('code=')[1];
          stocks.push({ symbol, name });
        }
      }
    });
    return stocks.slice(0, 40);
  } catch (err) {
    console.error(`[Collector] Failed to scrape ${category}:`, err.message);
    return [];
  }
}

// 10. 단일 종목 실시간 동기화 (관심종목 등록 시 자동 호출)
async function syncSingleStock(symbol, customName = '') {
  const cleanSym = symbol.trim().toUpperCase();
  const detailed = await fetchDetailedStockMetrics(cleanSym);

  if (detailed && detailed.price > 0) {
    await dbRunAsync(
      `INSERT INTO stocks (symbol, name, market, assetType, price, changeRate, volume, marketCap, per, pbr, roe, dividendYield, high52w, low52w, currency, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
       ON CONFLICT(symbol) DO UPDATE SET
       name = excluded.name,
       price = excluded.price,
       changeRate = excluded.changeRate,
       volume = excluded.volume,
       marketCap = excluded.marketCap,
       per = excluded.per,
       pbr = excluded.pbr,
       roe = excluded.roe,
       dividendYield = excluded.dividendYield,
       high52w = excluded.high52w,
       low52w = excluded.low52w,
       updated_at = excluded.updated_at`,
      [
        cleanSym,
        customName || detailed.name || cleanSym,
        detailed.market,
        detailed.assetType || 'STOCK',
        detailed.price,
        detailed.changeRate,
        detailed.volume,
        detailed.marketCap || 0,
        detailed.per || null,
        detailed.pbr || null,
        detailed.roe || null,
        detailed.dividendYield || null,
        detailed.high52w || null,
        detailed.low52w || null,
        detailed.currency
      ]
    );
    return true;
  }
  return false;
}

// 11. 동적 수집 마스터 실행 함수 (한국 + 미국 통합 지원)
async function runDynamicCollection(category, market = 'ALL') {
  console.log(`⚡ 동적 시장 데이터 수집 시작 (카테고리: ${category}, 시장: ${market})...`);
  
  let krSymbols = [];
  let usSymbols = [];

  // 한국 데이터 수집
  if (market === 'ALL' || market === 'KRX') {
    const krList = await scrapeNaverRankings(category);
    for (const st of krList) {
      const q = await fetchDetailedStockMetrics(st.symbol) || await fetchNaverQuote(st.symbol);
      if (q && q.price > 0) {
        await dbRunAsync(
          `INSERT INTO stocks (symbol, name, market, assetType, price, changeRate, volume, marketCap, per, pbr, roe, dividendYield, high52w, low52w, currency, updated_at) 
           VALUES (?, ?, 'KRX', 'STOCK', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'KRW', datetime('now', 'localtime'))
           ON CONFLICT(symbol) DO UPDATE SET 
           price = excluded.price, 
           changeRate = excluded.changeRate, 
           volume = excluded.volume, 
           marketCap = COALESCE(excluded.marketCap, stocks.marketCap),
           per = COALESCE(excluded.per, stocks.per),
           pbr = COALESCE(excluded.pbr, stocks.pbr),
           roe = COALESCE(excluded.roe, stocks.roe),
           dividendYield = COALESCE(excluded.dividendYield, stocks.dividendYield),
           high52w = COALESCE(excluded.high52w, stocks.high52w),
           low52w = COALESCE(excluded.low52w, stocks.low52w),
           updated_at = excluded.updated_at`,
          [
            st.symbol,
            st.name,
            q.price,
            q.changeRate,
            q.volume,
            q.marketCap || null,
            q.per || null,
            q.pbr || null,
            q.roe || null,
            q.dividendYield || null,
            q.high52w || null,
            q.low52w || null
          ]
        );
        krSymbols.push(st.symbol);
      }
    }
  }

  // 미국 데이터 수집
  if (market === 'ALL' || market === 'US') {
    let usList = [];
    if (category === 'market_cap') {
      usList = await fetchUSMarketCapRankings();
    } else if (category === 'volume') {
      usList = await fetchYahooScreener('most_actives');
    } else if (category === 'rise') {
      usList = await fetchYahooScreener('day_gainers');
    } else {
      usList = await fetchYahooScreener('growth_technology_stocks');
    }

    for (const st of usList) {
      await dbRunAsync(
        `INSERT INTO stocks (symbol, name, market, assetType, sector, price, changeRate, volume, marketCap, per, pbr, roe, dividendYield, high52w, low52w, currency, updated_at) 
         VALUES (?, ?, 'US', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', datetime('now', 'localtime'))
         ON CONFLICT(symbol) DO UPDATE SET 
         name = excluded.name,
         price = excluded.price, 
         changeRate = excluded.changeRate, 
         volume = excluded.volume, 
         marketCap = excluded.marketCap,
         per = excluded.per,
         pbr = excluded.pbr,
         roe = excluded.roe,
         dividendYield = excluded.dividendYield,
         high52w = excluded.high52w,
         low52w = excluded.low52w,
         updated_at = excluded.updated_at`,
        [
          st.symbol,
          st.name,
          st.assetType || 'STOCK',
          st.sector || 'US Market',
          st.price,
          st.changeRate,
          st.volume,
          st.marketCap || 0,
          st.per || null,
          st.pbr || null,
          st.roe || null,
          st.dividendYield || null,
          st.high52w || null,
          st.low52w || null
        ]
      );
      usSymbols.push(st.symbol);
    }
  }

  const uniqueSymbols = Array.from(new Set([...krSymbols, ...usSymbols]));
  console.log(`✅ 동적 수집 완료: 국내 ${krSymbols.length}건, 미국 ${usSymbols.length}건 갱신 (고유 ${uniqueSymbols.length}개)`);

  if (uniqueSymbols.length === 0) {
    return { success: false, category, market, data: [] };
  }

  const placeholders = uniqueSymbols.map(() => '?').join(',');
  let orderBy = 'marketCap DESC';
  if (category === 'volume') orderBy = 'volume DESC';
  else if (category === 'rise') orderBy = 'changeRate DESC';

  const query = `SELECT * FROM stocks WHERE symbol IN (${placeholders}) ORDER BY ${orderBy}`;
  const rows = await dbAllAsync(query, uniqueSymbols);

  // market_rankings 테이블에 카테고리별 1위~50위 캐시 저장
  try {
    await dbRunAsync(`DELETE FROM market_rankings WHERE category = ? AND market = ?`, [category, market]);
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
      await dbRunAsync(
        `INSERT OR REPLACE INTO market_rankings (category, market, ranking, symbol, updated_at)
         VALUES (?, ?, ?, ?, datetime('now', 'localtime'))`,
        [category, market, i + 1, rows[i].symbol]
      );
    }
  } catch (err) {
    console.warn('[Collector] Cache market_rankings save warning:', err.message);
  }

  return {
    success: true,
    category,
    market,
    count: rows.length,
    data: rows,
    timestamp: new Date().toISOString()
  };
}

// 12. 전체 DB 주식 실시간 시세 업데이트 (국내 + 미국 전 종목)
async function updateStockPrices() {
  const rows = await dbAllAsync('SELECT symbol, market, currency FROM stocks');
  const updated = [];
  const krx = rows.filter(r => r.market === 'KRX' || r.currency === 'KRW');
  const us = rows.filter(r => r.market === 'US' || r.currency === 'USD');

  // 1. KRX 업데이트
  for (const st of krx) {
    const q = await fetchDetailedStockMetrics(st.symbol) || await fetchNaverQuote(st.symbol);
    if (q && q.price > 0) {
      await dbRunAsync(
        `UPDATE stocks SET 
          price = ?, changeRate = ?, volume = ?, 
          marketCap = COALESCE(?, marketCap),
          per = COALESCE(?, per),
          pbr = COALESCE(?, pbr),
          roe = COALESCE(?, roe),
          dividendYield = COALESCE(?, dividendYield),
          high52w = COALESCE(?, high52w),
          low52w = COALESCE(?, low52w),
          updated_at = datetime('now', 'localtime') 
        WHERE symbol = ?`,
        [q.price, q.changeRate, q.volume, q.marketCap || null, q.per || null, q.pbr || null, q.roe || null, q.dividendYield || null, q.high52w || null, q.low52w || null, st.symbol]
      );
      updated.push({ symbol: st.symbol, price: q.price, changeRate: q.changeRate });
    }
  }

  // 2. US 병렬 업데이트
  await Promise.all(us.map(async (st) => {
    const q = await fetchDetailedStockMetrics(st.symbol) || await fetchYahooQuote(st.symbol);
    if (q && q.price > 0) {
      await dbRunAsync(
        `UPDATE stocks SET 
          price = ?, changeRate = ?, volume = ?,
          marketCap = COALESCE(?, marketCap),
          per = COALESCE(?, per),
          pbr = COALESCE(?, pbr),
          roe = COALESCE(?, roe),
          dividendYield = COALESCE(?, dividendYield),
          high52w = COALESCE(?, high52w),
          low52w = COALESCE(?, low52w),
          updated_at = datetime('now', 'localtime') 
        WHERE symbol = ?`,
        [q.price, q.changeRate, q.volume, q.marketCap || null, q.per || null, q.pbr || null, q.roe || null, q.dividendYield || null, q.high52w || null, q.low52w || null, st.symbol]
      );
      updated.push({ symbol: st.symbol, price: q.price, changeRate: q.changeRate });
    }
  }));

  return updated;
}

// 13. 전 시장 랭킹 및 시세 정기 자동 수집 (당일 상위 종목만 엄선하여 저장 및 DB 정돈)
async function refreshAllRankingsAndSave() {
  console.log('🔄 [Today Top Stocks] 당일 시장 상위 핵심 종목 수집 및 DB 정돈 시작...');
  try {
    // 1. 시가총액 상위
    const mcRes = await runDynamicCollection('market_cap', 'ALL');
    // 2. 거래량 상위
    const volRes = await runDynamicCollection('volume', 'ALL');
    // 3. 급등주 (당일 상승률 상위)
    const riseRes = await runDynamicCollection('rise', 'ALL');
    // 4. 시장 지수 및 환율
    const indices = await updateMarketIndices();

    // 5. 오늘 상위 활성 종목 + 사용자 관심종목(Watchlist)만 보존
    const topSymbols = new Set([
      ...(mcRes?.data?.map(s => s.symbol) || []),
      ...(volRes?.data?.map(s => s.symbol) || []),
      ...(riseRes?.data?.map(s => s.symbol) || [])
    ]);

    // 관심종목(Watchlist)에 등록된 종목은 안전하게 보존
    const watchRows = await dbAllAsync(`SELECT symbol FROM watchlist`);
    watchRows.forEach(w => topSymbols.add(w.symbol));

    if (topSymbols.size > 0) {
      const allowed = Array.from(topSymbols);
      const placeholders = allowed.map(() => '?').join(',');
      await dbRunAsync(`DELETE FROM stocks WHERE symbol NOT IN (${placeholders})`, allowed);
      console.log(`🧹 [Clean] 오늘 상위 핵심 종목 및 관심종목 총 ${allowed.length}개로 DB 정돈 완료!`);
    }

    const currentStocks = await dbAllAsync(`SELECT * FROM stocks`);
    return {
      success: true,
      updatedIndicesCount: indices.length,
      updatedStocksCount: currentStocks.length,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.warn('❌ [Today Top Stocks Warning]', err.message);
    return { success: false, updatedIndicesCount: 0, updatedStocksCount: 0, timestamp: new Date().toISOString() };
  }
}

// 14. 실시간 수집 마스터 실행 함수 (오늘 상위 종목 중심)
async function runRealtimeCollection() {
  console.log('⚡ 실시간 오늘 상위 시장 데이터 수집 시작...');
  return await refreshAllRankingsAndSave();
}

module.exports = {
  fetchNaverQuote,
  fetchYahooQuote,
  fetchYahooScreener,
  fetchStockCandles,
  fetchDetailedStockMetrics,
  syncSingleStock,
  runRealtimeCollection,
  runDynamicCollection,
  refreshAllRankingsAndSave,
  updateStockPrices,
  updateMarketIndices
};
