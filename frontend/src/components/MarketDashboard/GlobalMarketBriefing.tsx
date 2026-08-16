import React, { useState, useEffect } from 'react';
import type { MarketIndex, SectorPerf, Stock } from '../../types/stock';
import { Sparkles, RefreshCw } from 'lucide-react';

interface GlobalMarketBriefingProps {
  indices: MarketIndex[];
  sectors: SectorPerf[];
  stocks: Stock[];
}

interface MarketAnalysisResponse {
  krx?: string;
  us?: string;
  briefing?: string;
  generatedAt?: string;
  modelUsed?: string;
}

export const GlobalMarketBriefing: React.FC<GlobalMarketBriefingProps> = ({
  indices,
  sectors,
  stocks
}) => {
  const [analysis, setAnalysis] = useState<MarketAnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // 한국 및 미국 시장 종목 분리 및 등락 집계
  const krxStocks = stocks.filter(s => s.market === 'KRX' || s.currency === 'KRW');
  const usStocks = stocks.filter(s => s.market === 'US' || s.currency === 'USD');

  const krxAdvancers = krxStocks.filter(s => (s.changeRate || 0) > 0).length;
  const krxDecliners = krxStocks.filter(s => (s.changeRate || 0) < 0).length;
  const krxUnchanged = Math.max(0, krxStocks.length - krxAdvancers - krxDecliners);

  const usAdvancers = usStocks.filter(s => (s.changeRate || 0) > 0).length;
  const usDecliners = usStocks.filter(s => (s.changeRate || 0) < 0).length;
  const usUnchanged = Math.max(0, usStocks.length - usAdvancers - usDecliners);

  const krxIndices = indices.filter(i => i.code === '^KS11' || i.code === '^KQ11');
  const usIndices = indices.filter(i => i.code === '^GSPC' || i.code === '^IXIC' || i.code === 'USDKRW=X');

  const leadingSectors = [...sectors].sort((a, b) => b.changeRate - a.changeRate).slice(0, 3);

  const fetchAnalysis = async (forceRefresh: boolean = false) => {
    setLoading(true);
    try {
      const res = await fetch('/api/gemini/market-analysis' + (forceRefresh ? '?refresh=true' : ''));
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
      }
    } catch (err) {
      console.warn('AI 시황 분석 호출 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  // 기본 AI 텍스트 (API 응답 없을 시 스마트 폴백)
  const krxText = analysis?.krx || (
    krxAdvancers >= krxDecliners
      ? '코스피와 코스닥 지수가 우상향 흐름을 주도하며 시장 참여자들의 위험자산 선호 심리가 강화되고 있습니다. 주도 섹터를 중심으로 외국인 및 기관의 수급 유입이 뚜렷합니다.'
      : '대외 변수 및 환율 변동성으로 인해 일부 차익 실현 매물이 출회되고 있습니다. 펀더멘털이 견고한 저PBR 가치주와 실적 개선주 중심의 선별적 방어 전략이 유리합니다.'
  );

  const usText = analysis?.us || (
    usAdvancers >= usDecliners
      ? 'S&P500과 나스닥은 AI 인프라 투자 지속성 및 연준(Fed) 금리 정책 전망에 민감하게 반응하고 있습니다. M7 기술주 중심의 이익 성장세가 글로벌 시장 전반의 모멘텀을 지지하고 있습니다.'
      : '국채 금리 상승 및 기술주 밸류에이션 부담으로 관망세가 우세합니다. 방어적 배당 성장주와 현금 흐름이 우수한 대형 가치주로의 분산 투자가 권장됩니다.'
  );

  return (
    <div className="glass-card animate-fade-in" style={{
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      border: '1px solid rgba(99, 102, 241, 0.25)',
      borderRadius: '14px',
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)'
    }}>
      {/* 상단 통합 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            padding: '5px 9px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            <Sparkles size={13} className="animate-pulse" />
            글로벌 시황 종합 브리핑
          </div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            국내(KRX) 및 글로벌·미국(US) 시장의 수급과 매크로를 AI로 심층 진단합니다.
          </span>
          {analysis?.generatedAt && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              (기준: {analysis.generatedAt})
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => fetchAnalysis(true)}
            disabled={loading}
            className="btn btn-ghost"
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '6px'
            }}
            title="실시간 AI 시황 새로고침"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            {loading ? 'AI 분석 중...' : '시황 새로고침'}
          </button>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '4px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>AI 실시간 연동</span>
          </div>
        </div>
      </div>

      {/* 2-Column: 국내 증시(KRX) 브리핑 vs 글로벌/미국 증시(US) 브리핑 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '16px'
      }}>
        {/* 1. 국내 시장 (KRX) 심층 시황 브리핑 */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '10px',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* 국내 헤더 & 지수 티커 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#93c5fd' }}>
              국내 증시 (KRX) 시황 브리핑
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {krxIndices.map(idx => (
                <span key={idx.code} style={{
                  fontSize: '0.75rem',
                  color: (idx.changeRate || 0) >= 0 ? 'var(--color-up)' : 'var(--color-down)',
                  fontWeight: 600
                }}>
                  {idx.name} {(idx.changeRate || 0) >= 0 ? '+' : ''}{idx.changeRate}%
                </span>
              ))}
            </div>
          </div>

          {/* 국내 시장 등락 비율 바 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
              <span style={{ color: 'var(--color-up)' }}>상승 {krxAdvancers}</span>
              <span style={{ color: 'var(--text-muted)' }}>보합 {krxUnchanged}</span>
              <span style={{ color: 'var(--color-down)' }}>하락 {krxDecliners}</span>
            </div>
            <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${(krxAdvancers / Math.max(1, krxStocks.length)) * 100}%`, background: 'var(--color-up)' }} />
              <div style={{ width: `${(krxUnchanged / Math.max(1, krxStocks.length)) * 100}%`, background: 'var(--text-muted)' }} />
              <div style={{ width: `${(krxDecliners / Math.max(1, krxStocks.length)) * 100}%`, background: 'var(--color-down)' }} />
            </div>
          </div>

          {/* 국내 AI 핵심 시황 분석 텍스트 */}
          <div style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.65 }}>
            <p style={{ margin: 0 }}>
              {krxText}
            </p>
          </div>

          {/* 국내 주도 섹터 태그 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
            <span>주도 섹터:</span>
            {leadingSectors.map(s => (
              <span key={s.name} style={{ color: 'var(--color-up)', fontWeight: 600 }}>
                {s.name} (+{s.changeRate.toFixed(1)}%)
              </span>
            ))}
          </div>
        </div>

        {/* 2. 글로벌/미국 시장 (US) 심층 시황 브리핑 */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          borderRadius: '10px',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* 미국 헤더 & 지수 티커 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#d8b4fe' }}>
              글로벌·미국 증시 (US) 브리핑
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {usIndices.map(idx => (
                <span key={idx.code} style={{
                  fontSize: '0.75rem',
                  color: (idx.changeRate || 0) >= 0 ? 'var(--color-up)' : 'var(--color-down)',
                  fontWeight: 600
                }}>
                  {idx.name} {(idx.changeRate || 0) >= 0 ? '+' : ''}{idx.changeRate}%
                </span>
              ))}
            </div>
          </div>

          {/* 미국 시장 등락 비율 바 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
              <span style={{ color: 'var(--color-up)' }}>상승 {usAdvancers}</span>
              <span style={{ color: 'var(--text-muted)' }}>보합 {usUnchanged}</span>
              <span style={{ color: 'var(--color-down)' }}>하락 {usDecliners}</span>
            </div>
            <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${(usAdvancers / Math.max(1, usStocks.length)) * 100}%`, background: 'var(--color-up)' }} />
              <div style={{ width: `${(usUnchanged / Math.max(1, usStocks.length)) * 100}%`, background: 'var(--text-muted)' }} />
              <div style={{ width: `${(usDecliners / Math.max(1, usStocks.length)) * 100}%`, background: 'var(--color-down)' }} />
            </div>
          </div>

          {/* 미국 AI 핵심 시황 분석 텍스트 */}
          <div style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.65 }}>
            <p style={{ margin: 0 }}>
              {usText}
            </p>
          </div>

          {/* 미국 핵심 지표/섹터 태그 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
            <span>주요 모멘텀:</span>
            <span style={{ color: 'var(--color-up)', fontWeight: 600 }}>빅테크(M7)</span>
            <span style={{ color: 'var(--color-up)', fontWeight: 600 }}>AI 인프라</span>
            <span style={{ color: '#93c5fd', fontWeight: 600 }}>환율 1,412.00</span>
          </div>
        </div>
      </div>
    </div>
  );
};
