import React, { useState } from 'react';
import type { QuantMetrics, FilterState } from '../../types/stock';
import { HelpCircle } from 'lucide-react';

interface DynamicQuantGuideProps {
  metrics: QuantMetrics | null;
  onApplyDynamicFilters: (filters: Partial<FilterState>) => void;
}

interface HoverTooltipState {
  title: string;
  targetCriteria?: string;
  reason: string;
  x: number;
  y: number;
}

export const DynamicQuantGuide: React.FC<DynamicQuantGuideProps> = ({
  metrics,
  onApplyDynamicFilters
}) => {
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltipState | null>(null);

  if (!metrics) return null;

  const { krxMetrics, usMetrics, dynamicPresets } = metrics;

  const showTooltipAtElement = (e: React.MouseEvent<HTMLElement>, title: string, reason: string, targetCriteria?: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 150;

    // 상세설명 요소 바로 오른쪽(+10px)에 정확히 배치
    let x = rect.right + 10;
    let y = rect.top - 8;

    // 화면 우측 경계 체크: 우측 공간이 부족하면 요소 좌측에 배치
    if (x + tooltipWidth > window.innerWidth - 10) {
      x = rect.left - tooltipWidth - 10;
    }
    // 화면 하단 경계 체크
    if (y + tooltipHeight > window.innerHeight - 10) {
      y = window.innerHeight - tooltipHeight - 10;
    }
    if (y < 10) y = 10;

    setHoverTooltip({
      title,
      targetCriteria,
      reason,
      x,
      y
    });
  };

  const handleMouseLeave = () => {
    setHoverTooltip(null);
  };

  return (
    <>
      <div className="glass-card" style={{
        padding: '18px 20px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              동적 퀀트 가이드
              <span
                onMouseEnter={(e) => showTooltipAtElement(
                  e,
                  '동적 퀀트 가이드 안내',
                  '국내 vs 미국 시장의 현재 밸류에이션 통계를 실시간으로 추적하여 과열/저평가 구간을 분석하고, 최적의 추천 필터 기준을 동적으로 갱신합니다.'
                )}
                onMouseLeave={handleMouseLeave}
                style={{
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                <HelpCircle size={14} />
              </span>
            </h3>
          </div>

          {/* Market Median Stats */}
          <div style={{ display: 'flex', gap: '6px', fontSize: '0.72rem' }}>
            <span style={{ padding: '3px 6px', background: 'var(--bg-input)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
              한국 PER: <strong style={{ color: 'var(--color-up)' }}>{krxMetrics.medianPer.toFixed(1)}x</strong>
            </span>
            <span style={{ padding: '3px 6px', background: 'var(--bg-input)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
              미국 PER: <strong style={{ color: '#818cf8' }}>{usMetrics.medianPer.toFixed(1)}x</strong>
            </span>
          </div>
        </div>

        {/* Dynamic Recommendation Cards Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* 1. KRX Value Strategy Card */}
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
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>
                {dynamicPresets.krxValue.name}
              </div>
              <span
                onMouseEnter={(e) => showTooltipAtElement(
                  e,
                  dynamicPresets.krxValue.name,
                  dynamicPresets.krxValue.reason,
                  `PER ≤ ${dynamicPresets.krxValue.targetPer}배 · PBR ≤ ${dynamicPresets.krxValue.targetPbr}배 · ROE ≥ ${dynamicPresets.krxValue.targetRoe}%`
                )}
                onMouseLeave={handleMouseLeave}
                style={{
                  color: '#94a3b8',
                  fontSize: '0.73rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  display: 'inline-block',
                  marginTop: '2px'
                }}
              >
                상세설명
              </span>
            </div>
            <button
              onClick={() => onApplyDynamicFilters({
                market: 'KRX',
                assetType: 'STOCK',
                maxPer: dynamicPresets.krxValue.targetPer,
                maxPbr: dynamicPresets.krxValue.targetPbr,
                minRoe: dynamicPresets.krxValue.targetRoe
              })}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
            >
              적용
            </button>
          </div>

          {/* 2. US Growth Strategy Card */}
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
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>
                {dynamicPresets.usValue.name}
              </div>
              <span
                onMouseEnter={(e) => showTooltipAtElement(
                  e,
                  dynamicPresets.usValue.name,
                  dynamicPresets.usValue.reason,
                  `PER ≤ ${dynamicPresets.usValue.targetPer}배 · ROE ≥ ${dynamicPresets.usValue.targetRoe}%`
                )}
                onMouseLeave={handleMouseLeave}
                style={{
                  color: '#94a3b8',
                  fontSize: '0.73rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  display: 'inline-block',
                  marginTop: '2px'
                }}
              >
                상세설명
              </span>
            </div>
            <button
              onClick={() => onApplyDynamicFilters({
                market: 'US',
                assetType: 'STOCK',
                maxPer: dynamicPresets.usValue.targetPer,
                minRoe: dynamicPresets.usValue.targetRoe
              })}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
            >
              적용
            </button>
          </div>

          {/* 3. Dividend Strategy Card */}
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
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>
                {dynamicPresets.dividendSafe.name}
              </div>
              <span
                onMouseEnter={(e) => showTooltipAtElement(
                  e,
                  dynamicPresets.dividendSafe.name,
                  dynamicPresets.dividendSafe.reason,
                  `배당률 ≥ ${dynamicPresets.dividendSafe.targetDividendYield}% · 부채비율 ≤ ${dynamicPresets.dividendSafe.maxDebtRatio}%`
                )}
                onMouseLeave={handleMouseLeave}
                style={{
                  color: '#94a3b8',
                  fontSize: '0.73rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  display: 'inline-block',
                  marginTop: '2px'
                }}
              >
                상세설명
              </span>
            </div>
            <button
              onClick={() => onApplyDynamicFilters({
                market: 'ALL',
                assetType: 'STOCK',
                minDividend: dynamicPresets.dividendSafe.targetDividendYield,
                maxDebtRatio: dynamicPresets.dividendSafe.maxDebtRatio
              })}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
            >
              적용
            </button>
          </div>
        </div>
      </div>

      {/* Pop-up Tooltip Positioned Exactly to the Right of '상세설명' */}
      {hoverTooltip && (
        <div
          style={{
            position: 'fixed',
            left: hoverTooltip.x,
            top: hoverTooltip.y,
            width: '310px',
            background: 'rgba(15, 23, 42, 0.96)',
            border: '1px solid rgba(99, 102, 241, 0.45)',
            borderRadius: '8px',
            padding: '12px 14px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(12px)',
            pointerEvents: 'none',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: 'fadeIn 0.15s ease-out forwards'
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
            {hoverTooltip.title}
          </div>

          {hoverTooltip.targetCriteria && (
            <div style={{ fontSize: '0.78rem', color: 'var(--color-brand)', fontWeight: 600 }}>
              {hoverTooltip.targetCriteria}
            </div>
          )}

          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {hoverTooltip.reason}
          </div>
        </div>
      )}
    </>
  );
};
