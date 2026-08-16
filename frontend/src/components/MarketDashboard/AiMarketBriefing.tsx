import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

interface MarketAnalysisData {
  briefing: string;
  generatedAt: string;
  modelUsed: string;
}

export const AiMarketBriefing: React.FC = () => {
  const [analysis, setAnalysis] = useState<MarketAnalysisData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const fetchAnalysis = async (forceRefresh: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini/market-analysis' + (forceRefresh ? '?refresh=true' : ''));
      if (!res.ok) {
        throw new Error('AI 시황 분석을 불러올 수 없습니다.');
      }
      const data = await res.json();
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || '시황 분석 호출 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  if (error && !analysis) {
    return null;
  }

  return (
    <div
      className="glass-card animate-fade-in"
      style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '16px',
        padding: '20px 24px',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isExpanded ? '14px' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            padding: '6px 10px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#fff',
            fontSize: '0.82rem',
            fontWeight: 700,
            boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)'
          }}>
            <Sparkles size={14} className="animate-pulse" />
            Gemini AI 퀀트 시황 진단
          </div>
          {analysis?.generatedAt && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              (기준: {analysis.generatedAt})
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => fetchAnalysis(true)}
            disabled={loading}
            className="btn btn-ghost"
            style={{
              padding: '6px 10px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--color-brand)'
            }}
            title="실시간 AI 시황 다시 분석"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'AI 분석 중...' : '시황 새로고침'}
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}
          >
            {isExpanded ? '접기 ▲' : '펼치기 ▼'}
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div style={{
          fontSize: '0.86rem',
          lineHeight: 1.65,
          color: '#e2e8f0',
          whiteSpace: 'pre-line',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {loading && !analysis ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
              실시간 국내 및 글로벌 시장 데이터를 바탕으로 Gemini AI가 퀀트 시황을 정밀 분석하고 있습니다...
            </div>
          ) : (
            analysis?.briefing
          )}
        </div>
      )}
    </div>
  );
};
