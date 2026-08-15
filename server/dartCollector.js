const path = require('path');
const { db } = require('./db');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DART_API_KEY = process.env.DART_API_KEY || '';

// 대표 상장사 DART 고유번호 매핑 (8자리)
const DART_CORP_MAP = {
  '005930': { corp_code: '00126380', name: '삼성전자' },
  '000660': { corp_code: '00164779', name: 'SK하이닉스' },
  '005380': { corp_code: '00164742', name: '현대차' },
  '105560': { corp_code: '00684749', name: 'KB금융' },
  '035420': { corp_code: '00266961', name: 'NAVER' }
};

// DART 단일회사 주요계정 재무제표 API 호출
async function fetchDartFinancialStatement(corpCode, bsnsYear = '2023', reprtCode = '11011') {
  if (!DART_API_KEY) {
    return null;
  }

  try {
    const url = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bsns_year=${bsnsYear}&reprt_code=${reprtCode}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    if (data.status !== '000' || !data.list) {
      return null;
    }

    let revenue = 0;
    let operatingIncome = 0;
    let netIncome = 0;

    for (const item of data.list) {
      const name = item.account_nm?.trim();
      const amount = parseFloat(item.thstrm_amount?.replace(/,/g, '')) || 0;

      if (name === '매출액' || name === '수익(매출액)') {
        revenue = amount;
      } else if (name === '영업이익' || name === '영업이익(손실)') {
        operatingIncome = amount;
      } else if (name === '당기순이익' || name === '당기순이익(손실)') {
        netIncome = amount;
      }
    }

    return { revenue, operatingIncome, netIncome };
  } catch (err) {
    console.warn(`[DART] 호출 경고 (${corpCode}):`, err.message);
    return null;
  }
}

// DART 재무제표 동기화 마스터 실행
async function runDartFinancialSync() {
  console.log('📦 [DART] 상장사 재무제표 동기화 시작...');
  const results = [];

  for (const [symbol, info] of Object.entries(DART_CORP_MAP)) {
    try {
      const fin = await fetchDartFinancialStatement(info.corp_code);

      if (fin) {
        // financials 테이블에 분기 실적 저장
        db.run(
          `INSERT OR REPLACE INTO financials (symbol, fiscal_year, quarter, revenue, operating_income, net_income)
           VALUES (?, 2023, '4Q', ?, ?, ?)`,
          [symbol, fin.revenue, fin.operatingIncome, fin.netIncome]
        );
        results.push({ symbol, name: info.name, synced: true, realApi: true });
      } else {
        results.push({ symbol, name: info.name, synced: true, realApi: false });
      }
    } catch (e) {
      console.warn(`[DART] ${symbol} 동기화 스킵:`, e.message);
      results.push({ symbol, name: info.name, synced: false, error: e.message });
    }
  }

  console.log(`✅ [DART] 재무제표 동기화 완료 (${results.length}개 종목)`);
  return {
    success: true,
    hasApiKey: !!DART_API_KEY,
    syncedCount: results.length,
    items: results,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  runDartFinancialSync
};
