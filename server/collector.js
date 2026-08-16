const { db } = require('./db');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const path = require('path');
const fs = require('fs');

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

// 9. 네이버 증권 국내 랭킹 크롤링 (시장별 & 카테고리별 정밀 수집)
// sosok: 0 (KOSPI), 1 (KOSDAQ)
// category: 'market_cap' | 'volume' | 'rise' | 'fall'
async function scrapeNaverRankings(category, sosok = 0, targetCount = 50) {
  const stocks = [];
  try {
    if (category === 'market_cap') {
      // 1페이지당 50개 종목 (KOSPI 200은 4페이지, KOSDAQ 150은 3페이지)
      const pagesToFetch = Math.ceil(targetCount / 50);
      for (let page = 1; page <= pagesToFetch; page++) {
        const url = `https://finance.naver.com/sise/sise_market_sum.naver?sosok=${sosok}&page=${page}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
        if (!res.ok) continue;
        const buffer = await res.arrayBuffer();
        const html = iconv.decode(Buffer.from(buffer), 'euc-kr');
        const $ = cheerio.load(html);
        $('table.type_2 tbody tr').each((i, el) => {
          const aTag = $(el).find('a[href*="code="]');
          if (aTag.length) {
            const name = aTag.first().text().trim();
            const href = aTag.first().attr('href') || '';
            const match = href.match(/code=([0-9A-Za-z]+)/);
            if (match && name) {
              stocks.push({ symbol: match[1], name, rank: stocks.length + 1 });
            }
          }
        });
        if (stocks.length >= targetCount) break;
      }
    } else {
      let url = '';
      if (category === 'volume') url = `https://finance.naver.com/sise/sise_quant.naver?sosok=${sosok}`;
      else if (category === 'rise') url = `https://finance.naver.com/sise/sise_rise.naver?sosok=${sosok}`;
      else if (category === 'fall') url = `https://finance.naver.com/sise/sise_fall.naver?sosok=${sosok}`;
      else return [];

      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const html = iconv.decode(Buffer.from(buffer), 'euc-kr');
        const $ = cheerio.load(html);
        $('table tbody tr').each((i, el) => {
          const aTag = $(el).find('a[href*="code="]');
          if (aTag.length) {
            const name = aTag.first().text().trim();
            const href = aTag.first().attr('href') || '';
            const match = href.match(/code=([0-9A-Za-z]+)/);
            if (match && name) {
              stocks.push({ symbol: match[1], name, rank: stocks.length + 1 });
            }
          }
        });
      }
    }
  } catch (err) {
    console.error(`[Collector] Failed to scrape ${category} sosok=${sosok}:`, err.message);
  }
  return stocks.slice(0, targetCount);
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

// 11. 수집 설정 기본값 관리 (KOSPI 200, KOSDAQ 150, S&P 500, NASDAQ 100 기준)
const DEFAULT_COLLECTOR_SETTINGS = {
  kospiMarketCapPercent: 30, // 코스피 200 중 시총 상위 30% (60개)
  kospiVolumePercent: 30,    // 코스피 거래량 상위 30% (60개)
  kospiRiseCount: 20,        // 코스피 급등 20개
  kospiFallCount: 20,        // 코스피 급락 20개
  kosdaqMarketCapPercent: 30, // 코스닥 150 중 시총 상위 30% (45개)
  kosdaqVolumePercent: 30,    // 코스닥 거래량 상위 30% (45개)
  kosdaqRiseCount: 20,        // 코스닥 급등 20개
  kosdaqFallCount: 20,        // 코스닥 급락 20개
  usMarketCapPercent: 30,     // 미국 주요 리더 중 시총 상위 30% (30개)
  usVolumePercent: 30,        // 미국 거래량 상위 30% (30개)
  usRiseCount: 20,            // 미국 급등 20개
  usFallCount: 20             // 미국 급락 20개
};

const SETTINGS_FILE_PATH = path.join(__dirname, '..', 'data', 'collector_settings.json');

function getCollectorSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8'));
      return { ...DEFAULT_COLLECTOR_SETTINGS, ...data };
    }
  } catch (e) {
    console.warn('[Collector] Failed to read collector settings:', e.message);
  }
  return DEFAULT_COLLECTOR_SETTINGS;
}

function saveCollectorSettings(newSettings) {
  try {
    const merged = { ...getCollectorSettings(), ...newSettings };
    const dir = path.dirname(SETTINGS_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
  } catch (e) {
    console.error('[Collector] Failed to save collector settings:', e.message);
    return getCollectorSettings();
  }
}

// 12. 동적 수집 마스터 실행 함수 (한국 + 미국 통합 지원)
async function runDynamicCollection(category, market = 'ALL') {
  console.log(`⚡ 동적 시장 데이터 수집 시작 (카테고리: ${category}, 시장: ${market})...`);
  
  let krSymbols = [];
  let usSymbols = [];

  // 한국 데이터 수집
  if (market === 'ALL' || market === 'KRX' || market === 'KOSPI' || market === 'KOSDAQ') {
    const sosokList = market === 'KOSPI' ? [0] : market === 'KOSDAQ' ? [1] : [0, 1];
    for (const sosok of sosokList) {
      const krList = await scrapeNaverRankings(category, sosok, 40);
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
    } else if (category === 'fall') {
      usList = await fetchYahooScreener('day_losers');
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
  else if (category === 'fall') orderBy = 'changeRate ASC';

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

// 13. 전 시장 유니버스 기반 정밀 수집 및 DB 정돈 (사용자 정의 조건 적용)
async function refreshAllRankingsAndSave(customConfig = null) {
  const cfg = customConfig ? { ...getCollectorSettings(), ...customConfig } : getCollectorSettings();
  console.log('🔄 [Universe Collector] 맞춤 수집 기준 시작:', JSON.stringify(cfg));

  try {
    const selectedSymbolMap = new Map(); // symbol -> { symbol, name, market, originReasons: Set }

    const addSymbol = (symbol, name, market, reason) => {
      if (!symbol) return;
      if (!selectedSymbolMap.has(symbol)) {
        selectedSymbolMap.set(symbol, { symbol, name, market, reasons: new Set([reason]) });
      } else {
        selectedSymbolMap.get(symbol).reasons.add(reason);
      }
    };

    // 1. 코스피 200 유니버스 수집 (시총 30%, 거래량 30%, 급등 20, 급락 20)
    const kospiMcCount = Math.round((200 * (cfg.kospiMarketCapPercent || 30)) / 100);
    const kospiVolCount = Math.round((200 * (cfg.kospiVolumePercent || 30)) / 100);
    const [kospiMc, kospiVol, kospiRise, kospiFall] = await Promise.all([
      scrapeNaverRankings('market_cap', 0, kospiMcCount),
      scrapeNaverRankings('volume', 0, kospiVolCount),
      scrapeNaverRankings('rise', 0, cfg.kospiRiseCount || 20),
      scrapeNaverRankings('fall', 0, cfg.kospiFallCount || 20)
    ]);
    kospiMc.forEach(s => addSymbol(s.symbol, s.name, 'KRX', '코스피 시총상위'));
    kospiVol.forEach(s => addSymbol(s.symbol, s.name, 'KRX', '코스피 거래량상위'));
    kospiRise.forEach(s => addSymbol(s.symbol, s.name, 'KRX', '코스피 급등주'));
    kospiFall.forEach(s => addSymbol(s.symbol, s.name, 'KRX', '코스피 급락주'));

    // 2. 코스닥 150 유니버스 수집 (시총 30%, 거래량 30%, 급등 20, 급락 20)
    const kosdaqMcCount = Math.round((150 * (cfg.kosdaqMarketCapPercent || 30)) / 100);
    const kosdaqVolCount = Math.round((150 * (cfg.kosdaqVolumePercent || 30)) / 100);
    const [kosdaqMc, kosdaqVol, kosdaqRise, kosdaqFall] = await Promise.all([
      scrapeNaverRankings('market_cap', 1, kosdaqMcCount),
      scrapeNaverRankings('volume', 1, kosdaqVolCount),
      scrapeNaverRankings('rise', 1, cfg.kosdaqRiseCount || 20),
      scrapeNaverRankings('fall', 1, cfg.kosdaqFallCount || 20)
    ]);
    kosdaqMc.forEach(s => addSymbol(s.symbol, s.name, 'KRX', '코스닥 시총상위'));
    kosdaqVol.forEach(s => addSymbol(s.symbol, s.name, 'KRX', '코스닥 거래량상위'));
    kosdaqRise.forEach(s => addSymbol(s.symbol, s.name, 'KRX', '코스닥 급등주'));
    kosdaqFall.forEach(s => addSymbol(s.symbol, s.name, 'KRX', '코스닥 급락주'));

    // 3. 미국 S&P 500 / NASDAQ 100 유니버스 수집
    const usMcCount = Math.round((100 * (cfg.usMarketCapPercent || 30)) / 100);
    const usVolCount = Math.round((100 * (cfg.usVolumePercent || 30)) / 100);
    const [usMc, usVol, usRise, usFall] = await Promise.all([
      fetchUSMarketCapRankings().then(list => list.slice(0, usMcCount)),
      fetchYahooScreener('most_actives').then(list => list.slice(0, usVolCount)),
      fetchYahooScreener('day_gainers').then(list => list.slice(0, cfg.usRiseCount || 20)),
      fetchYahooScreener('day_losers').then(list => list.slice(0, cfg.usFallCount || 20))
    ]);
    usMc.forEach(s => addSymbol(s.symbol, s.name, 'US', '미국 시총상위'));
    usVol.forEach(s => addSymbol(s.symbol, s.name, 'US', '미국 거래량상위'));
    usRise.forEach(s => addSymbol(s.symbol, s.name, 'US', '미국 급등주'));
    usFall.forEach(s => addSymbol(s.symbol, s.name, 'US', '미국 급락주'));

    // 4. 사용자 관심종목(Watchlist) 추가
    const watchRows = await dbAllAsync(`SELECT symbol, name FROM watchlist`);
    watchRows.forEach(w => addSymbol(w.symbol, w.name, /^[0-9]{6}$/.test(w.symbol) ? 'KRX' : 'US', '관심종목'));

    const allSelectedList = Array.from(selectedSymbolMap.values());
    console.log(`📊 합집합 필터링 완료: 총 ${allSelectedList.length}개 유니버스 종목 선정 (중복 제거됨)`);

    // 5. DB 정돈: 조건에 해당하지 않는 과거 불필요 종목 즉시 제거 (관심종목은 완벽 보존)
    if (allSelectedList.length > 0) {
      const allowedSymbols = allSelectedList.map(s => s.symbol);
      const placeholders = allowedSymbols.map(() => '?').join(',');
      await dbRunAsync(`DELETE FROM stocks WHERE symbol NOT IN (${placeholders})`, allowedSymbols);
      console.log(`🧹 [Clean] 수집 조건 및 관심종목 총 ${allowedSymbols.length}개로 DB 정돈 완료!`);
    }

    // 6. 상세 시세 및 재무 지표 초고속 병렬 동기화 (청크 단위 병렬 처리)
    const chunkSize = 25;
    for (let i = 0; i < allSelectedList.length; i += chunkSize) {
      const chunk = allSelectedList.slice(i, i + chunkSize);
      await Promise.allSettled(chunk.map(async (item) => {
        try {
          const q = await fetchDetailedStockMetrics(item.symbol) || 
            (item.market === 'KRX' ? await fetchNaverQuote(item.symbol) : await fetchYahooQuote(item.symbol));
          
          if (q && q.price > 0) {
            await dbRunAsync(
              `INSERT INTO stocks (symbol, name, market, assetType, price, changeRate, volume, marketCap, per, pbr, roe, dividendYield, high52w, low52w, currency, updated_at) 
               VALUES (?, ?, ?, 'STOCK', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
               ON CONFLICT(symbol) DO UPDATE SET 
               name = COALESCE(excluded.name, stocks.name),
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
                item.symbol,
                item.name || q.name || item.symbol,
                item.market,
                q.price,
                q.changeRate,
                q.volume,
                q.marketCap || null,
                q.per || null,
                q.pbr || null,
                q.roe || null,
                q.dividendYield || null,
                q.high52w || null,
                q.low52w || null,
                item.market === 'KRX' ? 'KRW' : 'USD'
              ]
            );
          }
        } catch (e) {
          // ignore single item timeout
        }
      }));
    }

    // 7. 지수 및 환율 갱신
    const indices = await updateMarketIndices();

    // 8. 랭킹 캐시 갱신 (market_cap, volume, rise, fall)
    await Promise.all([
      runDynamicCollection('market_cap', 'ALL'),
      runDynamicCollection('volume', 'ALL'),
      runDynamicCollection('rise', 'ALL'),
      runDynamicCollection('fall', 'ALL')
    ]);

    const currentStocks = await dbAllAsync(`SELECT * FROM stocks`);
    return {
      success: true,
      settings: cfg,
      updatedIndicesCount: indices.length,
      updatedStocksCount: currentStocks.length,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('❌ [Universe Collector Error]', err);
    return { success: false, error: err.message, timestamp: new Date().toISOString() };
  }
}

// 14. 실시간 수집 마스터 실행 함수
async function runRealtimeCollection() {
  console.log('⚡ 실시간 맞춤 시장 유니버스 수집 시작...');
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
  getCollectorSettings,
  saveCollectorSettings,
  updateMarketIndices
};
