import React from 'react';
import type { MarketIndex } from '../../types/stock';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface IndexCardProps {
  index: MarketIndex;
}

export const IndexCard: React.FC<IndexCardProps> = ({ index }) => {
  const isUp = index.changeRate >= 0;

  return (
    <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {index.name}
        </span>
        <span className={`badge ${isUp ? 'badge-up' : 'badge-down'}`}>
          {isUp ? <TrendingUp size={12} style={{ marginRight: '3px' }} /> : <TrendingDown size={12} style={{ marginRight: '3px' }} />}
          {isUp ? '+' : ''}{index.changeRate.toFixed(2)}%
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
          {index.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span style={{ fontSize: '0.85rem', color: isUp ? 'var(--color-up)' : 'var(--color-down)', fontWeight: 600 }}>
          {isUp ? '▲' : '▼'} {Math.abs(index.change).toFixed(2)}
        </span>
      </div>

      {/* Mini Sparkline Bar representation */}
      {index.sparkline && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '24px', paddingTop: '6px' }}>
          {index.sparkline.map((val, idx) => {
            const min = Math.min(...index.sparkline!);
            const max = Math.max(...index.sparkline!);
            const heightPercent = max === min ? 50 : Math.max(15, ((val - min) / (max - min)) * 100);
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  height: `${heightPercent}%`,
                  background: isUp ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
                  borderRadius: '2px',
                  transition: 'height 0.3s'
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
