import React from 'react';
import type { MarketIndex, SectorPerf, Stock } from '../../types/stock';
import { IndexCard } from './IndexCard';
import { SectorHeatmap } from './SectorHeatmap';
import { Flame, AlertTriangle } from 'lucide-react';

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
  // 상위 상승 종목
  const topGainers = [...stocks].sort((a, b) => b.changeRate - a.changeRate).slice(0, 4);
  // 경고 종목 (가치함정 등)
  const warningStocks = stocks.filter(s => s.warningBadges && s.warningBadges.length > 0);

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

      {/* Highlights Split: Top Gainers & Cautionary Stocks */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '20px'
      }}>
        {/* Top Momentum */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Flame size={20} color="#f59e0b" />
            <h3 style={{ fontSize: '1.05rem' }}>오늘의 모멘텀 상위 종목</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topGainers.map(stk => (
              <div
                key={stk.symbol}
                onClick={() => onSelectStock(stk.symbol)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  border: '1px solid transparent',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-accent)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{stk.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    [{stk.market}] {stk.symbol} · {stk.sector}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-up)', fontSize: '0.95rem' }}>
                    +{stk.changeRate.toFixed(2)}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {stk.currency === 'KRW' ? `₩${stk.price.toLocaleString()}` : `$${stk.price}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning / Caution Badges */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertTriangle size={20} color="#f43f5e" />
            <h3 style={{ fontSize: '1.05rem' }}>위험 지표 감지 (가치함정 주의)</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {warningStocks.length > 0 ? (
              warningStocks.map(stk => (
                <div
                  key={stk.symbol}
                  onClick={() => onSelectStock(stk.symbol)}
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(244, 63, 94, 0.06)',
                    border: '1px solid rgba(244, 63, 94, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600 }}>{stk.name} ({stk.symbol})</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-down)' }}>{stk.changeRate}%</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {stk.warningBadges?.map((b, i) => (
                      <span key={i} className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                        ⚠️ {b}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>현재 감지된 고위험 종목이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
