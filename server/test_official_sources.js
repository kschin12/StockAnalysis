async function testEtfHoldings() {
  // Naver ETF CU / 구성종목 API: https://finance.naver.com/item/main.naver?code=229200 (Kodex 코스닥150)
  // or https://api.stock.naver.com/etf/229200/component
  const url = 'https://api.stock.naver.com/etf/229200/component';
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.ok) {
      const data = await res.json();
      console.log('Kodex 코스닥150 component count:', data.items?.length || data.length);
      console.log('Sample:', data.items ? data.items.slice(0, 5) : data.slice(0, 5));
    } else {
      console.log('status:', res.status);
    }
  } catch (e) {
    console.error('error:', e.message);
  }
}

testEtfHoldings();
