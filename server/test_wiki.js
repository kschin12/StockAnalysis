const cheerio = require('cheerio');

async function debugNasdaq() {
  const res = await fetch('https://en.wikipedia.org/wiki/Nasdaq-100', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const $ = cheerio.load(html);
  $('table').each((i, el) => {
    const id = $(el).attr('id') || '';
    const cls = $(el).attr('class') || '';
    const text = $(el).find('th').text().trim().replace(/\s+/g, ' ');
    console.log(`Table ${i}: id="${id}", class="${cls}", headers="${text.substring(0, 60)}"`);
  });
}

debugNasdaq();
