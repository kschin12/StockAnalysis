const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const { fetchNaverQuote, fetchYahooQuote, fetchDetailedStockMetrics } = require('./collector');

// 1. 공식 코스피 200 크롤링 (네이버 금융 공식 편입 종목 200개)
async function fetchOfficialKospi200() {
  const list = [];
  const promises = [];
  for (let page = 1; page <= 20; page++) {
    promises.push((async () => {
      try {
        const url = `https://finance.naver.com/sise/entryJongmok.naver?itiType=0&gubun=1&page=${page}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) });
        if (!res.ok) return [];
        const buf = await res.arrayBuffer();
        const html = iconv.decode(Buffer.from(buf), 'euc-kr');
        const $ = cheerio.load(html);
        const pageItems = [];
        $('td.ctg a').each((i, el) => {
          const name = $(el).text().trim();
          const href = $(el).attr('href') || '';
          const match = href.match(/code=([0-9A-Za-z]+)/);
          if (match && name) pageItems.push({ symbol: match[1], name, market: 'KRX' });
        });
        return pageItems;
      } catch {
        return [];
      }
    })());
  }
  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === 'fulfilled') list.push(...r.value);
  }
  return list;
}

// 2. 공식 코스닥 150 크롤링 (네이버 금융 코스닥 상위 적격 150개)
async function fetchOfficialKosdaq150() {
  const list = [];
  for (let page = 1; page <= 3; page++) {
    try {
      const url = `https://finance.naver.com/sise/sise_market_sum.naver?sosok=1&page=${page}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      const html = iconv.decode(Buffer.from(buf), 'euc-kr');
      const $ = cheerio.load(html);
      $('table.type_2 tbody tr').each((i, el) => {
        const aTag = $(el).find('a[href*="code="]');
        if (aTag.length) {
          const name = aTag.first().text().trim();
          const href = aTag.first().attr('href') || '';
          const match = href.match(/code=([0-9A-Za-z]+)/);
          if (match && name) {
            list.push({ symbol: match[1], name, market: 'KRX' });
          }
        }
      });
      if (list.length >= 150) break;
    } catch {}
  }
  return list.slice(0, 150);
}

// 3. 공식 S&P 500 및 NASDAQ 100 공식 구성 리스트
async function fetchOfficialUSIndices() {
  try {
    const res = await fetch('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const list = [];
    $('#constituents tbody tr').each((i, el) => {
      const tds = $(el).find('td');
      if (tds.length >= 2) {
        const symbol = $(tds[0]).text().trim();
        const name = $(tds[1]).text().trim();
        if (symbol && name) {
          list.push({ symbol, name, market: 'US' });
        }
      }
    });
    return list;
  } catch {
    return [];
  }
}

async function testExtraction() {
  console.log('1. 공식 코스피 200 수집 중...');
  const k200 = await fetchOfficialKospi200();
  console.log(`-> 코스피 200: ${k200.length}개 확보`);

  console.log('2. 공식 코스닥 150 수집 중...');
  const k150 = await fetchOfficialKosdaq150();
  console.log(`-> 코스닥 150: ${k150.length}개 확보`);

  console.log('3. 공식 S&P 500 / NASDAQ 100 수집 중...');
  const us500 = await fetchOfficialUSIndices();
  console.log(`-> S&P 500: ${us500.length}개 확보`);
}

testExtraction();
