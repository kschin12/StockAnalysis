import React from 'react';
import type { SectorPerf } from '../../types/stock';

interface SectorHeatmapProps {
  sectors: SectorPerf[];
}

export const SectorHeatmap: React.FC<SectorHeatmapProps> = ({ sectors }) => {
  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>주요 섹터별 등락 현황 (Heatmap)</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>오늘 시장을 주도하는 테마 및 섹터 등락률</p>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>실시간 업데이트</span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px'
      }}>
        {sectors.map((sec, idx) => {
          const isUp = sec.changeRate >= 0;
          // 등락률에 따른 투명도 조절
          const intensity = Math.min(1, Math.abs(sec.changeRate) / 3.0);
          const bgColor = isUp 
            ? `rgba(16, 185, 129, ${0.15 + intensity * 0.25})`
            : `rgba(244, 63, 94, ${0.15 + intensity * 0.25})`;
          const borderColor = isUp ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)';

          return (
            <div
              key={idx}
              style={{
                background: bgColor,
                border: `1px solid ${borderColor}`,
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '90px',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{sec.name}</span>
                <span style={{
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: isUp ? 'var(--color-up)' : 'var(--color-down)'
                }}>
                  {isUp ? '+' : ''}{sec.changeRate.toFixed(2)}%
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                주도주: <strong style={{ color: '#fff' }}>{sec.topStock}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
