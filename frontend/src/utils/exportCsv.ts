import type { Stock } from '../types/stock';

export function exportStocksToCsv(stocks: Stock[], filename: string = 'screener_results.csv') {
  if (!stocks || stocks.length === 0) {
    alert('내보낼 종목 데이터가 없습니다.');
    return;
  }

  const headers = [
    '종목코드',
    '종목명',
    '시장',
    '자산구분',
    '섹터',
    '현재가',
    '등락률(%)',
    '시가총액',
    'PER',
    'PBR',
    'ROE(%)',
    '배당수익률(%)',
    '부채비율(%)',
    'RSI(14)',
    '경고/주의'
  ];

  const rows = stocks.map(s => [
    `"${s.symbol}"`,
    `"${s.name}"`,
    `"${s.market}"`,
    `"${s.assetType}"`,
    `"${s.sector || ''}"`,
    s.price,
    s.changeRate,
    s.marketCap,
    s.per ?? '',
    s.pbr ?? '',
    s.roe ?? '',
    s.dividendYield ?? '',
    s.debtRatio ?? '',
    s.rsi14 ?? '',
    `"${(s.warningBadges || []).join(', ')}"`
  ]);

  // UTF-8 BOM 추가 (엑셀 한글 깨짐 방지)
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
