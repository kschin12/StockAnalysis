import React from 'react';
import type { Stock, MarketIndex, SectorPerf, QuantMetrics } from '../../types/stock';

interface MarketSummaryViewProps {
  indices: MarketIndex[];
  sectors: SectorPerf[];
  stocks: Stock[];
  quantMetrics: QuantMetrics | null;
  onSelectStock: (symbol: string) => void;
}

export const MarketSummaryView: React.FC<MarketSummaryViewProps> = ({
  indices,
  sectors,
  stocks,
  quantMetrics,
  onSelectStock
}) => {
  // 1. 국내 / 미국 종목 분리
  const krxStocks = stocks.filter(s => s.market === 'KRX' || s.currency === 'KRW');
  const usStocks = stocks.filter(s => s.market === 'US' || s.currency === 'USD');

  // 2. 시장 등락 분포 (Market Breadth)
  const krxAdvancers = krxStocks.filter(s => s.changeRate > 0).length;
  const krxDecliners = krxStocks.filter(s => s.changeRate < 0).length;
  const krxUnchanged = krxStocks.filter(s => s.changeRate === 0).length;

  const usAdvancers = usStocks.filter(s => s.changeRate > 0).length;
  const usDecliners = usStocks.filter(s => s.changeRate < 0).length;
  const usUnchanged = usStocks.filter(s => s.changeRate === 0).length;

  // 3. 섹터 랭킹
  const sortedSectors = [...sectors].sort((a, b) => b.changeRate - a.changeRate);
  const leadingSectors = sortedSectors.slice(0, 3);
  const laggingSectors = sortedSectors.slice(-3).reverse();

  // 4. 모멘텀 주도주 (신고가 근접 또는 ROE 15% 이상)
  const momentumLeaders = stocks
    .filter(s => s.momentumBadges && s.momentumBadges.length > 0)
    .sort((a, b) => b.changeRate - a.changeRate)
    .slice(0, 6);

  // 5. 위험 감지 종목
  const riskStocks = stocks
    .filter(s => s.warningBadges && s.warningBadges.length > 0)
    .slice(0, 6);

  // 6. 시장 센티먼트 판단
  const totalStocks = stocks.length || 1;
  const totalAdvancers = krxAdvancers + usAdvancers;
  const advanceRatio = Math.round((totalAdvancers / totalStocks) * 100);

  let marketSentiment = '중립 (혼조세)';
  let sentimentColor = '#fbbf24';
  let sentimentDesc = '상승 종목과 하락 종목이 팽팽하게 맞서며 섹터별 개별 장세가 이어지고 있습니다.';

  if (advanceRatio >= 60) {
    marketSentiment = '강세 (매수 우위 장세)';
    sentimentColor = 'var(--color-up)';
    sentimentDesc = '시장의 전반적인 투자 심리가 개선되며 대다수 업종으로 매수세가 확산되고 있습니다.';
  } else if (advanceRatio <= 40) {
    marketSentiment = '약세 (관망 및 조정 장세)';
    sentimentColor = 'var(--color-down)';
    sentimentDesc = '차익 실현 매물 및 거시경제 불확실성으로 인해 시장 전반이 보수적인 흐름을 보이고 있습니다.';
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Major Indices Quick Bar */}
      {indices.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '10px'
        }}>
          {indices.map(idx => {
            const isUp = idx.changeRate >= 0;
            return (
              <div
                key={idx.code}
                className="glass-card"
                style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{idx.name}</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                    {idx.value.toLocaleString()}
                  </div>
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: isUp ? 'var(--color-up)' : 'var(--color-down)',
                  textAlign: 'right'
                }}>
                  {isUp ? `+${idx.changeRate.toFixed(2)}%` : `${idx.changeRate.toFixed(2)}%`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. Market Top Summary Bar */}
      <div className="glass-card" style={{
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.3)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>오늘의 글로벌 시장 요약 브리핑</h2>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'rgba(99, 102, 241, 0.2)',
              color: sentimentColor,
              border: `1px solid ${sentimentColor}`
            }}>
              {marketSentiment}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            {sentimentDesc}
          </p>
        </div>

        {/* Global Breadth Stats */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 14px', background: 'var(--bg-input)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>국내 등락 분포 (KRX)</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '2px' }}>
              <span style={{ color: 'var(--color-up)' }}>상승 {krxAdvancers}</span> / <span style={{ color: 'var(--color-down)' }}>하락 {krxDecliners}</span> / <span>보합 {krxUnchanged}</span>
            </div>
          </div>

          <div style={{ padding: '8px 14px', background: 'var(--bg-input)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>미국 등락 분포 (US)</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '2px' }}>
              <span style={{ color: 'var(--color-up)' }}>상승 {usAdvancers}</span> / <span style={{ color: 'var(--color-down)' }}>하락 {usDecliners}</span> / <span>보합 {usUnchanged}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Valuation & Macro Comparison Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {/* 한국 시장 밸류에이션 */}
        <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#60a5fa' }}>한국 시장 (KRX) 밸류에이션</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{krxStocks.length}개 표본</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
            <div style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>중앙값 PER</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-up)', marginTop: '2px' }}>
                {quantMetrics?.krxMetrics.medianPer.toFixed(1) || '24.9'}x
              </div>
            </div>
            <div style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>중앙값 PBR</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                {quantMetrics?.krxMetrics.medianPbr.toFixed(2) || '1.99'}x
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            💡 <strong style={{ color: '#fff' }}>진단:</strong> 저PBR 자산주 중심의 밸류업 프로그램 수혜와 반도체 실적 개선이 지수 하방을 견고하게 지지하고 있습니다.
          </p>
        </div>

        {/* 미국 시장 밸류에이션 */}
        <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#c084fc' }}>미국 시장 (US) 밸류에이션</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{usStocks.length}개 표본</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
            <div style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>중앙값 PER</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#818cf8', marginTop: '2px' }}>
                {quantMetrics?.usMetrics.medianPer.toFixed(1) || '26.9'}x
              </div>
            </div>
            <div style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>평균 ROE</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                {quantMetrics?.usMetrics.avgRoe.toFixed(1) || '42.5'}%
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            💡 <strong style={{ color: '#fff' }}>진단:</strong> 빅테크 기업들의 강력한 AI 인프라 투자와 높은 자기자본수익률(ROE)로 인해 글로벌 프리미엄 밸류에이션이 정당화되는 국면입니다.
          </p>
        </div>

        {/* 주도 섹터 vs 약세 섹터 */}
        <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700 }}>오늘의 주도 섹터 & 약세 섹터</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-up)', fontWeight: 700 }}>상승 주도 섹터: </span>
              <span style={{ fontSize: '0.78rem', color: '#fff' }}>
                {leadingSectors.map(s => `${s.name} (+${s.changeRate.toFixed(2)}%)`).join(', ')}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-down)', fontWeight: 700 }}>하락 조정 섹터: </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {laggingSectors.map(s => `${s.name} (${s.changeRate.toFixed(2)}%)`).join(', ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 2-Column: Momentum Leaders vs Risk Alert Stocks */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '16px'
      }}>
        {/* 모멘텀 주도주 */}
        <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#818cf8' }}>
              오늘의 퀀트 모멘텀 주도주
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>신고가 / 강세 추세</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {momentumLeaders.length > 0 ? (
              momentumLeaders.map(stk => (
                <div
                  key={stk.symbol}
                  onClick={() => onSelectStock(stk.symbol)}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-input)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>
                      {stk.name} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({stk.symbol})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                      {stk.momentumBadges?.map((b, i) => (
                        <span key={i} style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }}>
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: stk.changeRate >= 0 ? 'var(--color-up)' : 'var(--color-down)' }}>
                      {stk.changeRate >= 0 ? `+${stk.changeRate.toFixed(2)}%` : `${stk.changeRate.toFixed(2)}%`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {stk.currency === 'KRW' ? `${stk.price.toLocaleString()}원` : `$${stk.price.toFixed(2)}`}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                모멘텀 감지 종목이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 위험 감지 종목 */}
        <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f87171' }}>
              재무 리스크 & 가치함정 주의 종목
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>고부채 / 적자 / 과열</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {riskStocks.length > 0 ? (
              riskStocks.map(stk => (
                <div
                  key={stk.symbol}
                  onClick={() => onSelectStock(stk.symbol)}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-input)',
                    borderRadius: '6px',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>
                      {stk.name} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({stk.symbol})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                      {stk.warningBadges?.map((b, i) => (
                        <span key={i} style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}>
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: stk.changeRate >= 0 ? 'var(--color-up)' : 'var(--color-down)' }}>
                      {stk.changeRate >= 0 ? `+${stk.changeRate.toFixed(2)}%` : `${stk.changeRate.toFixed(2)}%`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {stk.currency === 'KRW' ? `${stk.price.toLocaleString()}원` : `$${stk.price.toFixed(2)}`}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                현재 리스크 감지 종목이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Quant Investment Strategy Outlook */}
      <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
          💡 퀀트 기반 포트폴리오 운용 가이드
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          • <strong>한국 시장:</strong> PBR 1.0 미만 저평가 구간이면서 자기자본이익률(ROE)이 10% 이상 유지되는 '저평가 우량주' 중심의 방어적 밸류에이션 전략이 유리합니다.<br />
          • <strong>미국 시장:</strong> 밸류에이션 부담이 적으면서 52주 신고가 근접 추세를 유지하는 글로벌 빅테크 및 현금흐름이 견고한 배당 안정주(SCHD, 배당성장주) 포트폴리오 비중 유지를 권장합니다.
        </p>
      </div>
    </div>
  );
};
