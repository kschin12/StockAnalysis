const { db } = require('./db');

const KOSDAQ_SYMBOLS = new Set([
  '058470', // 리노공업
  '403870', // HPSP
  '247540', // 에코프로비엠
  '086520', // 에코프로
  '196170', // 알테오젠
  '277810', // 레인보우로보틱스
  '141080', // 리가켐바이오
  '036930', // 주성엔지니어링
  '041510', // SM엔터
  '293490', // 카카오게임즈
  '263750', // 펄어비스
  '039030', // 이오테크닉스
  '108320', // 실리콘투
  '028300', // HLB
  '214150', // 클래시스
  '066970', // 엘앤에프
  '025980', // 아난티
  '357780', // 솔브레인
  '095660', // 네오위즈
  '237690', // 에스티팜
  '084370', // 유진테크
  '086900', // 메디톡스
  '145020', // 휴젤
  '328130', // 루닛
  '256840', // 한국비엔씨
  '112040', // 위메이드
  '067160', // SOOP
  '095700', // 제넥신
  '214370', // 케어젠
  '140860', // 파크시스템스
  '035900', // JYP Ent.
  '122870', // 와이지엔터테인먼트
  '091990', // 셀트리온제약
  '036830', // 솔브레인홀딩스
  '053800', // 안랩
  '048410', // 현대바이오
  '195870', // 해성디에스
  '230360', // 에코마케팅
  '298540', // 더네이쳐홀딩스
  '253450', // 스튜디오드래곤
  '090460'  // 비에이치
]);

// 시장별 통계 계산 헬퍼
function calculateMedian(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateAverage(values) {
  if (!values || values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

// 퀀트 지표 분석 및 코스피/코스닥/미국 분리 동적 추천 기준 산출
function evaluateMarketQuantMetrics() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM stocks WHERE assetType = "STOCK"', (err, rows) => {
      if (err) return reject(err);

      const krxStocks = rows.filter(s => s.market === 'KRX' || s.currency === 'KRW');
      const kospiStocks = krxStocks.filter(s => !KOSDAQ_SYMBOLS.has(s.symbol));
      const kosdaqStocks = krxStocks.filter(s => KOSDAQ_SYMBOLS.has(s.symbol));
      const usStocks = rows.filter(s => s.market === 'US' || s.currency === 'USD');

      // 1. 코스피 (KOSPI) 지표 집계
      const kospiPers = kospiStocks.map(s => s.per).filter(v => typeof v === 'number' && v > 0);
      const kospiPbrs = kospiStocks.map(s => s.pbr).filter(v => typeof v === 'number' && v > 0);
      const kospiRoes = kospiStocks.map(s => s.roe).filter(v => typeof v === 'number');
      const kospiDivs = kospiStocks.map(s => s.dividendYield).filter(v => typeof v === 'number');

      const kospiMedianPer = calculateMedian(kospiPers) || 12.5;
      const kospiMedianPbr = calculateMedian(kospiPbrs) || 0.95;
      const kospiAvgRoe = calculateAverage(kospiRoes) || 9.2;
      const kospiAvgDiv = calculateAverage(kospiDivs) || 2.4;

      // 2. 코스닥 (KOSDAQ) 지표 집계 (성장주/바이오/소부장 특성 반영)
      const kosdaqPers = kosdaqStocks.map(s => s.per).filter(v => typeof v === 'number' && v > 0);
      const kosdaqPbrs = kosdaqStocks.map(s => s.pbr).filter(v => typeof v === 'number' && v > 0);
      const kosdaqRoes = kosdaqStocks.map(s => s.roe).filter(v => typeof v === 'number');
      const kosdaqDivs = kosdaqStocks.map(s => s.dividendYield).filter(v => typeof v === 'number');

      const kosdaqMedianPer = calculateMedian(kosdaqPers) || 35.0;
      const kosdaqMedianPbr = calculateMedian(kosdaqPbrs) || 4.2;
      const kosdaqAvgRoe = calculateAverage(kosdaqRoes) || 16.5;
      const kosdaqAvgDiv = calculateAverage(kosdaqDivs) || 0.6;

      // 3. 미국 시장 (US) 지표 집계
      const usPers = usStocks.map(s => s.per).filter(v => typeof v === 'number' && v > 0);
      const usPbrs = usStocks.map(s => s.pbr).filter(v => typeof v === 'number' && v > 0);
      const usRoes = usStocks.map(s => s.roe).filter(v => typeof v === 'number');
      const usDivs = usStocks.map(s => s.dividendYield).filter(v => typeof v === 'number');

      const usMedianPer = calculateMedian(usPers) || 24.5;
      const usMedianPbr = calculateMedian(usPbrs) || 6.8;
      const usAvgRoe = calculateAverage(usRoes) || 21.0;
      const usAvgDiv = calculateAverage(usDivs) || 1.8;

      // 4. 시장 통계 기반 동적 추천 기준점 (Dynamic Thresholds)
      
      // [코스피 맞춤] 저평가 가치주 기준: 대형 제조/금융의 자산가치 및 안정적 현금흐름
      const dynamicKospiValueCriteria = {
        name: '코스피 맞춤 저평가 우량 가치주',
        market: 'KOSPI',
        targetPer: Math.round((kospiMedianPer * 0.8) * 10) / 10 || 10.0,
        targetPbr: Math.round((kospiMedianPbr * 0.85) * 100) / 100 || 0.85,
        targetRoe: Math.max(7.0, Math.round(kospiAvgRoe * 10) / 10),
        maxDebtRatio: 100.0,
        reason: `코스피 중앙값(PER ${kospiMedianPer.toFixed(1)}x, PBR ${kospiMedianPbr.toFixed(2)}x) 대비 15~20% 할인된 밸류에이션 및 저부채(100%↓) 안전 기준 적용`
      };

      // [코스닥 맞춤] 고성장 혁신 테크 & 바이오 기준: 높은 자본수익률(ROE)과 성장성 중심 (PER 상한 대폭 완화)
      const dynamicKosdaqGrowthCriteria = {
        name: '코스닥 맞춤 고성장 테크 & 바이오',
        market: 'KOSDAQ',
        targetPer: 45.0, // 성장주 특성에 맞춘 유연한 PER 상한
        targetPbr: '', // 성장주 특성상 PBR 제한 해제
        targetRoe: Math.max(15.0, Math.round(kosdaqAvgRoe * 10) / 10),
        maxDebtRatio: 120.0,
        reason: `코스닥 소부장/바이오의 높은 자본수익률(ROE 15%↑)과 성장 모멘텀 중심 필터 (성장주 특성 감안 PER 45배까지 허용)`
      };

      // [미국 시장 맞춤] 빅테크 글로벌 우량 성장주 기준
      const dynamicUsGrowthCriteria = {
        name: '미국 시장 맞춤 글로벌 빅테크 성장주',
        market: 'US',
        targetPer: Math.round((usMedianPer * 0.9) * 10) / 10 || 24.0,
        targetPbr: Math.round((usMedianPbr * 0.8) * 10) / 10 || 8.0,
        targetRoe: Math.max(15.0, Math.round(usAvgRoe * 0.5 * 10) / 10),
        maxDebtRatio: 150.0,
        reason: `글로벌 독점력과 복리 자본수익률(ROE 15%↑) 기반 미국 우량 성장주 선별`
      };

      // [글로벌 고배당] 배당 안정 방어주 기준
      const dynamicDividendCriteria = {
        name: '글로벌 고배당 캐시카우 안정주',
        market: 'ALL',
        targetDividendYield: Math.max(3.0, Math.round((kospiAvgDiv + 1.0) * 10) / 10),
        maxDebtRatio: 90.0,
        reason: `국내외 평균 배당률 대비 +1.0%p 프리미엄 및 부채비율 90% 이하 재무 건전성 필터`
      };

      // 5. 가치함정(Value Trap) 및 위험 감지 통계
      const warningCount = rows.filter(s => s.warningBadges && s.warningBadges.length > 0).length;

      resolve({
        updatedAt: new Date().toISOString(),
        kospiMetrics: {
          medianPer: kospiMedianPer,
          medianPbr: kospiMedianPbr,
          avgRoe: kospiAvgRoe,
          avgDividendYield: kospiAvgDiv,
          stockCount: kospiStocks.length
        },
        kosdaqMetrics: {
          medianPer: kosdaqMedianPer,
          medianPbr: kosdaqMedianPbr,
          avgRoe: kosdaqAvgRoe,
          avgDividendYield: kosdaqAvgDiv,
          stockCount: kosdaqStocks.length
        },
        krxMetrics: {
          medianPer: kospiMedianPer,
          medianPbr: kospiMedianPbr,
          avgRoe: kospiAvgRoe,
          avgDividendYield: kospiAvgDiv,
          stockCount: krxStocks.length
        },
        usMetrics: {
          medianPer: usMedianPer,
          medianPbr: usMedianPbr,
          avgRoe: usAvgRoe,
          avgDividendYield: usAvgDiv,
          stockCount: usStocks.length
        },
        dynamicPresets: {
          kospiValue: dynamicKospiValueCriteria,
          kosdaqGrowth: dynamicKosdaqGrowthCriteria,
          usValue: dynamicUsGrowthCriteria,
          usGrowth: dynamicUsGrowthCriteria,
          krxValue: dynamicKospiValueCriteria,
          dividendSafe: dynamicDividendCriteria
        },
        riskAssessment: {
          warningStockCount: warningCount,
          activeRule: '부채비율 200% 초과 OR 이자보상배율 1 미만 OR 극단적 저PER(3 이하) 자동 감지'
        }
      });
    });
  });
}

module.exports = {
  evaluateMarketQuantMetrics,
  KOSDAQ_SYMBOLS
};
