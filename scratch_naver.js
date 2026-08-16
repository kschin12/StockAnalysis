const iconv = require('iconv-lite');
const cheerio = require('cheerio');

async function checkNaverPages() {
  const urls = [
    { name: 'KOSPI 상한가 (sise_high_up)', url: 'https://finance.naver.com/sise/sise_high_up.naver?sosok=0' },
    { name: 'KOSPI 급등 (sise_rise)', url: 'https://finance.naver.com/sise/sise_rise.naver?sosok=0' },
    { name: 'KOSPI 하한가 (sise_low_up)', url: 'https://finance.naver.com/sise/sise_low_up.naver?sosok=0' },
    { name: 'KOSPI 급락 (sise_fall)', url: 'https://finance.naver.com/sise/sise_fall.naver?sosok=0' },
    { name: 'KOSDAQ 상한가 (sise_high_up)', url: 'https://finance.naver.com/sise/sise_high_up.naver?sosok=1' },
    { name: 'KOSDAQ 급등 (sise_rise)', url: 'https://finance.naver.com/sise/sise_rise.naver?sosok=1' },
    { name: 'KOSDAQ 하한가 (sise_low_up)', url: 'https://finance.naver.com/sise/sise_low_up.naver?sosok=1' },
    { name: 'KOSDAQ 급락 (sise_fall)', url: 'https://finance.naver.com/sise/sise_fall.naver?sosok=1' }
  ];

  for (const item of urls) {
    try {
      const res = await fetch(item.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const buf = await res.arrayBuffer();
      const html = iconv.decode(Buffer.from(buf), 'euc-kr');
      const $ = cheerio.load(html);
      const rows = [];
      $('table.type_2 tbody tr, table tbody tr').each((i, el) => {
        const aTag = $(el).find('a[href*="code="]');
        const tds = $(el).find('td');
        if (aTag.length && tds.length >= 4) {
          const name = aTag.first().text().trim();
          const href = aTag.first().attr('href') || '';
          const match = href.match(/code=([0-9A-Za-z]+)/);
          const price = $(tds[2]).text().trim().replace(/,/g, '');
          const rate = $(tds[4]).text().trim().replace(/,/g, '').replace(/%/g, '');
          if (name && match) {
            rows.push({ code: match[1], name, price, rate });
          }
        }
      });
      console.log(`=== ${item.name} (${rows.length}개 발견) ===`);
      console.log(rows.slice(0, 5));
    } catch (e) {
      console.error(`Error in ${item.name}:`, e.message);
    }
  }
}

checkNaverPages();
