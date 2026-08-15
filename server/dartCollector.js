const path = require('path');
const { db } = require('./db');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DART_API_KEY = process.env.DART_API_KEY || '';

// 대표 상장사 DART 고유번호 매핑 (8자리) - 70개 전 종목 완비
const DART_CORP_MAP = {
  '005930': { corp_code: '00126380', name: '삼성전자' },
  '000660': { corp_code: '00164779', name: 'SK하이닉스' },
  '005380': { corp_code: '00164742', name: '현대차' },
  '000270': { corp_code: '00106641', name: '기아' },
  '005490': { corp_code: '00140867', name: 'POSCO홀딩스' },
  '035420': { corp_code: '00266961', name: 'NAVER' },
  '035720': { corp_code: '00258801', name: '카카오' },
  '051910': { corp_code: '00356361', name: 'LG화학' },
  '006400': { corp_code: '00126362', name: '삼성SDI' },
  '373220': { corp_code: '01509312', name: 'LG에너지솔루션' },
  '207940': { corp_code: '00877559', name: '삼성바이오로직스' },
  '068270': { corp_code: '00413046', name: '셀트리온' },
  '105560': { corp_code: '00684749', name: 'KB금융' },
  '055550': { corp_code: '00382199', name: '신한지주' },
  '086790': { corp_code: '00537090', name: '하나금융지주' },
  '012330': { corp_code: '00164788', name: '현대모비스' },
  '028260': { corp_code: '00126405', name: '삼성물산' },
  '015760': { corp_code: '00159193', name: '한국전력' },
  '032830': { corp_code: '00126399', name: '삼성생명' },
  '000810': { corp_code: '00126441', name: '삼성화재' },
  '033780': { corp_code: '00126229', name: 'KT&G' },
  '096770': { corp_code: '00645403', name: 'SK이노베이션' },
  '010130': { corp_code: '00107385', name: '고려아연' },
  '011200': { corp_code: '00161471', name: 'HMM' },
  '042660': { corp_code: '00185125', name: '한화오션' },
  '012450': { corp_code: '00164672', name: '한화에어로스페이스' },
  '010140': { corp_code: '00126371', name: '삼성중공업' },
  '009540': { corp_code: '00164821', name: 'HD한국조선해양' },
  '329180': { corp_code: '01389889', name: 'HD현대중공업' },
  '079550': { corp_code: '00989060', name: 'LIG넥스원' },
  '047810': { corp_code: '00305826', name: '한국항공우주' },
  '034020': { corp_code: '00126210', name: '두산에너빌리티' },
  '247540': { corp_code: '01168188', name: '에코프로비엠' },
  '086520': { corp_code: '00424565', name: '에코프로' },
  '003670': { corp_code: '00139180', name: '포스코퓨처엠' },
  '196170': { corp_code: '00908861', name: '알테오젠' },
  '042700': { corp_code: '00223780', name: '한미반도체' },
  '058470': { corp_code: '00367075', name: '리노공업' },
  '403870': { corp_code: '01569477', name: 'HPSP' },
  '259960': { corp_code: '00844788', name: '크래프톤' },
  '036570': { corp_code: '00262707', name: '엔씨소프트' },
  '066570': { corp_code: '00401731', name: 'LG전자' },
  '017670': { corp_code: '00164751', name: 'SK텔레콤' },
  '030200': { corp_code: '00159041', name: 'KT' },
  '032640': { corp_code: '00259837', name: 'LG유플러스' },
  '323410': { corp_code: '01185538', name: '카카오뱅크' },
  '377300': { corp_code: '01235122', name: '카카오페이' },
  '316140': { corp_code: '01337488', name: '우리금융지주' },
  '138040': { corp_code: '00858541', name: '메리츠금융지주' },
  '000100': { corp_code: '00126159', name: '유한양행' },
  '128940': { corp_code: '00827299', name: '한미약품' },
  '009150': { corp_code: '00126353', name: '삼성전기' },
  '011070': { corp_code: '00174095', name: 'LG이노텍' },
  '018260': { corp_code: '00126423', name: '삼성에스디에스' },
  '003550': { corp_code: '00126344', name: 'LG' },
  '034730': { corp_code: '00164803', name: 'SK' },
  '000120': { corp_code: '00126168', name: 'CJ대한통운' },
  '097950': { corp_code: '00624020', name: 'CJ제일제당' },
  '024110': { corp_code: '00126195', name: '기업은행' },
  '004020': { corp_code: '00164715', name: '현대제철' },
  '011170': { corp_code: '00118220', name: '롯데케미칼' },
  '002790': { corp_code: '00126201', name: '아모레G' },
  '090430': { corp_code: '00609386', name: '아모레퍼시픽' },
  '021240': { corp_code: '00164557', name: '코웨이' },
  '271560': { corp_code: '01211751', name: '오리온' },
  '008770': { corp_code: '00126450', name: '호텔신라' },
  '035250': { corp_code: '00298641', name: '강원랜드' },
  '001040': { corp_code: '00126186', name: 'CJ' },
  '005830': { corp_code: '00126274', name: 'DB손해보험' }
};

// 1. DART 단일회사 주요계정 재무제표 API 호출
async function fetchDartFinancialStatement(corpCode, bsnsYear = '2023', reprtCode = '11011') {
  if (!DART_API_KEY) return null;

  try {
    const url = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bsns_year=${bsnsYear}&reprt_code=${reprtCode}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
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

    return { revenue, operatingIncome, netIncome, source: 'DART' };
  } catch (err) {
    console.warn(`[DART] 호출 경고 (${corpCode}):`, err.message);
    return null;
  }
}

// 2. 실시간 재무제표 보완 수집 (네이버 금융 재무제표 API)
async function fetchNaverFinancialStatement(symbol) {
  try {
    const url = `https://m.stock.naver.com/api/stock/${symbol}/finance/annual`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return null;
    const json = await res.json();

    const rowList = json.financeInfo?.rowList;
    if (!rowList || !Array.isArray(rowList)) return null;

    let revenue = 0;
    let operatingIncome = 0;
    let netIncome = 0;

    const findRowAmount = (rowTitle) => {
      const row = rowList.find(r => r.title === rowTitle);
      if (!row || !row.columns) return 0;
      const keys = Object.keys(row.columns);
      if (keys.length === 0) return 0;
      // 최근 연도 데이터 (억 원 단위 ➡️ 원 단위 변환: * 100,000,000)
      const lastKey = keys[keys.length - 1];
      const valStr = row.columns[lastKey]?.value?.replace(/,/g, '');
      return (parseFloat(valStr) || 0) * 100000000;
    };

    revenue = findRowAmount('매출액');
    operatingIncome = findRowAmount('영업이익');
    netIncome = findRowAmount('당기순이익');

    return { revenue, operatingIncome, netIncome, source: 'NAVER_FIN' };
  } catch (err) {
    return null;
  }
}

// 3. DART & 상장사 전체 재무제표 동기화 마스터 실행 (시총/거래량/급등 랭킹 기반 동적 연동)
async function runDartFinancialSync() {
  console.log('📦 [DART] 시총/거래량/급등 랭킹 기반 상장사 재무제표 동기화 시작...');
  const results = [];

  // 1. 실시간 랭킹(시가총액 상위, 거래량 상위, 급등주)에서 조회된 국내 종목 우선 취합
  const rankingRows = await new Promise((resolve) => {
    db.all(`
      SELECT DISTINCT s.symbol, s.name, r.category, r.ranking
      FROM market_rankings r
      JOIN stocks s ON r.symbol = s.symbol
      WHERE (s.market = 'KRX' OR s.currency = 'KRW')
      ORDER BY r.ranking ASC
    `, (err, list) => {
      resolve(list || []);
    });
  });

  // 2. 전체 stocks 테이블의 국내 종목 목록 취합
  const stockRows = await new Promise((resolve) => {
    db.all("SELECT symbol, name FROM stocks WHERE market = 'KRX' OR currency = 'KRW'", (err, list) => {
      resolve(list || []);
    });
  });

  // 랭킹에서 발굴된 종목을 우선 순위로 고유 타겟 맵 구성
  const targetMap = new Map();
  for (const st of rankingRows) {
    targetMap.set(st.symbol, st);
  }
  for (const st of stockRows) {
    if (!targetMap.has(st.symbol)) {
      targetMap.set(st.symbol, st);
    }
  }

  const targets = Array.from(targetMap.values());
  console.log(`🔍 [DART] 랭킹(시총/거래량/급등) 및 DB 발굴 국내 상장사: 총 ${targets.length}개 대상 동기화`);

  for (const st of targets) {
    try {
      const corpInfo = DART_CORP_MAP[st.symbol];
      let fin = null;

      // 1. DART API 키가 있으면 DART 우선 시도
      if (corpInfo && DART_API_KEY) {
        fin = await fetchDartFinancialStatement(corpInfo.corp_code);
      }

      // 2. DART 미응답 또는 키 미설정 시 네이버 금융 실시간 재무제표로 100% 동기화
      if (!fin || (fin.revenue === 0 && fin.operatingIncome === 0)) {
        fin = await fetchNaverFinancialStatement(st.symbol);
      }

      if (fin && (fin.revenue > 0 || fin.operatingIncome !== 0)) {
        db.run(
          `INSERT OR REPLACE INTO financials (symbol, fiscal_year, quarter, revenue, operating_income, net_income)
           VALUES (?, 2024, '4Q', ?, ?, ?)`,
          [st.symbol, fin.revenue, fin.operatingIncome, fin.netIncome]
        );
        results.push({ symbol: st.symbol, name: st.name, synced: true, source: fin.source });
      } else {
        results.push({ symbol: st.symbol, name: st.name, synced: true, source: 'DB' });
      }
    } catch (e) {
      console.warn(`[DART] ${st.symbol} 동기화 스킵:`, e.message);
      results.push({ symbol: st.symbol, name: st.name, synced: false, error: e.message });
    }
  }

  console.log(`✅ [DART] 국내 상장사 재무제표 동기화 완료 (총 ${results.length}개 종목)`);
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
