import React, { useState, useEffect } from 'react';
import type { NewsItem, MarketIndex, SectorPerf, Stock, QuantMetrics } from '../../types/stock';
import { Newspaper, FileText, ExternalLink, ChevronLeft, ChevronRight, Sparkles, TrendingUp, TrendingDown, Flame } from 'lucide-react';

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
  onSelectStock
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'IMPORTANT' | 'NEWS' | 'DISCLOSURE'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 9; // 한 페이지에 9개씩 넉넉하게 표출

  // --- 국내 및 미국 데이터 분리 ---
  const krxStocks = stocks.filter(s => s.market === 'KRX' || s.currency === 'KRW');
  const usStocks = stocks.filter(s => s.market === 'US' || s.currency === 'USD');

  // 국내 지수 vs 미국 지수
  const krxIndices = indices.filter(i => i.code.includes('KS') || i.code.includes('KQ') || i.name.includes('코스피') || i.name.includes('코스닥'));
  const usIndices = indices.filter(i => !i.code.includes('KS') && !i.code.includes('KQ') && !i.name.includes('코스피') && !i.name.includes('코스닥'));

  // 국내 등락 분포
  const krxAdvancers = krxStocks.filter(s => s.changeRate > 0).length;
  const krxDecliners = krxStocks.filter(s => s.changeRate < 0).length;
  const krxUnchanged = krxStocks.filter(s => s.changeRate === 0).length;

  // 미국 등락 분포
  const usAdvancers = usStocks.filter(s => s.changeRate > 0).length;
  const usDecliners = usStocks.filter(s => s.changeRate < 0).length;
  const usUnchanged = usStocks.filter(s => s.changeRate === 0).length;

  // 섹터 정렬 (주도 vs 약세)
  const sortedSectors = [...sectors].sort((a, b) => b.changeRate - a.changeRate);
  const leadingSectors = sortedSectors.slice(0, 3);
  const laggingSectors = sortedSectors.slice(-3).reverse();

  // --- 뉴스 필터링 및 중요도 우선 정렬 ---
  const filteredNews = news.filter(n => {
    if (filterType === 'IMPORTANT') return (n.importance || 3) >= 4;
    if (filterType === 'NEWS') return !n.isDisclosure;
    if (filterType === 'DISCLOSURE') return n.isDisclosure;
    return true;
  }).sort((a, b) => {
    // 중요도(5점->1점) 높은 순 우선, 그 후 최신 날짜 순
    const impA = a.importance || 3;
    const impB = b.importance || 3;
    if (impB !== impA) return impB - impA;
    return (b.date || '').localeCompare(a.date || '');
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
      {/* 1. 글로벌 시황 종합 브리핑 (국내 증시 & 글로벌 시장 2-Column 심층 분석) */}
      {/* ========================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 상단 통합 타이틀 헤더 */}
        <div className="glass-card" style={{
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.35)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'rgba(99, 102, 241, 0.25)',
              padding: '8px',
              borderRadius: '8px',
              color: 'var(--color-brand)'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>글로벌 시황 종합 브리핑</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
                국내(KRX) 및 글로벌/미국(US) 시장의 수급, 주도 섹터, 거시경제 매크로 환경을 정밀하게 분석합니다.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>실시간 퀀트 시황 엔진 가동 중</span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          </div>
        </div>

        {/* 2-Column: 국내 증시(KRX) 브리핑 vs 글로벌/미국 증시(US) 브리핑 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '16px'
        }}>
          {/* 🇰🇷 1. 국내 시장 (KRX) 심층 시황 브리핑 */}
          <div className="glass-card" style={{
            padding: '22px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            border: '1px solid rgba(96, 165, 250, 0.3)',
            background: 'linear-gradient(180deg, rgba(30, 58, 138, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)'
          }}>
            {/* 국내 헤더 & 지수 티커 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.15rem' }}>🇰🇷</span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#93c5fd' }}>국내 증시 (KRX) 시황 브리핑</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {krxIndices.map(idx => (
                  <span key={idx.code} style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(96, 165, 250, 0.15)',
                    color: idx.changeRate >= 0 ? 'var(--color-up)' : 'var(--color-down)',
                    border: '1px solid rgba(96, 165, 250, 0.25)'
                  }}>
                    {idx.name} {idx.value.toLocaleString()} ({idx.changeRate >= 0 ? `+${idx.changeRate.toFixed(2)}%` : `${idx.changeRate.toFixed(2)}%`})
                  </span>
                ))}
              </div>
            </div>

            {/* 국내 등락 종목 분포 */}
            <div style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '6px', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>국내 종목 등락 분포:</span>
              <span style={{ fontWeight: 700 }}>
                <span style={{ color: 'var(--color-up)' }}>상승 {krxAdvancers}종목</span> · <span style={{ color: 'var(--color-down)' }}>하락 {krxDecliners}종목</span> · <span style={{ color: 'var(--text-muted)' }}>보합 {krxUnchanged}종목</span>
              </span>
            </div>

            {/* 국내 시황 심층 리포트 */}
            <p style={{ fontSize: '0.84rem', color: '#e2e8f0', lineHeight: 1.6 }}>
              • <strong>수급 및 지수 동향:</strong> 외국인 투자자의 반도체 대형주 중심 순매수세가 지속되며 코스피 하방을 든든하게 지지하고 있습니다. 환율 변동성 속에서도 기업 밸류업 프로그램 및 주주환원(자사주 소각/배당 확대) 모멘텀이 금융, 지주, 자동차 섹터로 확산되는 모습입니다.<br />
              • <strong>투자 전략:</strong> 실적이 뒷받침되는 저PBR 우량주와 HBM 및 AI 반도체 밸류체인 소부장 핵심 종목에 대한 분할 접근이 유리합니다.
            </p>

            {/* 국내 통합 주도 / 약세 섹터 요약 */}
            <div style={{
              padding: '12px 14px',
              background: 'rgba(15, 23, 42, 0.75)',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                <TrendingUp size={14} color="var(--color-up)" />
                <span style={{ fontWeight: 700, color: 'var(--color-up)' }}>국내 주도 강세 섹터:</span>
                <span style={{ color: '#fff' }}>
                  {leadingSectors.map(s => `${s.name} (+${s.changeRate.toFixed(2)}%)`).join(', ')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                <TrendingDown size={14} color="var(--color-down)" />
                <span style={{ fontWeight: 700, color: 'var(--color-down)' }}>국내 하락 조정 섹터:</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {laggingSectors.map(s => `${s.name} (${s.changeRate.toFixed(2)}%)`).join(', ')}
                </span>
              </div>
            </div>
          </div>

          {/* 🇺🇸 2. 글로벌 / 미국 시장 (US) 심층 시황 브리핑 */}
          <div className="glass-card" style={{
            padding: '22px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            border: '1px solid rgba(192, 132, 252, 0.3)',
            background: 'linear-gradient(180deg, rgba(88, 28, 135, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)'
          }}>
            {/* 글로벌 헤더 & 지수 티커 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.15rem' }}>🇺🇸</span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#d8b4fe' }}>글로벌 / 미국 증시 (US) 시황 브리핑</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {usIndices.slice(0, 3).map(idx => (
                  <span key={idx.code} style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(192, 132, 252, 0.15)',
                    color: idx.changeRate >= 0 ? 'var(--color-up)' : 'var(--color-down)',
                    border: '1px solid rgba(192, 132, 252, 0.25)'
                  }}>
                    {idx.name} {idx.value.toLocaleString()} ({idx.changeRate >= 0 ? `+${idx.changeRate.toFixed(2)}%` : `${idx.changeRate.toFixed(2)}%`})
                  </span>
                ))}
              </div>
            </div>

            {/* 미국 등락 종목 분포 */}
            <div style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '6px', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>미국 종목 등락 분포:</span>
              <span style={{ fontWeight: 700 }}>
                <span style={{ color: 'var(--color-up)' }}>상승 {usAdvancers}종목</span> · <span style={{ color: 'var(--color-down)' }}>하락 {usDecliners}종목</span> · <span style={{ color: 'var(--text-muted)' }}>보합 {usUnchanged}종목</span>
              </span>
            </div>

            {/* 미국 시황 심층 리포트 */}
            <p style={{ fontSize: '0.84rem', color: '#e2e8f0', lineHeight: 1.6 }}>
              • <strong>매크로 및 빅테크 모멘텀:</strong> 미 연준의 금리 인하 경로에 대한 기대감과 함께 엔비디아, 마이크로소프트, 애플 등 M7 빅테크의 AI 인프라 매출 가시화가 나스닥과 S&P 500 상승을 주도하고 있습니다.<br />
              • <strong>투자 전략:</strong> 고금리 부담을 자체 현금흐름으로 흡수할 수 있는 글로벌 빅테크 기업과 현금 배당을 꾸준히 늘려가는 미국 고배당성장주(SCHD 등)를 포트폴리오 코어(Core)로 유지하는 전략을 권장합니다.
            </p>

            {/* 글로벌 통합 주도 / 약세 섹터 요약 */}
            <div style={{
              padding: '12px 14px',
              background: 'rgba(15, 23, 42, 0.75)',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                <TrendingUp size={14} color="#a855f7" />
                <span style={{ fontWeight: 700, color: '#c084fc' }}>글로벌 주도 강세 섹터:</span>
                <span style={{ color: '#fff' }}>
                  인공지능(AI), 고성능 반도체(Semiconductors), 클라우드 컴퓨팅
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                <TrendingDown size={14} color="var(--color-down)" />
                <span style={{ fontWeight: 700, color: 'var(--color-down)' }}>글로벌 관망 및 조정 섹터:</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  전통 유틸리티, 상업용 부동산 리츠, 고부채 중소형주
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. 실시간 뉴스 & DART 공시 큐레이션 피드 (중요도 정렬 & 출처 링크) */}
      {/* ========================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Header & Filter Controls */}
        <div className="glass-card" style={{
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>실시간 뉴스 & DART 주요 공시</h3>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--color-brand)', fontWeight: 700 }}>
                총 {filteredNews.length}건
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              중요도(Impact Score)가 높은 핵심 속보 및 실적/계약 DART 공시를 우선 노출합니다.
            </p>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterType('ALL')}
              className={`btn ${filterType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              전체 피드
            </button>
            <button
              onClick={() => setFilterType('IMPORTANT')}
              className={`btn ${filterType === 'IMPORTANT' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Flame size={14} color="#f59e0b" /> 중요 뉴스&공시만
            </button>
            <button
              onClick={() => setFilterType('NEWS')}
              className={`btn ${filterType === 'NEWS' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Newspaper size={14} /> 뉴스만
            </button>
            <button
              onClick={() => setFilterType('DISCLOSURE')}
              className={`btn ${filterType === 'DISCLOSURE' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <FileText size={14} /> DART 공시만
            </button>
          </div>
        </div>

        {/* News Grid (3-Column Layout) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '16px'
        }}>
          {paginatedNews.map(item => {
            const isHighImportance = (item.importance || 3) >= 5;
            const isMediumImportance = (item.importance || 3) === 4;

            return (
              <div
                key={item.id}
                className="glass-card"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  border: isHighImportance ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                  background: isHighImportance ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(15, 23, 42, 0.7) 100%)' : undefined
                }}
              >
                <div>
                  {/* Top Badges & Source */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {/* 출처 링크 뱃지 */}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: item.isDisclosure ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          color: item.isDisclosure ? '#fca5a5' : '#a5b4fc',
                          border: item.isDisclosure ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                        title={`출처: ${item.source} (클릭 시 원문 링크 이동)`}
                      >
                        {item.isDisclosure ? '📄 ' : '📰 '}출처: {item.source}
                        <ExternalLink size={10} />
                      </a>

                      {/* 중요도 배지 */}
                      {isHighImportance && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid #f59e0b' }}>
                          ⭐️ 핵심 주요
                        </span>
                      )}
                      {isMediumImportance && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                          🔥 주요
                        </span>
                      )}

                      {/* 관련 종목 바로가기 */}
                      {item.companyName && (
                        <span
                          onClick={() => item.symbol && onSelectStock(item.symbol)}
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#38bdf8',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                          title="해당 종목 상세 차트 분석으로 이동"
                        >
                          {item.companyName}
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{item.date}</span>
                  </div>

                  {/* 기사 / 공시 제목 */}
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '8px', lineHeight: 1.45 }}>
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

                  {/* 기사 / 공시 요약 */}
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {item.summary}
                  </p>
                </div>

                {/* Card Bottom: Sentiment & Link */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    color: item.sentiment === 'positive' ? 'var(--color-up)' : item.sentiment === 'negative' ? 'var(--color-down)' : 'var(--text-muted)',
                    fontWeight: 700
                  }}>
                    {item.sentiment === 'positive' ? '📈 긍정적 시그널' : item.sentiment === 'negative' ? '📉 부정적/주의' : '⚖️ 중립'}
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
                      color: 'var(--color-brand)',
                      textDecoration: 'none',
                      fontWeight: 600
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >
                    원문 링크 보기 <ExternalLink size={12} />
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
              style={{ padding: '6px 14px', fontSize: '0.8rem', opacity: validCurrentPage === 1 ? 0.4 : 1 }}
            >
              <ChevronLeft size={16} /> 이전 페이지
            </button>

            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--color-brand)' }}>{validCurrentPage}</strong> / {totalPages} 페이지 (총 {filteredNews.length}건)
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={validCurrentPage === totalPages}
              className="btn btn-ghost"
              style={{ padding: '6px 14px', fontSize: '0.8rem', opacity: validCurrentPage === totalPages ? 0.4 : 1 }}
            >
              다음 페이지 <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
