import React, { useState } from 'react';
import type { QuantMetrics, FilterState } from '../../types/stock';
import { HelpCircle, X } from 'lucide-react';

interface DynamicQuantGuideProps {
  metrics: QuantMetrics | null;
  onApplyDynamicFilters: (filters: Partial<FilterState>) => void;
}

interface DetailModalState {
  title: string;
  targetCriteria: string;
  reason: string;
  onApply: () => void;
}

export const DynamicQuantGuide: React.FC<DynamicQuantGuideProps> = ({
  metrics,
  onApplyDynamicFilters
}) => {
  const [detailModal, setDetailModal] = useState<DetailModalState | null>(null);
  const [showGuideInfo, setShowGuideInfo] = useState<boolean>(false);

  if (!metrics) return null;

  const { krxMetrics, usMetrics, dynamicPresets } = metrics;

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
              <button
                onClick={() => setShowGuideInfo(true)}
                title="동적 퀀트 가이드 설명 보기"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <HelpCircle size={15} />
              </button>
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
          <div style={{
            padding: '12px 14px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>
                {dynamicPresets.krxValue.name}
              </div>
              <button
                onClick={() => setDetailModal({
                  title: dynamicPresets.krxValue.name,
                  targetCriteria: `PER ≤ ${dynamicPresets.krxValue.targetPer}배 · PBR ≤ ${dynamicPresets.krxValue.targetPbr}배 · ROE ≥ ${dynamicPresets.krxValue.targetRoe}%`,
                  reason: dynamicPresets.krxValue.reason,
                  onApply: () => {
                    onApplyDynamicFilters({
                      market: 'KRX',
                      assetType: 'STOCK',
                      maxPer: dynamicPresets.krxValue.targetPer,
                      maxPbr: dynamicPresets.krxValue.targetPbr,
                      minRoe: dynamicPresets.krxValue.targetRoe
                    });
                    setDetailModal(null);
                  }
                })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  textAlign: 'left'
                }}
              >
                상세 설명 보기
              </button>
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
          <div style={{
            padding: '12px 14px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>
                {dynamicPresets.usValue.name}
              </div>
              <button
                onClick={() => setDetailModal({
                  title: dynamicPresets.usValue.name,
                  targetCriteria: `PER ≤ ${dynamicPresets.usValue.targetPer}배 · ROE ≥ ${dynamicPresets.usValue.targetRoe}%`,
                  reason: dynamicPresets.usValue.reason,
                  onApply: () => {
                    onApplyDynamicFilters({
                      market: 'US',
                      assetType: 'STOCK',
                      maxPer: dynamicPresets.usValue.targetPer,
                      minRoe: dynamicPresets.usValue.targetRoe
                    });
                    setDetailModal(null);
                  }
                })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  textAlign: 'left'
                }}
              >
                상세 설명 보기
              </button>
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
          <div style={{
            padding: '12px 14px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>
                {dynamicPresets.dividendSafe.name}
              </div>
              <button
                onClick={() => setDetailModal({
                  title: dynamicPresets.dividendSafe.name,
                  targetCriteria: `배당률 ≥ ${dynamicPresets.dividendSafe.targetDividendYield}% · 부채비율 ≤ ${dynamicPresets.dividendSafe.maxDebtRatio}%`,
                  reason: dynamicPresets.dividendSafe.reason,
                  onApply: () => {
                    onApplyDynamicFilters({
                      market: 'ALL',
                      assetType: 'STOCK',
                      minDividend: dynamicPresets.dividendSafe.targetDividendYield,
                      maxDebtRatio: dynamicPresets.dividendSafe.maxDebtRatio
                    });
                    setDetailModal(null);
                  }
                })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  textAlign: 'left'
                }}
              >
                상세 설명 보기
              </button>
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

      {/* Guide Info Modal */}
      {showGuideInfo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={() => setShowGuideInfo(false)}
        >
          <div
            style={{
              background: '#151c2c',
              border: '1px solid var(--border-accent)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>동적 퀀트 가이드란?</h4>
              <button
                onClick={() => setShowGuideInfo(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              국내 vs 미국 시장의 현재 밸류에이션 통계를 실시간으로 추적하여 고평가/저평가 구간을 분석하고, 최적의 추천 필터 기준을 동적으로 갱신합니다.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowGuideInfo(false)}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '6px 16px' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Detail Pop-up Modal */}
      {detailModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={() => setDetailModal(null)}
        >
          <div
            style={{
              background: '#151c2c',
              border: '1px solid var(--border-accent)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{detailModal.title} 상세 기준</h4>
              <button
                onClick={() => setDetailModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '12px 14px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-brand)', fontWeight: 600, marginBottom: '4px' }}>
                추천 필터 조건
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                {detailModal.targetCriteria}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                산출 근거 및 설명
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {detailModal.reason}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                onClick={() => setDetailModal(null)}
                className="btn btn-ghost"
                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              >
                닫기
              </button>
              <button
                onClick={detailModal.onApply}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '6px 16px' }}
              >
                이 기준 적용
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
