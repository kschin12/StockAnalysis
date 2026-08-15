import React, { useState } from 'react';
import type { Stock } from '../../types/stock';
import { Download, Star, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { exportStocksToCsv } from '../../utils/exportCsv';

interface StockTableProps {
  stocks: Stock[];
  watchlist: string[];
  onToggleWatchlist: (symbol: string) => void;
  onSelectStock: (symbol: string) => void;
}

type SortField = 'name' | 'price' | 'changeRate' | 'marketCap' | 'per' | 'pbr' | 'roe' | 'dividendYield' | 'debtRatio';

export const StockTable: React.FC<StockTableProps> = ({
  stocks,
  watchlist,
  onToggleWatchlist,
  onSelectStock
}) => {
  const [sortField, setSortField] = useState<SortField>('marketCap');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // 기본 내림차순
    }
  };

  const sortedStocks = [...stocks].sort((a, b) => {
    let valA = a[sortField] ?? -999999;
    let valB = b[sortField] ?? -999999;
    if (typeof valA === 'string') {
      return sortAsc ? (valA as string).localeCompare(valB as string) : (valB as string).localeCompare(valA as string);
    }
    return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
  });

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={12} color="var(--text-muted)" />;
    return sortAsc ? <ChevronUp size={14} color="var(--color-brand)" /> : <ChevronDown size={14} color="var(--color-brand)" />;
  };

  return (
    <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Table Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '1rem', fontWeight: 700 }}>
            검색 결과: <span style={{ color: 'var(--color-brand)' }}>{stocks.length}</span>개 종목
          </span>
        </div>

        <button
          onClick={() => exportStocksToCsv(sortedStocks)}
          className="btn btn-secondary"
          style={{ fontSize: '0.82rem' }}
        >
          <Download size={14} />
          CSV(엑셀) 다운로드
        </button>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px 8px', width: '36px' }}>관심</th>
              <th onClick={() => handleSort('name')} style={{ padding: '12px 10px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  종목명 (코드) {renderSortIcon('name')}
                </div>
              </th>
              <th style={{ padding: '12px 8px' }}>구분</th>
              <th onClick={() => handleSort('price')} style={{ padding: '12px 10px', textAlign: 'right', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  현재가 {renderSortIcon('price')}
                </div>
              </th>
              <th onClick={() => handleSort('changeRate')} style={{ padding: '12px 10px', textAlign: 'right', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  등락률 {renderSortIcon('changeRate')}
                </div>
              </th>
              <th onClick={() => handleSort('marketCap')} style={{ padding: '12px 10px', textAlign: 'right', cursor: 'pointer' }}>
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
              <th style={{ padding: '12px 10px', textAlign: 'center' }}>상태/주의</th>
            </tr>
          </thead>
          <tbody>
            {sortedStocks.length > 0 ? (
              sortedStocks.map((stk) => {
                const isWatch = watchlist.includes(stk.symbol);
                const isUp = stk.changeRate >= 0;

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
                    {/* Watchlist star */}
                    <td style={{ padding: '12px 8px' }} onClick={(e) => { e.stopPropagation(); onToggleWatchlist(stk.symbol); }}>
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

                    {/* Market & Asset Type */}
                    <td style={{ padding: '12px 8px' }}>
                      <span className="badge badge-tag" style={{ fontSize: '0.7rem' }}>
                        {stk.market}
                      </span>
                      {stk.assetType === 'ETF' && (
                        <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontSize: '0.7rem', marginLeft: '4px' }}>
                          ETF
                        </span>
                      )}
                    </td>

                    {/* Price */}
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600 }}>
                      {stk.currency === 'KRW' ? `₩${stk.price.toLocaleString()}` : `$${stk.price.toFixed(2)}`}
                    </td>

                    {/* Change Rate */}
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <span className={`badge ${isUp ? 'badge-up' : 'badge-down'}`}>
                        {isUp ? '+' : ''}{stk.changeRate.toFixed(2)}%
                      </span>
                    </td>

                    {/* Market Cap */}
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {stk.currency === 'KRW' 
                        ? `${(stk.marketCap / 10000).toFixed(1)}조`
                        : `$${(stk.marketCap / 1000).toFixed(1)}B`}
                    </td>

                    {/* PER */}
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: stk.per && stk.per < 10 ? 700 : 400, color: stk.per && stk.per < 10 ? 'var(--color-up)' : 'inherit' }}>
                      {stk.per ? `${stk.per.toFixed(1)}x` : '-'}
                    </td>

                    {/* PBR */}
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: stk.pbr && stk.pbr < 1.0 ? 700 : 400, color: stk.pbr && stk.pbr < 1.0 ? 'var(--color-up)' : 'inherit' }}>
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

                    {/* Warning Badges */}
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      {stk.warningBadges && stk.warningBadges.length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          {stk.warningBadges.map((b, idx) => (
                            <span key={idx} className="badge badge-warning" style={{ fontSize: '0.68rem' }} title={b}>
                              ⚠️ {b}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>정상</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  조건에 일치하는 종목이 없습니다. 필터를 완화해 보세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
