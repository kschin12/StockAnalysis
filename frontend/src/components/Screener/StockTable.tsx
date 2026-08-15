import React, { useState, useEffect } from 'react';
import type { Stock } from '../../types/stock';
import { Star, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportStocksToCsv } from '../../utils/exportCsv';
import { getBadgeDetail, calculateBadgeTooltipPosition } from '../../utils/badgeDetails';
import type { ActiveTooltipState } from '../../utils/badgeDetails';
import { BadgeTooltipPortal } from '../common/BadgeTooltipPortal';

interface StockTableProps {
  stocks: Stock[];
  watchlist: string[];
  activeCategory?: string;
  onToggleWatchlist: (symbol: string) => void;
  onSelectStock: (symbol: string) => void;
}

type SortField = 'name' | 'price' | 'changeRate' | 'volume' | 'marketCap' | 'per' | 'pbr' | 'roe' | 'dividendYield' | 'debtRatio';

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
  const [activeBadgeTooltip, setActiveBadgeTooltip] = useState<ActiveTooltipState | null>(null);

  // 스크롤 시 팝업 닫기
  useEffect(() => {
    const handleScroll = () => setActiveBadgeTooltip(null);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    const detail = getBadgeDetail(badgeName, type);
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = calculateBadgeTooltipPosition(rect, 320, 150);

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
                              fontSize: '0.72rem',
                              color: '#f87171',
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
                              fontSize: '0.72rem',
                              color: '#818cf8',
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

      {/* Floating Detailed Hover Tooltip for Risk & Momentum Badges (Body Portal) */}
      <BadgeTooltipPortal tooltip={activeBadgeTooltip} />
    </div>
  );
};
