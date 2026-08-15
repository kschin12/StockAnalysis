import React, { useState } from 'react';
import type { QuantMetrics, FilterState } from '../../types/stock';
import { HelpCircle } from 'lucide-react';

interface DynamicQuantGuideProps {
  metrics: QuantMetrics | null;
  onApplyDynamicFilters: (filters: Partial<FilterState>) => void;
}

type TooltipType = 'guide' | 'krx' | 'us' | 'dividend' | null;

export const DynamicQuantGuide: React.FC<DynamicQuantGuideProps> = ({
  metrics,
  onApplyDynamicFilters
}) => {
  const [activeTooltip, setActiveTooltip] = useState<TooltipType>(null);

  if (!metrics) return null;

  const { krxMetrics, usMetrics, dynamicPresets } = metrics;

  const cleanName = (name: string) => name.replace(/^[^\w\s가-힣]+/, '').trim();

  return (
    <div className="glass-card" style={{
      padding: '18px 20px',
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
      border: '1px solid rgba(99, 102, 241, 0.25)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      overflow: 'visible'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            동적 퀀트 가이드
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <span
                onMouseEnter={() => setActiveTooltip('guide')}
                onMouseLeave={() => setActiveTooltip(null)}
                style={{
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                <HelpCircle size={14} />
              </span>

              {/* Guide Info Tooltip */}
              {activeTooltip === 'guide' && (
                <div
                  style={{
                    position: 'absolute',
                    left: 'calc(100% + 10px)',
                    top: '-10px',
                    width: '310px',
                    background: 'rgba(15, 23, 42, 0.98)',
                    border: '1px solid rgba(99, 102, 241, 0.5)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(12px)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    animation: 'fadeIn 0.15s ease-out forwards',
                    pointerEvents: 'none'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    동적 퀀트 가이드 안내
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    국내 vs 미국 시장의 현재 밸류에이션 통계를 실시간으로 추적하여 과열/저평가 구간을 분석하고, 최적의 추천 필터 기준을 동적으로 갱신합니다.
                  </div>
                </div>
              )}
            </div>
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
              {cleanName(dynamicPresets.krxValue.name)}
            </div>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <span
                onMouseEnter={() => setActiveTooltip('krx')}
                onMouseLeave={() => setActiveTooltip(null)}
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

              {/* Tooltip positioned directly next to the word '상세설명' */}
              {activeTooltip === 'krx' && (
                <div
                  style={{
                    position: 'absolute',
                    left: 'calc(100% + 8px)',
                    top: '-20px',
                    width: '320px',
                    background: 'rgba(15, 23, 42, 0.98)',
                    border: '1px solid rgba(99, 102, 241, 0.5)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(12px)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    animation: 'fadeIn 0.15s ease-out forwards',
                    pointerEvents: 'none'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#fff', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    {cleanName(dynamicPresets.krxValue.name)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-brand)', fontWeight: 600 }}>
                    PER ≤ {dynamicPresets.krxValue.targetPer}배 · PBR ≤ {dynamicPresets.krxValue.targetPbr}배 · ROE ≥ {dynamicPresets.krxValue.targetRoe}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {dynamicPresets.krxValue.reason}
                  </div>
                </div>
              )}
            </div>
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
              {cleanName(dynamicPresets.usValue.name)}
            </div>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <span
                onMouseEnter={() => setActiveTooltip('us')}
                onMouseLeave={() => setActiveTooltip(null)}
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

              {/* Tooltip positioned directly next to the word '상세설명' */}
              {activeTooltip === 'us' && (
                <div
                  style={{
                    position: 'absolute',
                    left: 'calc(100% + 8px)',
                    top: '-20px',
                    width: '320px',
                    background: 'rgba(15, 23, 42, 0.98)',
                    border: '1px solid rgba(99, 102, 241, 0.5)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(12px)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    animation: 'fadeIn 0.15s ease-out forwards',
                    pointerEvents: 'none'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#fff', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    {cleanName(dynamicPresets.usValue.name)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-brand)', fontWeight: 600 }}>
                    PER ≤ {dynamicPresets.usValue.targetPer}배 · ROE ≥ {dynamicPresets.usValue.targetRoe}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {dynamicPresets.usValue.reason}
                  </div>
                </div>
              )}
            </div>
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
              {cleanName(dynamicPresets.dividendSafe.name)}
            </div>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <span
                onMouseEnter={() => setActiveTooltip('dividend')}
                onMouseLeave={() => setActiveTooltip(null)}
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

              {/* Tooltip positioned directly next to the word '상세설명' */}
              {activeTooltip === 'dividend' && (
                <div
                  style={{
                    position: 'absolute',
                    left: 'calc(100% + 8px)',
                    top: '-20px',
                    width: '320px',
                    background: 'rgba(15, 23, 42, 0.98)',
                    border: '1px solid rgba(99, 102, 241, 0.5)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(12px)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    animation: 'fadeIn 0.15s ease-out forwards',
                    pointerEvents: 'none'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#fff', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    {cleanName(dynamicPresets.dividendSafe.name)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-brand)', fontWeight: 600 }}>
                    배당률 ≥ {dynamicPresets.dividendSafe.targetDividendYield}% · 부채비율 ≤ {dynamicPresets.dividendSafe.maxDebtRatio}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {dynamicPresets.dividendSafe.reason}
                  </div>
                </div>
              )}
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
            style={{ fontSize: '0.75rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
};
