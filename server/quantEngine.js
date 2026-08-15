const { db } = require('./db');

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

// 퀀트 지표 분석 및 동적 추천 기준 산출
function evaluateMarketQuantMetrics() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM stocks WHERE assetType = "STOCK"', (err, rows) => {
      if (err) return reject(err);

      const krxStocks = rows.filter(s => s.market === 'KRX' || s.currency === 'KRW');
      const usStocks = rows.filter(s => s.market === 'US' || s.currency === 'USD');

      // 1. 국내 시장(KRX) 지표 집계
      const krxPers = krxStocks.map(s => s.per).filter(v => typeof v === 'number' && v > 0);
      const krxPbrs = krxStocks.map(s => s.pbr).filter(v => typeof v === 'number' && v > 0);
      const krxRoes = krxStocks.map(s => s.roe).filter(v => typeof v === 'number');
      const krxDivs = krxStocks.map(s => s.dividendYield).filter(v => typeof v === 'number');

      const krxMedianPer = calculateMedian(krxPers);
      const krxMedianPbr = calculateMedian(krxPbrs);
      const krxAvgRoe = calculateAverage(krxRoes);
      const krxAvgDiv = calculateAverage(krxDivs);

      // 2. 미국 시장(US) 지표 집계
      const usPers = usStocks.map(s => s.per).filter(v => typeof v === 'number' && v > 0);
      const usPbrs = usStocks.map(s => s.pbr).filter(v => typeof v === 'number' && v > 0);
      const usRoes = usStocks.map(s => s.roe).filter(v => typeof v === 'number');
      const usDivs = usStocks.map(s => s.dividendYield).filter(v => typeof v === 'number');

      const usMedianPer = calculateMedian(usPers);
      const usMedianPbr = calculateMedian(usPbrs);
      const usAvgRoe = calculateAverage(usRoes);
      const usAvgDiv = calculateAverage(usDivs);

      // 3. 시장 통계 기반 동적 추천 기준점 (Dynamic Thresholds)
      // 한국: 코리아 디스카운트 감안, 시장 중앙값의 80%를 저평가 기준으로 자동 설정
      const dynamicKrxValueCriteria = {
        name: '한국 시장 맞춤 저평가 우량주 기준',
        targetPer: Math.round((krxMedianPer * 0.8) * 10) / 10 || 8.5,
        targetPbr: Math.round((krxMedianPbr * 0.85) * 100) / 100 || 0.85,
        targetRoe: Math.max(8.0, Math.round(krxAvgRoe * 10) / 10),
        reason: `현재 국내 중앙값(PER ${krxMedianPer.toFixed(1)}x, PBR ${krxMedianPbr.toFixed(2)}x) 대비 15~20% 할인된 밸류에이션 적용`
      };

      // 미국: 빅테크 프리미엄 감안, 시장 중앙값 수준 PER + 고ROE(15%↑)
      const dynamicUsValueCriteria = {
        name: '미국 시장 맞춤 우량 성장주 기준',
        targetPer: Math.round((usMedianPer * 0.9) * 10) / 10 || 22.0,
        targetPbr: Math.round((usMedianPbr * 0.8) * 10) / 10 || 8.0,
        targetRoe: Math.max(15.0, Math.round(usAvgRoe * 0.5 * 10) / 10),
        reason: `현재 미국 중앙값(PER ${usMedianPer.toFixed(1)}x) 감안, 고수익성(ROE 15%↑) 기반 우량주 선별`
      };

      // 4. 배당 안정주 동적 기준
      const dynamicDividendCriteria = {
        name: '글로벌 배당 안정주 기준',
        targetDividendYield: Math.max(3.0, Math.round((krxAvgDiv + 1.0) * 10) / 10),
        maxDebtRatio: 100.0,
        reason: `국내외 평균 배당률 대비 +1.0%p 프리미엄 및 부채비율 100% 이하 재무 건전성 필터`
      };

      // 5. 가치함정(Value Trap) 및 위험 감지 통계
      const warningCount = rows.filter(s => s.warningBadges && s.warningBadges.length > 0).length;

      resolve({
        updatedAt: new Date().toISOString(),
        krxMetrics: {
          medianPer: krxMedianPer,
          medianPbr: krxMedianPbr,
          avgRoe: krxAvgRoe,
          avgDividendYield: krxAvgDiv,
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
          krxValue: dynamicKrxValueCriteria,
          usValue: dynamicUsValueCriteria,
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
  evaluateMarketQuantMetrics
};
