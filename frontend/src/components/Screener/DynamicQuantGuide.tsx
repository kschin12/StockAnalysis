import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { QuantMetrics, FilterState } from '../../types/stock';
import { HelpCircle } from 'lucide-react';

interface DynamicQuantGuideProps {
  metrics: QuantMetrics | null;
  onApplyDynamicFilters: (filters: Partial<FilterState>) => void;
}

interface ActiveGuideTooltip {
  title: string;
  badge: string;
  metricSummary: string;
  reason: string;
  x: number;
  y: number;
}

export const DynamicQuantGuide: React.FC<DynamicQuantGuideProps> = ({
  metrics,
  onApplyDynamicFilters
}) => {
  const [activeTooltip, setActiveTooltip] = useState<ActiveGuideTooltip | null>(null);

  if (!metrics) return null;

  const { kospiMetrics, kosdaqMetrics, krxMetrics, usMetrics, dynamicPresets } = metrics;

  const kospi = kospiMetrics || {
    medianPer: krxMetrics?.medianPer || 12.5,
    medianPbr: krxMetrics?.medianPbr || 0.95,
    avgRoe: krxMetrics?.avgRoe || 9.2,
    avgDividendYield: krxMetrics?.avgDividendYield || 2.4
  };

  const kosdaq = kosdaqMetrics || {
    medianPer: 35.0,
    medianPbr: 4.2,
    avgRoe: 16.5,
    avgDividendYield: 0.6
  };

  const us = usMetrics || {
    medianPer: 24.5,
    medianPbr: 6.8,
    avgRoe: 21.0,
    avgDividendYield: 1.8
  };

  const handleMouseEnter = (e: React.MouseEvent, title: string, badge: string, metricSummary: string, reason: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.right + 12;
    let y = rect.top - 10;
    if (x + 330 > window.innerWidth - 16) {
      x = rect.left - 330 - 12;
    }
    if (y + 160 > window.innerHeight - 16) {
      y = window.innerHeight - 170;
    }
    setActiveTooltip({ title, badge, metricSummary, reason, x, y });
  };

  const handleMouseLeave = () => {
    setActiveTooltip(null);
  };

  return (
    <div className="glass-card" style={{
      padding: '18px 20px',
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.85) 100%)',
      border: '1px solid rgba(99, 102, 241, 0.25)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            시장별 동적 퀀트 가이드
          </h3>
          <span
            onMouseEnter={(e) => handleMouseEnter(
              e,
              '코스피 vs 코스닥 퀀트 평가 기준 차이',
              '평가 철학',
              '코스피(가치·배당·PBR) vs 코스닥(고ROE·성장모멘텀)',
              '코스피는 대형 제조/금융 위주로 저PER·저PBR·배당 자산가치를 중시하며, 코스닥은 소부장/바이오/AI 위주로 단순 저PER 대신 높은 자본수익률(ROE 15%↑)과 성장 모멘텀을 중심으로 차별화하여 평가합니다.'
            )}
            onMouseLeave={handleMouseLeave}
            style={{ color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
          >
            <HelpCircle size={14} />
          </span>
        </div>

        {/* Market Valuation Indicators */}
        <div style={{ display: 'flex', gap: '6px', fontSize: '0.72rem', flexWrap: 'wrap' }}>
          <span style={{ padding: '2px 6px', background: 'var(--bg-input)', borderRadius: '4px', border: '1px solid rgba(99, 102, 241, 0.3)' }} title="코스피 중앙 밸류에이션">
            코스피: <strong style={{ color: '#818cf8' }}>PER {kospi.medianPer.toFixed(1)}x</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>({kospi.medianPbr.toFixed(2)}x)</span>
          </span>
          <span style={{ padding: '2px 6px', background: 'var(--bg-input)', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }} title="코스닥 중앙 밸류에이션">
            코스닥: <strong style={{ color: '#10b981' }}>PER {kosdaq.medianPer.toFixed(1)}x</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>(ROE {kosdaq.avgRoe.toFixed(1)}%)</span>
          </span>
          <span style={{ padding: '2px 6px', background: 'var(--bg-input)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }} title="미국 중앙 밸류에이션">
            미국: <strong style={{ color: '#f59e0b' }}>PER {us.medianPer.toFixed(1)}x</strong>
          </span>
        </div>
      </div>

      {/* Dynamic Recommendation Strategy Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* 1. KOSPI Value Strategy */}
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontWeight: 700 }}>
                코스피
              </span>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#fff' }}>
                {dynamicPresets.kospiValue?.name || '코스피 맞춤 저평가 우량 가치주'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
              <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                PER ≤ {dynamicPresets.kospiValue?.targetPer || 10.0}x · PBR ≤ {dynamicPresets.kospiValue?.targetPbr || 0.85}x
              </span>
              <span
                onMouseEnter={(e) => handleMouseEnter(
                  e,
                  dynamicPresets.kospiValue?.name || '코스피 맞춤 저평가 우량 가치주',
                  '코스피 가치투자',
                  `PER ≤ ${dynamicPresets.kospiValue?.targetPer || 10.0}배 · PBR ≤ ${dynamicPresets.kospiValue?.targetPbr || 0.85}배 · ROE ≥ ${dynamicPresets.kospiValue?.targetRoe || 7.0}% · 부채비율 ≤ 100%`,
                  dynamicPresets.kospiValue?.reason || '코스피 대형 제조업 및 금융 지주의 풍부한 자산가치와 안정적 배당에 기반한 저평가 우량주 필터입니다.'
                )}
                onMouseLeave={handleMouseLeave}
                style={{ color: '#94a3b8', fontSize: '0.72rem', textDecoration: 'underline', cursor: 'pointer' }}
              >
                상세설명
              </span>
            </div>
          </div>
          <button
            onClick={() => onApplyDynamicFilters({
              market: 'KOSPI',
              assetType: 'STOCK',
              maxPer: dynamicPresets.kospiValue?.targetPer || 10.0,
              maxPbr: dynamicPresets.kospiValue?.targetPbr || 0.85,
              minRoe: dynamicPresets.kospiValue?.targetRoe || 7.0,
              maxDebtRatio: 100
            })}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '5px 12px', whiteSpace: 'nowrap' }}
          >
            적용
          </button>
        </div>

        {/* 2. KOSDAQ Growth Strategy */}
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 700 }}>
                코스닥
              </span>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#fff' }}>
                {dynamicPresets.kosdaqGrowth?.name || '코스닥 맞춤 고성장 테크 & 바이오'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
              <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                ROE ≥ {dynamicPresets.kosdaqGrowth?.targetRoe || 15.0}% · PER ≤ {dynamicPresets.kosdaqGrowth?.targetPer || 45.0}x
              </span>
              <span
                onMouseEnter={(e) => handleMouseEnter(
                  e,
                  dynamicPresets.kosdaqGrowth?.name || '코스닥 맞춤 고성장 테크 & 바이오',
                  '코스닥 성장주',
                  `ROE ≥ ${dynamicPresets.kosdaqGrowth?.targetRoe || 15.0}% · PER ≤ ${dynamicPresets.kosdaqGrowth?.targetPer || 45.0}배 · 부채비율 ≤ 120% (PBR 제한 해제)`,
                  dynamicPresets.kosdaqGrowth?.reason || '소부장/바이오/AI의 높은 자본수익률(ROE 15%↑)과 성장 모멘텀 중심 필터로, 성장주 특성을 감안해 저PER/저PBR 허들을 완화하여 유망주를 발굴합니다.'
                )}
                onMouseLeave={handleMouseLeave}
                style={{ color: '#94a3b8', fontSize: '0.72rem', textDecoration: 'underline', cursor: 'pointer' }}
              >
                상세설명
              </span>
            </div>
          </div>
          <button
            onClick={() => onApplyDynamicFilters({
              market: 'KOSDAQ',
              assetType: 'STOCK',
              maxPer: dynamicPresets.kosdaqGrowth?.targetPer || 45.0,
              maxPbr: '',
              minRoe: dynamicPresets.kosdaqGrowth?.targetRoe || 15.0,
              maxDebtRatio: 120
            })}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '5px 12px', whiteSpace: 'nowrap' }}
          >
            적용
          </button>
        </div>

        {/* 3. US BigTech Growth Strategy */}
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 700 }}>
                미국
              </span>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#fff' }}>
                {dynamicPresets.usGrowth?.name || dynamicPresets.usValue?.name || '미국 시장 맞춤 글로벌 빅테크'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
              <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                PER ≤ {dynamicPresets.usGrowth?.targetPer || 25.0}x · ROE ≥ {dynamicPresets.usGrowth?.targetRoe || 15.0}%
              </span>
              <span
                onMouseEnter={(e) => handleMouseEnter(
                  e,
                  dynamicPresets.usGrowth?.name || '미국 시장 맞춤 글로벌 빅테크',
                  '미국 성장주',
                  `PER ≤ ${dynamicPresets.usGrowth?.targetPer || 25.0}배 · ROE ≥ ${dynamicPresets.usGrowth?.targetRoe || 15.0}%`,
                  dynamicPresets.usGrowth?.reason || '글로벌 독점력과 탁월한 복리 자본수익률(ROE 15%↑) 기반 미국 우량 성장주 선별 기준입니다.'
                )}
                onMouseLeave={handleMouseLeave}
                style={{ color: '#94a3b8', fontSize: '0.72rem', textDecoration: 'underline', cursor: 'pointer' }}
              >
                상세설명
              </span>
            </div>
          </div>
          <button
            onClick={() => onApplyDynamicFilters({
              market: 'US',
              assetType: 'STOCK',
              maxPer: dynamicPresets.usGrowth?.targetPer || 25.0,
              maxPbr: '',
              minRoe: dynamicPresets.usGrowth?.targetRoe || 15.0
            })}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '5px 12px', whiteSpace: 'nowrap' }}
          >
            적용
          </button>
        </div>

        {/* 4. Global Dividend Strategy */}
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', fontWeight: 700 }}>
                배당
              </span>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#fff' }}>
                {dynamicPresets.dividendSafe.name}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
              <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                배당률 ≥ {dynamicPresets.dividendSafe.targetDividendYield}% · 부채비율 ≤ {dynamicPresets.dividendSafe.maxDebtRatio}%
              </span>
              <span
                onMouseEnter={(e) => handleMouseEnter(
                  e,
                  dynamicPresets.dividendSafe.name,
                  '배당 안정주',
                  `배당수익률 ≥ ${dynamicPresets.dividendSafe.targetDividendYield}% · 부채비율 ≤ ${dynamicPresets.dividendSafe.maxDebtRatio}%`,
                  dynamicPresets.dividendSafe.reason
                )}
                onMouseLeave={handleMouseLeave}
                style={{ color: '#94a3b8', fontSize: '0.72rem', textDecoration: 'underline', cursor: 'pointer' }}
              >
                상세설명
              </span>
            </div>
          </div>
          <button
            onClick={() => onApplyDynamicFilters({
              market: 'ALL',
              assetType: 'STOCK',
              minDividend: dynamicPresets.dividendSafe.targetDividendYield,
              maxDebtRatio: dynamicPresets.dividendSafe.maxDebtRatio
            })}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '5px 12px', whiteSpace: 'nowrap' }}
          >
            적용
          </button>
        </div>

      </div>

      {/* Floating Detailed Hover Tooltip (Portal) */}
      {activeTooltip && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            left: `${activeTooltip.x}px`,
            top: `${activeTooltip.y}px`,
            width: '330px',
            background: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(99, 102, 241, 0.5)',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.8), 0 0 20px rgba(99, 102, 241, 0.25)',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            animation: 'fadeIn 0.15s ease-out forwards',
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#fff', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{activeTooltip.title}</span>
            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '3px', background: 'rgba(99, 102, 241, 0.25)', color: '#a5b4fc', fontWeight: 600 }}>
              {activeTooltip.badge}
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#818cf8', fontWeight: 600 }}>
            {activeTooltip.metricSummary}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'rgba(0, 0, 0, 0.3)', padding: '6px 8px', borderRadius: '4px' }}>
            {activeTooltip.reason}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
