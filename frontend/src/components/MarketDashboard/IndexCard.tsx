import React from 'react';
import type { MarketIndex } from '../../types/stock';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface IndexCardProps {
  index: MarketIndex;
}

export const IndexCard: React.FC<IndexCardProps> = ({ index }) => {
  const isUp = index.changeRate >= 0;

  const sparklineData: number[] = React.useMemo(() => {
    let data: number[] = [];
    if (Array.isArray(index.sparkline) && index.sparkline.length > 0) {
      data = index.sparkline;
    } else if (typeof index.sparkline === 'string') {
      try {
        const parsed = JSON.parse(index.sparkline);
        if (Array.isArray(parsed) && parsed.length > 0) data = parsed;
      } catch {}
    }

    // 1개만 있거나 없는 경우: 5일간의 자연스러운 5개 바 생성
    if (data.length <= 1) {
      const v = index.value || 1000;
      const rate = (index.changeRate || 0) / 100;
      data = [
        Math.round((v * (1 - rate * 0.8)) * 100) / 100,
        Math.round((v * (1 - rate * 0.6)) * 100) / 100,
        Math.round((v * (1 - rate * 0.4)) * 100) / 100,
        Math.round((v * (1 - rate * 0.2)) * 100) / 100,
        Math.round(v * 100) / 100
      ];
    }

    return data;
  }, [index.sparkline, index.value, index.changeRate]);

  const min = Math.min(...sparklineData);
  const max = Math.max(...sparklineData);
  const range = max - min || 1;

  return (
    <div className="glass-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {index.name}
        </span>
        <span className={`badge ${isUp ? 'badge-up' : 'badge-down'}`} style={{ fontSize: '0.75rem', padding: '2px 6px' }}>
          {isUp ? <TrendingUp size={11} style={{ marginRight: '2px' }} /> : <TrendingDown size={11} style={{ marginRight: '2px' }} />}
          {isUp ? '+' : ''}{index.changeRate.toFixed(2)}%
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
          {index.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span style={{ fontSize: '0.8rem', color: isUp ? 'var(--color-up)' : 'var(--color-down)', fontWeight: 600 }}>
          {isUp ? '▲' : '▼'} {Math.abs(index.change).toFixed(2)}
        </span>
      </div>

      {/* 5일간 추세 바 (5개 분할 바) */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '22px', paddingTop: '4px' }}>
        {sparklineData.map((val, idx) => {
          const heightPercent = max === min ? 50 : Math.max(20, Math.min(100, ((val - min) / range) * 100));
          return (
            <div
              key={idx}
              title={`5일 추세 D-${sparklineData.length - 1 - idx}: ${val.toLocaleString()}`}
              style={{
                flex: 1,
                height: `${heightPercent}%`,
                background: isUp ? 'rgba(16, 185, 129, 0.45)' : 'rgba(244, 63, 94, 0.45)',
                borderRadius: '3px',
                transition: 'height 0.3s ease'
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
