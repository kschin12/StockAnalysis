import React from 'react';
import type { MarketIndex, SectorPerf, Stock } from '../../types/stock';
import { IndexCard } from './IndexCard';
import { SectorHeatmap } from './SectorHeatmap';

interface MarketDashboardProps {
  indices: MarketIndex[];
  sectors: SectorPerf[];
  stocks: Stock[];
  onSelectStock: (symbol: string) => void;
  onNavigateToScreenerWithPreset?: (presetId: string) => void;
}

export const MarketDashboard: React.FC<MarketDashboardProps> = ({
  indices,
  sectors,
  stocks,
  onSelectStock
}) => {
  // 모멘텀 주도주 (신고가 근접 또는 ROE 15% 이상, 상승 탄력)
  const momentumLeaders = stocks
    .filter(s => s.momentumBadges && s.momentumBadges.length > 0)
    .sort((a, b) => b.changeRate - a.changeRate)
    .slice(0, 6);

  // 위험 감지 종목 (가치함정, 고부채, 적자 등)
  const riskStocks = stocks
    .filter(s => s.warningBadges && s.warningBadges.length > 0)
    .slice(0, 6);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Index Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {indices.map(idx => (
          <IndexCard key={idx.code} index={idx} />
        ))}
      </div>

      {/* Sector Heatmap */}
      <SectorHeatmap sectors={sectors} />

      {/* 2-Column: Momentum Leaders vs Risk Alert Stocks (좌우 높이 및 각 행 일치) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '16px',
        alignItems: 'stretch'
      }}>
        {/* 오늘의 퀀트 모멘텀 주도주 */}
        <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '24px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#818cf8' }}>
              오늘의 퀀트 모멘텀 주도주
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>신고가 / 강세 추세</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {momentumLeaders.length > 0 ? (
              momentumLeaders.map(stk => (
                <div
                  key={stk.symbol}
                  onClick={() => onSelectStock(stk.symbol)}
                  style={{
                    height: '58px',
                    minHeight: '58px',
                    maxHeight: '58px',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
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
                  <div style={{ overflow: 'hidden', marginRight: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {stk.name} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({stk.symbol})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'nowrap', overflow: 'hidden' }}>
                      {stk.momentumBadges?.map((b, i) => (
                        <span key={i} style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', whiteSpace: 'nowrap' }}>
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
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

        {/* 재무 리스크 & 가치함정 주의 종목 */}
        <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '24px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f87171' }}>
              재무 리스크 & 가치함정 주의 종목
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>고부채 / 적자 / 과열</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {riskStocks.length > 0 ? (
              riskStocks.map(stk => (
                <div
                  key={stk.symbol}
                  onClick={() => onSelectStock(stk.symbol)}
                  style={{
                    height: '58px',
                    minHeight: '58px',
                    maxHeight: '58px',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
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
                  <div style={{ overflow: 'hidden', marginRight: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {stk.name} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({stk.symbol})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'nowrap', overflow: 'hidden' }}>
                      {stk.warningBadges?.map((b, i) => (
                        <span key={i} style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', whiteSpace: 'nowrap' }}>
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
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
    </div>
  );
};
