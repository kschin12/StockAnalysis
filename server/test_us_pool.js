const cheerio = require('cheerio');

// 공식 나스닥 100 편입 101개 종목 (QQQ 공식 편입 티커)
const OFFICIAL_NASDAQ_100 = [
  'AAPL', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'GOOG', 'META', 'TSLA', 'AVGO', 'COST',
  'ASML', 'NFLX', 'AMD', 'AZN', 'TMUS', 'LIN', 'CSCO', 'ADBE', 'PEP', 'QCOM',
  'TXN', 'INTU', 'AMGN', 'ISRG', 'HON', 'AMAT', 'BKNG', 'CMCSA', 'VRTX', 'PANW',
  'LRCX', 'ADI', 'MU', 'REGN', 'MDLZ', 'KLAC', 'SNPS', 'CDNS', 'CRWD', 'PYPL',
  'MELI', 'MAR', 'ORLY', 'CSX', 'CTAS', 'NXPI', 'PCAR', 'ROP', 'MNST', 'ADSK',
  'FTNT', 'WDAY', 'AEP', 'CPRT', 'PAYX', 'ROST', 'KDP', 'CHTR', 'MCHP', 'DXCM',
  'FAST', 'ODFL', 'KHC', 'GEHC', 'EA', 'LULU', 'VRSK', 'CTSH', 'IDXX', 'EXC',
  'BKR', 'BIIB', 'XEL', 'ON', 'CSGP', 'CDW', 'FANG', 'ANSS', 'DLTR', 'TEAM',
  'TTD', 'GFS', 'MDB', 'ZS', 'WBD', 'ILMN', 'SIRI', 'ARM', 'DASH', 'PDD',
  'ABNB', 'CEG', 'MRNA', 'CCEP', 'TTWO', 'AXON', 'APP', 'PLTR', 'SMCI', 'COHR'
];

async function testCombinedUS() {
  const sp500 = [];
  try {
    const res = await fetch('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    $('#constituents tbody tr').each((i, el) => {
      const tds = $(el).find('td');
      if (tds.length >= 2) {
        const symbol = $(tds[0]).text().trim();
        const name = $(tds[1]).text().trim();
        if (symbol && name) sp500.push({ symbol, name });
      }
    });
  } catch (e) {}

  const combinedMap = new Map();
  sp500.forEach(s => combinedMap.set(s.symbol, { symbol: s.symbol, name: s.name, inSP500: true, inNasdaq100: false }));
  OFFICIAL_NASDAQ_100.forEach(sym => {
    if (combinedMap.has(sym)) {
      combinedMap.get(sym).inNasdaq100 = true;
    } else {
      combinedMap.set(sym, { symbol: sym, name: sym, inSP500: false, inNasdaq100: true });
    }
  });

  const overlapCount = Array.from(combinedMap.values()).filter(x => x.inSP500 && x.inNasdaq100).length;
  const nasdaqOnlyCount = Array.from(combinedMap.values()).filter(x => !x.inSP500 && x.inNasdaq100).length;

  console.log(`📊 S&P 500 종목 수: ${sp500.length}개`);
  console.log(`📊 NASDAQ 100 종목 수: ${OFFICIAL_NASDAQ_100.length}개`);
  console.log(`🔁 동시 포함(중복) 종목 수: ${overlapCount}개 (Apple, MS, NVDA, Google 등)`);
  console.log(`⭐ 나스닥 100 전용 종목 수: ${nasdaqOnlyCount}개 (PDD, ARM, DASH, LULU, TEAM 등)`);
  console.log(`✅ 미국 전체 고유(Unique) 종목 풀: 총 ${combinedMap.size}개`);
}

testCombinedUS();
