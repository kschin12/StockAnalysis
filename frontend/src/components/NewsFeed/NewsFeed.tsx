import React, { useState, useEffect } from 'react';
import type { NewsItem, MarketIndex, SectorPerf, Stock, QuantMetrics } from '../../types/stock';
import { Newspaper, FileText, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface NewsFeedProps {
  news: NewsItem[];
  indices?: MarketIndex[];
  sectors?: SectorPerf[];
  stocks?: Stock[];
  quantMetrics?: QuantMetrics | null;
  onSelectStock: (symbol: string) => void;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({
  news,
  indices = [],
  sectors = [],
  stocks = [],
  quantMetrics = null,
  onSelectStock
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'NEWS' | 'DISCLOSURE'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 6;

  // --- 시장 요약 통계 산출 ---
  const krxStocks = stocks.filter(s => s.market === 'KRX' || s.currency === 'KRW');
  const usStocks = stocks.filter(s => s.market === 'US' || s.currency === 'USD');

  const krxAdvancers = krxStocks.filter(s => s.changeRate > 0).length;
  const krxDecliners = krxStocks.filter(s => s.changeRate < 0).length;
  const krxUnchanged = krxStocks.filter(s => s.changeRate === 0).length;

  const usAdvancers = usStocks.filter(s => s.changeRate > 0).length;
  const usDecliners = usStocks.filter(s => s.changeRate < 0).length;
  const usUnchanged = usStocks.filter(s => s.changeRate === 0).length;

  const sortedSectors = [...sectors].sort((a, b) => b.changeRate - a.changeRate);
  const leadingSectors = sortedSectors.slice(0, 3);
  const laggingSectors = sortedSectors.slice(-3).reverse();

  const totalStocks = stocks.length || 1;
  const totalAdvancers = krxAdvancers + usAdvancers;
  const advanceRatio = Math.round((totalAdvancers / totalStocks) * 100);

  let marketSentiment = '중립 (혼조세)';
  let sentimentColor = '#fbbf24';
  let sentimentDesc = '상승 종목과 하락 종목이 팽팽하게 맞서며 섹터별 개별 장세가 이어지고 있습니다.';

  if (advanceRatio >= 60) {
    marketSentiment = '강세 (매수 우위 장세)';
    sentimentColor = 'var(--color-up)';
    sentimentDesc = '시장의 전반적인 투자 심리가 개선되며 대다수 업종으로 매수세가 확산되고 있습니다.';
  } else if (advanceRatio <= 40) {
    marketSentiment = '약세 (관망 및 조정 장세)';
    sentimentColor = 'var(--color-down)';
    sentimentDesc = '차익 실현 매물 및 거시경제 불확실성으로 인해 시장 전반이 보수적인 흐름을 보이고 있습니다.';
  }

  // --- 뉴스 필터링 ---
  const filteredNews = news.filter(n => {
    if (filterType === 'NEWS') return !n.isDisclosure;
    if (filterType === 'DISCLOSURE') return n.isDisclosure;
    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, news.length]);

  const totalPages = Math.max(1, Math.ceil(filteredNews.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedNews = filteredNews.slice(startIndex, startIndex + pageSize);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ========================================================= */}
      {/* 1. 상단 상세 시장 요약 & 매크로 브리핑 섹션 */}
      {/* ========================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 주요 지수 퀵 티커 바 */}
        {indices.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '10px'
          }}>
            {indices.map(idx => {
              const isUp = idx.changeRate >= 0;
              return (
                <div
                  key={idx.code}
                  className="glass-card"
                  style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{idx.name}</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                      {idx.value.toLocaleString()}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: isUp ? 'var(--color-up)' : 'var(--color-down)',
                    textAlign: 'right'
                  }}>
                    {isUp ? `+${idx.changeRate.toFixed(2)}%` : `${idx.changeRate.toFixed(2)}%`}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 시장 종합 센티먼트 바 */}
        <div className="glass-card" style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>글로벌 시장 종합 시황 브리핑</h2>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(99, 102, 241, 0.2)',
                color: sentimentColor,
                border: `1px solid ${sentimentColor}`
              }}>
                {marketSentiment}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              {sentimentDesc}
            </p>
          </div>

          {/* Global Breadth Stats */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ padding: '8px 14px', background: 'var(--bg-input)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>국내 등락 분포 (KRX)</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '2px' }}>
                <span style={{ color: 'var(--color-up)' }}>상승 {krxAdvancers}</span> / <span style={{ color: 'var(--color-down)' }}>하락 {krxDecliners}</span> / <span>보합 {krxUnchanged}</span>
              </div>
            </div>

            <div style={{ padding: '8px 14px', background: 'var(--bg-input)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>미국 등락 분포 (US)</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '2px' }}>
                <span style={{ color: 'var(--color-up)' }}>상승 {usAdvancers}</span> / <span style={{ color: 'var(--color-down)' }}>하락 {usDecliners}</span> / <span>보합 {usUnchanged}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Card Grid: 밸류에이션 및 주도 섹터 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {/* 한국 시장 밸류에이션 */}
          <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#60a5fa' }}>한국 시장 (KRX) 밸류에이션</h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{krxStocks.length}개 표본</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              <div style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>중앙값 PER</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-up)', marginTop: '2px' }}>
                  {quantMetrics?.krxMetrics.medianPer.toFixed(1) || '24.9'}x
                </div>
              </div>
              <div style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>중앙값 PBR</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                  {quantMetrics?.krxMetrics.medianPbr.toFixed(2) || '1.99'}x
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              💡 <strong style={{ color: '#fff' }}>진단:</strong> 저PBR 자산주 중심의 밸류업 프로그램 수혜와 반도체 실적 개선이 지수 하방을 견고하게 지지하고 있습니다.
            </p>
          </div>

          {/* 미국 시장 밸류에이션 */}
          <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#c084fc' }}>미국 시장 (US) 밸류에이션</h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{usStocks.length}개 표본</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              <div style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>중앙값 PER</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#818cf8', marginTop: '2px' }}>
                  {quantMetrics?.usMetrics.medianPer.toFixed(1) || '26.9'}x
                </div>
              </div>
              <div style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>평균 ROE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                  {quantMetrics?.usMetrics.avgRoe.toFixed(1) || '42.5'}%
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              💡 <strong style={{ color: '#fff' }}>진단:</strong> 빅테크 기업들의 강력한 AI 인프라 투자와 높은 자기자본수익률(ROE)로 인해 글로벌 프리미엄 밸류에이션이 정당화되는 국면입니다.
            </p>
          </div>

          {/* 주도 섹터 vs 약세 섹터 */}
          <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700 }}>오늘의 주도 섹터 & 약세 섹터</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-up)', fontWeight: 700 }}>상승 주도 섹터: </span>
                <span style={{ fontSize: '0.78rem', color: '#fff' }}>
                  {leadingSectors.map(s => `${s.name} (+${s.changeRate.toFixed(2)}%)`).join(', ')}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-down)', fontWeight: 700 }}>하락 조정 섹터: </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {laggingSectors.map(s => `${s.name} (${s.changeRate.toFixed(2)}%)`).join(', ')}
                </span>
              </div>
            </div>
            <div style={{ marginTop: 'auto', paddingTop: '6px', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              포트폴리오 비중: 저평가 가치주 50% + AI/성장주 50% 분산 권장
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. 실시간 뉴스 & DART 공시 큐레이션 피드 */}
      {/* ========================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Header & Filter */}
        <div className="glass-card" style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '2px' }}>실시간 뉴스 & DART 공시 피드</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              국내외 증시 주요 속보 및 DART 전자공시 큐레이션 (총 {filteredNews.length}건)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setFilterType('ALL')}
              className={`btn ${filterType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              전체 피드
            </button>
            <button
              onClick={() => setFilterType('NEWS')}
              className={`btn ${filterType === 'NEWS' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              <Newspaper size={14} /> 뉴스만
            </button>
            <button
              onClick={() => setFilterType('DISCLOSURE')}
              className={`btn ${filterType === 'DISCLOSURE' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              <FileText size={14} /> DART 공시만
            </button>
          </div>
        </div>

        {/* News Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '16px'
        }}>
          {paginatedNews.map(item => {
            return (
              <div
                key={item.id}
                className="glass-card"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`badge ${item.isDisclosure ? 'badge-warning' : 'badge-tag'}`}>
                        {item.isDisclosure ? 'DART 전자공시' : item.source}
                      </span>
                      {item.companyName && (
                        <span
                          onClick={() => item.symbol && onSelectStock(item.symbol)}
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: 'var(--color-brand)',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          {item.companyName}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.date}</span>
                  </div>

                  <h4 style={{ fontSize: '0.98rem', marginBottom: '8px', lineHeight: 1.45 }}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#fff', textDecoration: 'none' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-brand)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#fff'}
                    >
                      {item.title}
                    </a>
                  </h4>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {item.summary}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    color: item.sentiment === 'positive' ? 'var(--color-up)' : item.sentiment === 'negative' ? 'var(--color-down)' : 'var(--text-muted)',
                    fontWeight: 600
                  }}>
                    {item.sentiment === 'positive' ? '긍정적 시그널' : item.sentiment === 'negative' ? '부정적/주의' : '중립'}
                  </span>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-brand)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    원문 보기 <ArrowRight size={12} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            marginTop: '12px'
          }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={validCurrentPage === 1}
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: '0.8rem', opacity: validCurrentPage === 1 ? 0.4 : 1 }}
            >
              <ChevronLeft size={16} /> 이전
            </button>

            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--color-brand)' }}>{validCurrentPage}</strong> / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={validCurrentPage === totalPages}
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: '0.8rem', opacity: validCurrentPage === totalPages ? 0.4 : 1 }}
            >
              다음 <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
