const iconv = require('iconv-lite');
const cheerio = require('cheerio');

async function testRiseAll() {
  for (const sosok of [0, 1]) {
    const market = sosok === 0 ? 'KOSPI' : 'KOSDAQ';
    const url = `https://finance.naver.com/sise/sise_rise.naver?sosok=${sosok}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const buf = await res.arrayBuffer();
    const html = iconv.decode(Buffer.from(buf), 'euc-kr');
    const $ = cheerio.load(html);
    const list = [];
    $('table.type_2 tbody tr, table tbody tr').each((i, el) => {
      const aTag = $(el).find('a[href*="code="]');
      const tds = $(el).find('td');
      if (aTag.length && tds.length >= 4) {
        const name = aTag.first().text().trim();
        const href = aTag.first().attr('href') || '';
        const match = href.match(/code=([0-9A-Za-z]+)/);
        const rate = $(tds[4]).text().trim().replace(/[\r\n\t]/g, '');
        if (match && name) {
          list.push({ symbol: match[1], name, rate });
        }
      }
    });
    console.log(`=== ${market} 상승률 상위 (총 ${list.length}개) ===`);
    console.log(list.slice(0, 10));
  }
}

testRiseAll();
