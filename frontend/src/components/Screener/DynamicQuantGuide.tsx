import React from 'react';
import type { QuantMetrics, FilterState } from '../../types/stock';
import { Cpu, ShieldCheck, Sparkles } from 'lucide-react';

interface DynamicQuantGuideProps {
  metrics: QuantMetrics | null;
  onApplyDynamicFilters: (filters: Partial<FilterState>) => void;
}

export const DynamicQuantGuide: React.FC<DynamicQuantGuideProps> = ({
  metrics,
  onApplyDynamicFilters
}) => {
  if (!metrics) return null;

  const { krxMetrics, usMetrics, dynamicPresets } = metrics;

  return (
    <div className="glass-card" style={{
      padding: '20px 24px',
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
      border: '1px solid rgba(99, 102, 241, 0.25)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'rgba(99, 102, 241, 0.2)',
            padding: '6px',
            borderRadius: '8px',
            color: 'var(--color-brand)'
          }}>
            <Cpu size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              시장 통계 기반 동적 퀀트 가이드 (Dynamic Strategy)
              <span className="badge badge-up" style={{ fontSize: '0.68rem' }}>실시간 분석</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              국내 vs 미국 시장의 현재 밸류에이션 통계를 추적하여 최적의 추천 필터 기준을 동적으로 갱신합니다.
            </p>
          </div>
        </div>

        {/* Quick Market Stats pill */}
        <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
          <span style={{ padding: '4px 8px', background: 'var(--bg-input)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            🇰🇷 KRX 중앙값 PER: <strong style={{ color: 'var(--color-up)' }}>{krxMetrics.medianPer.toFixed(1)}x</strong>
          </span>
          <span style={{ padding: '4px 8px', background: 'var(--bg-input)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            🇺🇸 US 중앙값 PER: <strong style={{ color: '#818cf8' }}>{usMetrics.medianPer.toFixed(1)}x</strong>
          </span>
        </div>
      </div>

      {/* Dynamic Recommendation Cards Stack */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* KRX Value Strategy Card */}
        <div style={{
          padding: '14px',
          background: 'var(--bg-input)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{dynamicPresets.krxValue.name}</span>
              <span className="badge badge-tag" style={{ fontSize: '0.65rem' }}>동적 산출</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 700, margin: '4px 0' }}>
              PER ≤ {dynamicPresets.krxValue.targetPer}배 · PBR ≤ {dynamicPresets.krxValue.targetPbr}배 · ROE ≥ {dynamicPresets.krxValue.targetRoe}%
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {dynamicPresets.krxValue.reason}
            </p>
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
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', padding: '6px' }}
          >
            <Sparkles size={12} color="#818cf8" />
            이 추천 기준 필터에 적용
          </button>
        </div>

        {/* US Value Strategy Card */}
        <div style={{
          padding: '14px',
          background: 'var(--bg-input)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{dynamicPresets.usValue.name}</span>
              <span className="badge badge-tag" style={{ fontSize: '0.65rem' }}>동적 산출</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 700, margin: '4px 0' }}>
              PER ≤ {dynamicPresets.usValue.targetPer}배 · ROE ≥ {dynamicPresets.usValue.targetRoe}%
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {dynamicPresets.usValue.reason}
            </p>
          </div>
          <button
            onClick={() => onApplyDynamicFilters({
              market: 'US',
              assetType: 'STOCK',
              maxPer: dynamicPresets.usValue.targetPer,
              minRoe: dynamicPresets.usValue.targetRoe
            })}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', padding: '6px' }}
          >
            <Sparkles size={12} color="#818cf8" />
            이 추천 기준 필터에 적용
          </button>
        </div>

        {/* Dividend Strategy Card */}
        <div style={{
          padding: '14px',
          background: 'var(--bg-input)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{dynamicPresets.dividendSafe.name}</span>
              <span className="badge badge-tag" style={{ fontSize: '0.65rem' }}>동적 산출</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 700, margin: '4px 0' }}>
              배당률 ≥ {dynamicPresets.dividendSafe.targetDividendYield}% · 부채비율 ≤ {dynamicPresets.dividendSafe.maxDebtRatio}%
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {dynamicPresets.dividendSafe.reason}
            </p>
          </div>
          <button
            onClick={() => onApplyDynamicFilters({
              market: 'ALL',
              assetType: 'STOCK',
              minDividend: dynamicPresets.dividendSafe.targetDividendYield,
              maxDebtRatio: dynamicPresets.dividendSafe.maxDebtRatio
            })}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', padding: '6px' }}
          >
            <ShieldCheck size={12} color="#10b981" />
            이 추천 기준 필터에 적용
          </button>
        </div>
      </div>
    </div>
  );
};
