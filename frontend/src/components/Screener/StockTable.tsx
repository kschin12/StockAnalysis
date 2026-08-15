import React, { useState, useEffect } from 'react';
import type { Stock } from '../../types/stock';
import { Star, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportStocksToCsv } from '../../utils/exportCsv';

interface StockTableProps {
  stocks: Stock[];
  watchlist: string[];
  activeCategory?: string;
  onToggleWatchlist: (symbol: string) => void;
  onSelectStock: (symbol: string) => void;
}

type SortField = 'name' | 'price' | 'changeRate' | 'volume' | 'marketCap' | 'per' | 'pbr' | 'roe' | 'dividendYield' | 'debtRatio';

export const BADGE_DETAILS: Record<string, { type: 'risk' | 'momentum'; title: string; desc: string; reason: string }> = {
  // --- 1. 위험 지표 감지 사유 ---
  '고부채(200%↑)': {
    type: 'risk',
    title: '고부채 리스크 (부채비율 200% 이상)',
    desc: '자기자본 대비 차입금 등 타인 자본 의존도가 높아 금리 인상기 이자 부담이 커집니다.',
    reason: '부채비율이 200%를 초과하여 재무 레버리지 축소 및 현금흐름 점검 필요'
  },
  '초고부채(300%↑)': {
    type: 'risk',
    title: '초고부채 위험 (부채비율 300% 초과)',
    desc: '부채비율이 300%를 초과하여 재무적 위험 수위가 매우 높은 위험 상태입니다.',
    reason: '유동성 위기 및 자금 조달 차질 시 큰 타격을 받을 수 있어 극도의 주의 필요'
  },
  '가치함정 의심': {
    type: 'risk',
    title: '가치함정(Value Trap) 의심',
    desc: 'PBR 0.5배 미만으로 저평가되어 보이나, ROE가 3% 이하로 극히 낮아 만성 저수익 상태입니다.',
    reason: '구조적인 업황 부진이나 수익성 결여로 인해 주가가 장기 정체될 가능성 농후'
  },
  '실적적자': {
    type: 'risk',
    title: '실적 적자 (당기순손실 / 마이너스 ROE)',
    desc: '최근 결산 또는 분기 실적이 적자 상태로 순이익을 내지 못하고 있습니다.',
    reason: '적자가 장기화될 경우 자본 잠식 및 밸류에이션 훼손 위험 존재'
  },
  '이자보상 1 미만': {
    type: 'risk',
    title: '이자보상배율 1.0 미만 (한계기업)',
    desc: '영업이익으로 금융 이자 비용조차 갚지 못하는 상태입니다.',
    reason: '영업활동 현금창출 능력 부족으로 이자 상환 능력이 취약함'
  },
  '과열(RSI 75↑)': {
    type: 'risk',
    title: '단기 과열 (RSI 75 이상 과매수)',
    desc: '단기 주가 폭등으로 인해 보조지표가 극단적인 과열 구간에 진입했습니다.',
    reason: '단기 차익실현 매물 출회 및 급격한 가격 조정에 노출될 수 있음'
  },
  '유동비율 부족': {
    type: 'risk',
    title: '단기 유동비율 부족 (100% 미만)',
    desc: '1년 이내 만기 도래 부채 대비 현금화 가능한 유동자산이 부족합니다.',
    reason: '단기 채무 상환 압박 및 유동성 관리 필요'
  },

  // --- 2. 모멘텀 상위 지표 사유 ---
  '신고가 돌파(95%↑)': {
    type: 'momentum',
    title: '52주 신고가 돌파 임박 (95% 이상)',
    desc: '현재 주가가 52주 최고가 대비 95% 이상에 위치하여 역사적 고점 돌파를 시도 중입니다.',
    reason: '상단 매물대가 없어 강한 추세 추종 모멘텀이 발생하기 가장 좋은 기술적 구간'
  },
  '신고가 근접(90%↑)': {
    type: 'momentum',
    title: '52주 신고가 근접 (90% 이상)',
    desc: '최고가 대비 90% 이상 위치로 강력한 중기 상승 추세를 증명하고 있습니다.',
    reason: '시장 주도주에서 전형적으로 나타나는 강한 매수세 및 가격 탄력성 유지'
  },
  '추세강세(RSI 55~70)': {
    type: 'momentum',
    title: '골든 모멘텀 구간 (RSI 55~70)',
    desc: '과열(75↑)되지 않으면서도 탄력적인 상승 탄력이 지속되는 최적의 매수 강세 구간입니다.',
    reason: '건전한 우상향 추세가 진행 중이며 조정 시 지지력이 견고함'
  },
  '고수익 성장(ROE 15%↑)': {
    type: 'momentum',
    title: '고수익 성장 펀더멘털 (ROE 15% 이상)',
    desc: '자기자본이익률(ROE)이 15% 이상으로 기업의 탁월한 자본 창출력이 주가를 견인합니다.',
    reason: '워런 버핏의 복리 성장 모델에 부합하는 높은 자본 수익성과 실적 모멘텀'
  },
  '상승탄력(+3%↑)': {
    type: 'momentum',
    title: '단기 상승 탄력 (+3% 이상 급등)',
    desc: '당일 거래량이 동반되며 +3% 이상의 강한 가격 탄력이 발생했습니다.',
    reason: '단기 시장의 관심과 매수 수급이 집중되는 모멘텀 발생'
  }
};

export const StockTable: React.FC<StockTableProps> = ({
  stocks,
  watchlist,
  activeCategory,
  onToggleWatchlist,
  onSelectStock
}) => {
  const [sortField, setSortField] = useState<SortField>('marketCap');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [activeBadgeTooltip, setActiveBadgeTooltip] = useState<{
    name: string;
    type: 'risk' | 'momentum';
    title: string;
    desc: string;
    reason: string;
    x: number;
    y: number;
  } | null>(null);

  // 카테고리 탭 전환 시 정렬 기준 자동 동기화
  useEffect(() => {
    if (activeCategory === 'volume') {
      setSortField('volume');
      setSortAsc(false);
    } else if (activeCategory === 'rise') {
      setSortField('changeRate');
      setSortAsc(false);
    } else if (activeCategory === 'market_cap' || activeCategory === 'all') {
      setSortField('marketCap');
      setSortAsc(false);
    }
  }, [activeCategory]);

  // 종목 리스트나 필터 변경 시 1페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [stocks.length, activeCategory]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
    setCurrentPage(1);
  };

  const sortedStocks = [...stocks].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
  });

  const totalPages = Math.ceil(sortedStocks.length / pageSize) || 1;
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedStocks = sortedStocks.slice(startIndex, startIndex + pageSize);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const handleBadgeMouseEnter = (e: React.MouseEvent, badgeName: string, type: 'risk' | 'momentum') => {
    e.stopPropagation();
    const getDetail = (name: string) => {
      if (BADGE_DETAILS[name]) return BADGE_DETAILS[name];
      for (const [key, val] of Object.entries(BADGE_DETAILS)) {
        const prefix = key.split('(')[0];
        if (name.startsWith(prefix)) return val;
      }
      return {
        type,
        title: name,
        desc: type === 'risk' ? '재무 건전성 및 밸류에이션 리스크 요인' : '가격 탄력성 및 수급 모멘텀 신호',
        reason: type === 'risk' ? '퀀트 리스크 감지 기준에 의해 식별됨' : '퀀트 모멘텀 성장 기준에 의해 식별됨'
      };
    };
    const detail = getDetail(badgeName);
    const rect = e.currentTarget.getBoundingClientRect();

    let x = rect.right + 10;
    let y = rect.top - 10;

    if (x + 310 > window.innerWidth - 10) {
      x = rect.left - 315;
    }
    if (y + 140 > window.innerHeight - 10) {
      y = window.innerHeight - 145;
    }
    if (y < 10) y = 10;

    setActiveBadgeTooltip({
      name: badgeName,
      type,
      title: detail.title,
      desc: detail.desc,
      reason: detail.reason,
      x,
      y
    });
  };

  const handleBadgeMouseLeave = () => {
    setActiveBadgeTooltip(null);
  };

  return (
    <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Table Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            검색 결과: <strong style={{ color: 'var(--color-brand)' }}>{sortedStocks.length}</strong>개 종목
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Page Size Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>페이지당</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              <option value={10}>10개</option>
              <option value={20}>20개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
            </select>
          </div>

          <button
            onClick={() => exportStocksToCsv(sortedStocks)}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            CSV 다운로드
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px 8px', width: '38px', textAlign: 'center' }}>순위</th>
              <th style={{ padding: '12px 6px', width: '32px' }}>관심</th>
              <th onClick={() => handleSort('name')} style={{ padding: '12px 10px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  종목명 (코드) {renderSortIcon('name')}
                </div>
              </th>
              <th style={{ padding: '12px 8px' }}>시장</th>
              <th onClick={() => handleSort('price')} style={{ padding: '12px 10px', textAlign: 'right', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  현재가 {renderSortIcon('price')}
                </div>
              </th>
              <th onClick={() => handleSort('changeRate')} style={{ padding: '12px 10px', textAlign: 'right', cursor: 'pointer', color: sortField === 'changeRate' ? 'var(--color-brand)' : 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  등락률 {renderSortIcon('changeRate')}
                </div>
              </th>
              <th onClick={() => handleSort('volume')} style={{ padding: '12px 10px', textAlign: 'right', cursor: 'pointer', color: sortField === 'volume' ? 'var(--color-brand)' : 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  거래량 {renderSortIcon('volume')}
                </div>
              </th>
              <th onClick={() => handleSort('marketCap')} style={{ padding: '12px 10px', textAlign: 'right', cursor: 'pointer', color: sortField === 'marketCap' ? 'var(--color-brand)' : 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  시가총액 {renderSortIcon('marketCap')}
                </div>
              </th>
              <th onClick={() => handleSort('per')} style={{ padding: '12px 10px', textAlign: 'right', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  PER {renderSortIcon('per')}
                </div>
              </th>
              <th onClick={() => handleSort('pbr')} style={{ padding: '12px 10px', textAlign: 'right', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  PBR {renderSortIcon('pbr')}
                </div>
              </th>
              <th onClick={() => handleSort('roe')} style={{ padding: '12px 10px', textAlign: 'right', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  ROE {renderSortIcon('roe')}
                </div>
              </th>
              <th onClick={() => handleSort('dividendYield')} style={{ padding: '12px 10px', textAlign: 'right', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  배당률 {renderSortIcon('dividendYield')}
                </div>
              </th>
              <th style={{ padding: '12px 10px', textAlign: 'center' }}>위험 / 퀀트 신호</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStocks.length > 0 ? (
              paginatedStocks.map((stk, idx) => {
                const isWatch = watchlist.includes(stk.symbol);
                const isUp = stk.changeRate >= 0;
                const rankNum = startIndex + idx + 1;
                const hasWarnings = stk.warningBadges && stk.warningBadges.length > 0;
                const hasMomentum = stk.momentumBadges && stk.momentumBadges.length > 0;

                return (
                  <tr
                    key={stk.symbol}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    onClick={() => onSelectStock(stk.symbol)}
                  >
                    {/* Rank Number */}
                    <td style={{ padding: '12px 6px', textAlign: 'center' }}>
                      <span style={{
                        color: rankNum === 1 ? '#f59e0b' : rankNum === 2 ? '#94a3b8' : rankNum === 3 ? '#d97706' : 'var(--text-muted)',
                        fontWeight: rankNum <= 3 ? 800 : 500,
                        fontSize: '0.82rem'
                      }}>
                        {rankNum}
                      </span>
                    </td>

                    {/* Watchlist star */}
                    <td style={{ padding: '12px 6px' }} onClick={(e) => { e.stopPropagation(); onToggleWatchlist(stk.symbol); }}>
                      <Star
                        size={16}
                        color={isWatch ? '#f59e0b' : 'var(--text-muted)'}
                        fill={isWatch ? '#f59e0b' : 'none'}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    {/* Stock Name & Symbol */}
                    <td style={{ padding: '12px 10px' }}>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{stk.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {stk.symbol} · {stk.sector}
                      </div>
                    </td>

                    {/* Market Badge */}
                    <td style={{ padding: '12px 8px' }}>
                      <span className="badge" style={{
                        fontSize: '0.7rem',
                        background: stk.market === 'KRX' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                        color: stk.market === 'KRX' ? '#60a5fa' : '#c084fc',
                        border: `1px solid ${stk.market === 'KRX' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`
                      }}>
                        {stk.market}
                      </span>
                    </td>

                    {/* Price */}
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600 }}>
                      {stk.currency === 'KRW' ? `${stk.price.toLocaleString()}원` : `$${stk.price.toFixed(2)}`}
                    </td>

                    {/* Change Rate */}
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: isUp ? 'var(--color-up)' : 'var(--color-down)' }}>
                      {isUp ? `+${stk.changeRate.toFixed(2)}%` : `${stk.changeRate.toFixed(2)}%`}
                    </td>

                    {/* Volume */}
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {stk.volume ? stk.volume.toLocaleString() : '-'}
                    </td>

                    {/* Market Cap */}
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {stk.currency === 'KRW'
                        ? stk.marketCap >= 10000
                          ? `${(stk.marketCap / 10000).toFixed(1)}조`
                          : `${stk.marketCap.toLocaleString()}억`
                        : stk.marketCap >= 1000
                          ? `$${(stk.marketCap / 1000).toFixed(1)}B`
                          : `$${stk.marketCap.toLocaleString()}M`}
                    </td>

                    {/* PER */}
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      {stk.per ? `${stk.per.toFixed(1)}x` : '-'}
                    </td>

                    {/* PBR */}
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      {stk.pbr ? `${stk.pbr.toFixed(2)}x` : '-'}
                    </td>

                    {/* ROE */}
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: stk.roe && stk.roe >= 15 ? 700 : 400, color: stk.roe && stk.roe >= 15 ? 'var(--color-brand)' : 'inherit' }}>
                      {stk.roe ? `${stk.roe.toFixed(1)}%` : '-'}
                    </td>

                    {/* Dividend Yield */}
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      {stk.dividendYield ? `${stk.dividendYield.toFixed(2)}%` : '-'}
                    </td>

                    {/* Warning & Momentum Badges with Hover Tooltips */}
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {hasWarnings && stk.warningBadges!.map((b, idx) => (
                          <span
                            key={`w-${idx}`}
                            onMouseEnter={(e) => handleBadgeMouseEnter(e, b, 'risk')}
                            onMouseLeave={handleBadgeMouseLeave}
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '4px',
                              fontWeight: 600,
                              cursor: 'help'
                            }}
                          >
                            {b}
                          </span>
                        ))}

                        {hasMomentum && stk.momentumBadges!.map((m, idx) => (
                          <span
                            key={`m-${idx}`}
                            onMouseEnter={(e) => handleBadgeMouseEnter(e, m, 'momentum')}
                            onMouseLeave={handleBadgeMouseLeave}
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: '#a5b4fc',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              borderRadius: '4px',
                              fontWeight: 600,
                              cursor: 'help'
                            }}
                          >
                            {m}
                          </span>
                        ))}

                        {!hasWarnings && !hasMomentum && (
                          <span
                            style={{
                              color: '#10b981',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '2px 6px',
                              background: 'rgba(16, 185, 129, 0.1)',
                              borderRadius: '4px',
                              border: '1px solid rgba(16, 185, 129, 0.2)'
                            }}
                          >
                            위험 없음
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={13} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  조건에 일치하는 종목이 없습니다. 필터를 완화해 보세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            총 <strong style={{ color: '#fff' }}>{totalPages}</strong> 페이지 중 <strong style={{ color: 'var(--color-brand)' }}>{validCurrentPage}</strong> 페이지
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={validCurrentPage === 1}
              className="btn btn-ghost"
              style={{ padding: '6px 10px', fontSize: '0.8rem', opacity: validCurrentPage === 1 ? 0.4 : 1 }}
            >
              <ChevronLeft size={16} /> 이전
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = validCurrentPage - 2 + i;
              if (validCurrentPage <= 2) pageNum = i + 1;
              if (validCurrentPage >= totalPages - 1) pageNum = totalPages - 4 + i;
              if (pageNum < 1 || pageNum > totalPages) return null;

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`btn ${validCurrentPage === pageNum ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.8rem',
                    minWidth: '32px',
                    fontWeight: validCurrentPage === pageNum ? 700 : 400
                  }}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={validCurrentPage === totalPages}
              className="btn btn-ghost"
              style={{ padding: '6px 10px', fontSize: '0.8rem', opacity: validCurrentPage === totalPages ? 0.4 : 1 }}
            >
              다음 <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Detailed Hover Tooltip for Risk & Momentum Badges */}
      {activeBadgeTooltip && (
        <div
          style={{
            position: 'fixed',
            left: activeBadgeTooltip.x,
            top: activeBadgeTooltip.y,
            width: '310px',
            background: 'rgba(15, 23, 42, 0.98)',
            border: `1px solid ${activeBadgeTooltip.type === 'risk' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(99, 102, 241, 0.6)'}`,
            borderRadius: '8px',
            padding: '12px 14px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            animation: 'fadeIn 0.15s ease-out forwards',
            pointerEvents: 'none'
          }}
        >
          <div style={{
            fontWeight: 700,
            fontSize: '0.85rem',
            color: activeBadgeTooltip.type === 'risk' ? '#f87171' : '#818cf8',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{activeBadgeTooltip.title}</span>
            <span style={{
              fontSize: '0.65rem',
              padding: '1px 5px',
              borderRadius: '3px',
              background: activeBadgeTooltip.type === 'risk' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
              color: activeBadgeTooltip.type === 'risk' ? '#fca5a5' : '#c7d2fe'
            }}>
              {activeBadgeTooltip.type === 'risk' ? '위험 감지' : '모멘텀 신호'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
            {activeBadgeTooltip.desc}
          </div>
          <div style={{
            fontSize: '0.72rem',
            color: 'var(--text-secondary)',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '6px 8px',
            borderRadius: '4px',
            lineHeight: 1.4,
            borderLeft: `2px solid ${activeBadgeTooltip.type === 'risk' ? '#f87171' : '#818cf8'}`
          }}>
            <strong style={{ color: '#fff' }}>사유 및 유의사항:</strong> {activeBadgeTooltip.reason}
          </div>
        </div>
      )}
    </div>
  );
};
