const { fetchNaverQuote } = require('./collector');

async function testFix() {
  const url = `https://m.stock.naver.com/api/stock/001770/integration`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  const infos = data.totalInfos || [];
  const getVal = (code) => infos.find(x => x.code === code)?.value;
  const parseNum = (str) => {
    if (!str || str === 'N/A' || str === '-') return null;
    const clean = String(str).replace(/,/g, '').replace(/배|%|원|USD|억|조/g, '').trim();
    return parseFloat(clean) || null;
  };

  const lastClose = parseNum(getVal('lastClosePrice'));
  const latestClose = parseNum(data.dealTrendInfos?.[0]?.closePrice) || parseNum(getVal('openPrice')) || lastClose;
  const realtime = await fetchNaverQuote('001770');
  const price = realtime?.price || latestClose || lastClose;
  const changeRate = realtime?.changeRate !== undefined ? realtime.changeRate : (lastClose > 0 ? Math.round(((price - lastClose) / lastClose) * 10000) / 100 : 0);

  console.log('Calculated for 001770 (SHD):', { price, changeRate, lastClose });
}
testFix();
