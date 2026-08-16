import React, { useState, useEffect, useMemo } from 'react';
import type { NewsItem, MarketIndex, SectorPerf, Stock, QuantMetrics } from '../../types/stock';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { deleteAllNews } from '../../api/stockApi';

type SortField = 'date' | 'title' | 'company' | 'type' | 'sentiment';
type SortOrder = 'asc' | 'desc';

interface NewsFeedProps {
  news: NewsItem[];
  indices?: MarketIndex[];
  sectors?: SectorPerf[];
  stocks?: Stock[];
  quantMetrics?: QuantMetrics | null;
  onSelectStock: (symbol: string) => void;
  onNewsDeleted?: () => void;
  initialSearch?: string;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({
  news,
  indices = [],
  sectors = [],
  stocks = [],
  onSelectStock,
  onNewsDeleted,
  initialSearch = ''
}) => {
  // --- 필터 상태 (드롭다운 리스트 기반) ---
  const [filterType, setFilterType] = useState<'ALL' | 'NEWS' | 'DISCLOSURE' | 'IMPORTANT'>('ALL');
  const [selectedStock, setSelectedStock] = useState<string>('ALL');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  useEffect(() => {
    if (initialSearch) {
      setSelectedStock(initialSearch);
      setSearchKeyword(initialSearch);
      setCurrentPage(1);
    }
  }, [initialSearch]);

  // --- 정렬 상태 ---
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // --- 페이지네이션 ---
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const pageSize = 12; // 테이블 1페이지당 12개 행

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

  // --- 드롭다운 선택용 고유 옵션 목록 ---
  const stockOptions = useMemo(() => {
    const set = new Set<string>();
    news.forEach(n => {
      const name = n.companyName || n.symbol;
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [news]);

  const sourceOptions = useMemo(() => {
    const set = new Set<string>();
    news.forEach(n => {
      if (n.source) set.add(n.source);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [news]);

  // 문자열 HTML 엔티티 제거 헬퍼
  const sanitizeText = (str: string = '') => {
    return str
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/<[^>]*>?/gm, '')
      .trim();
  };

  // --- 정렬 핸들러 ---
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // --- 필터 초기화 ---
  const handleResetFilters = () => {
    setFilterType('ALL');
    setSelectedStock('ALL');
    setSelectedSentiment('ALL');
    setSelectedSource('ALL');
    setSearchKeyword('');
    setSortField('date');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // --- 뉴스 필터링 및 다중 정렬 적용 ---
  const filteredAndSortedNews = useMemo(() => {
    const filtered = news.filter(n => {
      // 1. 구분 필터
      if (filterType === 'IMPORTANT' && (n.importance || 3) < 4) return false;
      if (filterType === 'NEWS' && n.isDisclosure) return false;
      if (filterType === 'DISCLOSURE' && !n.isDisclosure) return false;

      // 2. 종목 필터
      if (selectedStock !== 'ALL') {
        const name = n.companyName || n.symbol;
        if (name !== selectedStock) return false;
      }

      // 3. 시그널 필터
      if (selectedSentiment !== 'ALL' && n.sentiment !== selectedSentiment) {
        return false;
      }

      // 4. 출처 필터
      if (selectedSource !== 'ALL' && n.source !== selectedSource) {
        return false;
      }

      // 5. 키워드 검색
      if (searchKeyword.trim() !== '') {
        const query = searchKeyword.toLowerCase();
        const titleMatch = (n.title || '').toLowerCase().includes(query);
        const summaryMatch = (n.summary || '').toLowerCase().includes(query);
        const nameMatch = (n.companyName || n.symbol || '').toLowerCase().includes(query);
        if (!titleMatch && !summaryMatch && !nameMatch) return false;
      }

      return true;
    });

    // 정렬 로직
    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = (a.date || '').localeCompare(b.date || '');
      } else if (sortField === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '');
      } else if (sortField === 'company') {
        const nameA = a.companyName || a.symbol || '';
        const nameB = b.companyName || b.symbol || '';
        comparison = nameA.localeCompare(nameB);
      } else if (sortField === 'type') {
        comparison = (a.isDisclosure ? 1 : 0) - (b.isDisclosure ? 1 : 0);
      } else if (sortField === 'sentiment') {
        comparison = (a.sentiment || '').localeCompare(b.sentiment || '');
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [news, filterType, selectedStock, selectedSentiment, selectedSource, searchKeyword, sortField, sortOrder]);

  const handleDeleteAllNews = async () => {
    if (news.length === 0) return;
    if (!window.confirm('저장된 모든 뉴스 및 DART 공시 데이터를 데이터베이스에서 완전히 삭제하시겠습니까?')) {
      return;
    }
    setIsDeleting(true);
    try {
      const ok = await deleteAllNews();
      if (ok) {
        if (onNewsDeleted) onNewsDeleted();
      } else {
        alert('기사 삭제에 실패했습니다.');
      }
    } catch (e) {
      console.error(e);
      alert('기사 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, selectedStock, selectedSentiment, selectedSource, searchKeyword, sortField, sortOrder, news.length]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedNews.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedNews = filteredAndSortedNews.slice(startIndex, startIndex + pageSize);

  // 정렬 화살표 렌더러
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <span style={{ opacity: 0.3, marginLeft: '4px', fontSize: '0.7rem' }}>↕</span>;
    }
    return (
      <span style={{ color: 'var(--color-brand)', marginLeft: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
        {sortOrder === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ========================================================= */}
      {/* 1. 글로벌 시황 종합 브리핑 (국내 증시 & 글로벌 시장 심층 분석) */}
      {/* ========================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 상단 헤더 */}
        <div style={{
          padding: '4px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>글로벌 시황 종합 브리핑</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
              국내(KRX) 및 글로벌/미국(US) 시장의 수급, 주도 섹터, 거시경제 매크로 환경을 심층 분석합니다.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>실시간 데이터 기반 동기화</span>
          </div>
        </div>

        {/* 2-Column: 국내 증시(KRX) 브리핑 vs 글로벌/미국 증시(US) 브리핑 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '16px'
        }}>
          {/* 1. 국내 시장 (KRX) 심층 시황 브리핑 */}
          <div className="glass-card" style={{
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* 국내 헤더 & 지수 티커 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#93c5fd' }}>국내 증시 (KRX) 시황 브리핑</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {krxIndices.map(idx => (
                  <span key={idx.code} style={{
                    fontSize: '0.75rem',
                    color: idx.changeRate >= 0 ? 'var(--color-up)' : 'var(--color-down)',
                    fontWeight: 600
                  }}>
                    {idx.name} {idx.changeRate >= 0 ? '+' : ''}{idx.changeRate}%
                  </span>
                ))}
              </div>
            </div>

            {/* 국내 시장 등락 비율 바 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
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

            {/* 국내 핵심 시황 분석 텍스트 */}
            <div style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.6 }}>
              {krxAdvancers >= krxDecliners ? (
                <p>
                  코스피와 코스닥 지수가 우상향 흐름을 주도하며 시장 참여자들의 위험자산 선호 심리가 강화되고 있습니다. 주도 섹터를 중심으로 외국인 및 기관의 수급 유입이 뚜렷합니다.
                </p>
              ) : (
                <p>
                  대외 변수 및 환율 변동성으로 인해 일부 차익 실현 매물이 출회되고 있습니다. 펀더멘털이 견고한 저PBR 가치주와 실적 개선주 중심의 선별적 방어 전략이 유리합니다.
                </p>
              )}
            </div>

            {/* 국내 주도 섹터 태그 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>주도 섹터:</span>
              {leadingSectors.map(s => (
                <span key={s.name} style={{ color: 'var(--color-up)', fontWeight: 600 }}>
                  {s.name} (+{s.changeRate.toFixed(1)}%)
                </span>
              ))}
            </div>
          </div>

          {/* 2. 글로벌/미국 시장 (US) 심층 시황 브리핑 */}
          <div className="glass-card" style={{
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* 미국 헤더 & 지수 티커 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#d8b4fe' }}>글로벌·미국 증시 (US) 브리핑</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {usIndices.map(idx => (
                  <span key={idx.code} style={{
                    fontSize: '0.75rem',
                    color: idx.changeRate >= 0 ? 'var(--color-up)' : 'var(--color-down)',
                    fontWeight: 600
                  }}>
                    {idx.name} {idx.changeRate >= 0 ? '+' : ''}{idx.changeRate}%
                  </span>
                ))}
              </div>
            </div>

            {/* 미국 시장 등락 비율 바 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
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

            {/* 미국 핵심 시황 분석 텍스트 */}
            <div style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.6 }}>
              <p>
                S&P500과 나스닥은 AI 인프라 투자 지속성 및 연준(Fed) 금리 정책 전망에 민감하게 반응하고 있습니다. M7 기술주 중심의 이익 성장세가 글로벌 시장 전반의 모멘텀을 지지하고 있습니다.
              </p>
            </div>

            {/* 미국 약세 섹터 태그 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>하락 섹터:</span>
              {laggingSectors.map(s => (
                <span key={s.name} style={{ color: 'var(--color-down)', fontWeight: 600 }}>
                  {s.name} ({s.changeRate.toFixed(1)}%)
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. 실시간 뉴스 & DART 큐레이션 테이블 피드 */}
      {/* ========================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* 상단 타이틀 및 일괄 삭제 */}
        <div style={{
          padding: '4px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>실시간 뉴스 & DART 주요 공시</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              검색결과 {filteredAndSortedNews.length}건 (전체 {news.length}건)
            </span>

            {/* 모든 기사 삭제 버튼 */}
            <button
              onClick={handleDeleteAllNews}
              disabled={isDeleting || news.length === 0}
              className="btn btn-ghost"
              style={{
                fontSize: '0.75rem',
                padding: '3px 8px',
                color: '#f87171',
                cursor: news.length === 0 ? 'not-allowed' : 'pointer',
                opacity: news.length === 0 ? 0.4 : 1,
                fontWeight: 500
              }}
              title="데이터베이스에 저장된 모든 기사 및 공시 삭제"
            >
              {isDeleting ? '삭제 중...' : '모든 기사 삭제'}
            </button>
          </div>
        </div>

        {/* --- 필터 바 (드롭다운 리스트 및 검색창) --- */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          padding: '10px 14px',
          background: 'rgba(15, 23, 42, 0.45)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.8rem'
        }}>
          {/* 1. 구분 버튼 그룹 */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              onClick={() => setFilterType('NEWS')}
              className={`btn ${filterType === 'NEWS' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.76rem', padding: '4px 10px', fontWeight: 600, height: '30px' }}
            >
              최신 뉴스
            </button>
            <button
              onClick={() => setFilterType('DISCLOSURE')}
              className={`btn ${filterType === 'DISCLOSURE' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.76rem', padding: '4px 10px', fontWeight: 600, height: '30px' }}
            >
              DART 공시
            </button>
            <button
              onClick={() => setFilterType('IMPORTANT')}
              className={`btn ${filterType === 'IMPORTANT' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.76rem', padding: '4px 10px', fontWeight: 600, height: '30px' }}
            >
              중요 기사
            </button>
            <button
              onClick={() => setFilterType('ALL')}
              className={`btn ${filterType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.76rem', padding: '4px 10px', fontWeight: 600, height: '30px' }}
            >
              전체
            </button>
          </div>

          {/* 2. 종목 드롭다운 리스트 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>종목:</span>
            <select
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              className="input"
              style={{
                padding: '4px 8px',
                fontSize: '0.78rem',
                height: '30px',
                maxWidth: '140px',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px'
              }}
            >
              <option value="ALL">전체 종목 ({stockOptions.length})</option>
              {stockOptions.map(stk => (
                <option key={stk} value={stk}>{stk}</option>
              ))}
            </select>
          </div>

          {/* 3. 시그널 드롭다운 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>시그널:</span>
            <select
              value={selectedSentiment}
              onChange={(e) => setSelectedSentiment(e.target.value)}
              className="input"
              style={{
                padding: '4px 8px',
                fontSize: '0.78rem',
                height: '30px',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px'
              }}
            >
              <option value="ALL">전체 시그널</option>
              <option value="positive">긍정 시그널</option>
              <option value="neutral">중립</option>
              <option value="negative">부정/주의</option>
            </select>
          </div>

          {/* 4. 출처 드롭다운 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>출처:</span>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="input"
              style={{
                padding: '4px 8px',
                fontSize: '0.78rem',
                height: '30px',
                maxWidth: '130px',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px'
              }}
            >
              <option value="ALL">전체 출처 ({sourceOptions.length})</option>
              {sourceOptions.map(src => (
                <option key={src} value={src}>{src}</option>
              ))}
            </select>
          </div>

          {/* 5. 키워드 검색 인풋 */}
          <div style={{ flex: 1, minWidth: '160px' }}>
            <input
              type="text"
              placeholder="제목, 요약, 종목명 검색..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="input"
              style={{
                width: '100%',
                padding: '4px 10px',
                fontSize: '0.78rem',
                height: '30px',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px'
              }}
            />
          </div>

          {/* 필터 초기화 버튼 */}
          <button
            onClick={handleResetFilters}
            className="btn btn-ghost"
            style={{
              padding: '4px 8px',
              fontSize: '0.75rem',
              height: '30px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="모든 필터 및 정렬 초기화"
          >
            <RotateCcw size={12} />
            초기화
          </button>
        </div>

        {/* --- 1줄 1기사 테이블 (오름차순/내림차순 컬럼 클릭 지원) --- */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                {/* 구분 정렬 */}
                <th
                  onClick={() => handleSort('type')}
                  style={{
                    padding: '10px 12px',
                    width: '70px',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  title="구분 기준 정렬"
                >
                  구분 {renderSortIndicator('type')}
                </th>

                {/* 종목 정렬 */}
                <th
                  onClick={() => handleSort('company')}
                  style={{
                    padding: '10px 12px',
                    width: '140px',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  title="종목명 가나다순 정렬"
                >
                  종목 {renderSortIndicator('company')}
                </th>

                {/* 제목 정렬 */}
                <th
                  onClick={() => handleSort('title')}
                  style={{
                    padding: '10px 12px',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  title="제목 가나다순 정렬"
                >
                  제목 및 요약 {renderSortIndicator('title')}
                </th>

                {/* 시그널 정렬 */}
                <th
                  onClick={() => handleSort('sentiment')}
                  style={{
                    padding: '10px 12px',
                    width: '80px',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  title="투자 시그널 기준 정렬"
                >
                  시그널 {renderSortIndicator('sentiment')}
                </th>

                {/* 작성 일시 정렬 */}
                <th
                  onClick={() => handleSort('date')}
                  style={{
                    padding: '10px 12px',
                    width: '130px',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  title="작성일시 기준 최신순/오래된순 정렬"
                >
                  작성 일시 {renderSortIndicator('date')}
                </th>

                {/* 출처 */}
                <th style={{ padding: '10px 12px', width: '100px', fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                  출처
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedNews.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    조건에 일치하는 뉴스 및 공시 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedNews.map((item, idx) => {
                  const cleanTitle = sanitizeText(item.title);
                  const cleanSummary = sanitizeText(item.summary);
                  const isPositive = item.sentiment === 'positive';
                  const isNegative = item.sentiment === 'negative';

                  return (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* 1. 구분 */}
                      <td style={{ padding: '12px', verticalAlign: 'middle', fontSize: '0.76rem', color: item.isDisclosure ? '#93c5fd' : 'var(--text-secondary)' }}>
                        {item.isDisclosure ? '공시' : '뉴스'}
                      </td>

                      {/* 2. 관련 종목 */}
                      <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                        <span
                          onClick={() => item.symbol && onSelectStock(item.symbol)}
                          style={{
                            fontSize: '0.84rem',
                            fontWeight: 600,
                            color: 'var(--color-brand)',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                          title="상세 차트 분석으로 이동"
                        >
                          {item.companyName || item.symbol}
                        </span>
                      </td>

                      {/* 3. 기사 제목 (원문 링크) 및 1줄 요약 / 투자 고려사항 */}
                      <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: '#fff',
                              textDecoration: 'none',
                              fontSize: '0.88rem',
                              fontWeight: 600,
                              lineHeight: 1.4,
                              transition: 'color 0.15s ease'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-brand)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#fff')}
                          >
                            {cleanTitle}
                          </a>

                          {cleanSummary && cleanSummary !== '' && (
                            <div style={{
                              fontSize: '0.78rem',
                              color: 'var(--text-secondary)',
                              lineHeight: 1.45,
                              whiteSpace: 'pre-line'
                            }}>
                              {cleanSummary}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. 시그널 */}
                      <td style={{
                        padding: '12px',
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        color: isPositive ? 'var(--color-up)' : isNegative ? 'var(--color-down)' : 'var(--text-muted)',
                        whiteSpace: 'nowrap'
                      }}>
                        {isPositive ? '긍정' : isNegative ? '부정' : '중립'}
                      </td>

                      {/* 5. 작성 일시 */}
                      <td style={{ padding: '12px', verticalAlign: 'middle', fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {item.date}
                      </td>

                      {/* 6. 출처 */}
                      <td style={{ padding: '12px', verticalAlign: 'middle', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: 'var(--text-secondary)',
                            textDecoration: 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--color-brand)';
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-secondary)';
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          {item.source}
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            marginTop: '8px'
          }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={validCurrentPage === 1}
              className="btn btn-ghost"
              style={{ padding: '4px 10px', fontSize: '0.8rem', opacity: validCurrentPage === 1 ? 0.4 : 1 }}
            >
              <ChevronLeft size={15} /> 이전
            </button>

            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {validCurrentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={validCurrentPage === totalPages}
              className="btn btn-ghost"
              style={{ padding: '4px 10px', fontSize: '0.8rem', opacity: validCurrentPage === totalPages ? 0.4 : 1 }}
            >
              다음 <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
