import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, ColorType } from 'lightweight-charts';
import type { IChartApi, CandlestickData, HistogramData, LineData } from 'lightweight-charts';
import type { Stock, NewsItem } from '../../types/stock';
import { fetchStockCandles, searchStockNews } from '../../api/stockApi';
import { generateMockCandles } from '../../mock/stockData';
import { TrendingUp, TrendingDown, Newspaper, Loader2, Search } from 'lucide-react';
import { getBadgeDetail, calculateBadgeTooltipPosition } from '../../utils/badgeDetails';
import type { ActiveTooltipState } from '../../utils/badgeDetails';
import { BadgeTooltipPortal } from '../common/BadgeTooltipPortal';

interface StockChartProps {
  stock: Stock;
  news: NewsItem[];
  allStocks: Stock[];
  onSelectStock: (symbol: string) => void;
}

export const StockChart: React.FC<StockChartProps> = ({ stock, news, allStocks, onSelectStock }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const [periodDays, setPeriodDays] = useState<number>(90);
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(false);
  const [activeBadgeTooltip, setActiveBadgeTooltip] = useState<ActiveTooltipState | null>(null);
  const [isSearchingNews, setIsSearchingNews] = useState<boolean>(false);
  const [searchedNews, setSearchedNews] = useState<NewsItem[] | null>(null);

  // 종목 변경 시 검색 뉴스 초기화
  useEffect(() => {
    setSearchedNews(null);
  }, [stock.symbol]);

  useEffect(() => {
    const handleScroll = () => setActiveBadgeTooltip(null);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const relatedNews = searchedNews !== null 
    ? searchedNews.slice(0, 10) 
    : news.filter(n => n.symbol === stock.symbol).slice(0, 5);
  const isUp = stock.changeRate >= 0;

  const handleSearchNews = async () => {
    setIsSearchingNews(true);
    try {
      const results = await searchStockNews(stock.symbol, stock.name);
      if (results && results.length > 0) {
        setSearchedNews(results);
      }
    } catch (err) {
      console.error('최신 뉴스 검색 실패:', err);
    } finally {
      setIsSearchingNews(false);
    }
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    let isMounted = true;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af'
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      crosshair: {
        vertLine: { color: '#6366f1', width: 1, style: 3 },
        horzLine: { color: '#6366f1', width: 1, style: 3 }
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        scaleMargins: { top: 0.1, bottom: 0.25 }
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true
      },
      height: 420
    });

    chartInstanceRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderUpColor: '#10b981',
      borderDownColor: '#f43f5e',
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e'
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#6366f1',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 }
    });

    const ma20Series = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 2,
      title: 'MA20'
    });

    async function loadCandles() {
      setIsLoadingCandles(true);
      try {
        const realCandles = await fetchStockCandles(stock.symbol, periodDays);
        const candles = (realCandles && realCandles.length > 0)
          ? realCandles
          : generateMockCandles(stock.price, periodDays);

        if (!isMounted) return;

        const candleData: CandlestickData[] = candles.map((c: any) => ({
          time: c.time as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close
        }));

        const volumeData: HistogramData[] = candles.map((c: any) => ({
          time: c.time as any,
          value: c.volume || 1000000,
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)'
        }));

        const ma20Data: LineData[] = [];
        for (let i = 0; i < candles.length; i++) {
          if (i >= 19) {
            const slice = candles.slice(i - 19, i + 1);
            const avg = slice.reduce((sum: number, item: any) => sum + item.close, 0) / 20;
            ma20Data.push({ time: candles[i].time as any, value: Math.round(avg * 100) / 100 });
          }
        }

        candleSeries.setData(candleData);
        volumeSeries.setData(volumeData);
        ma20Series.setData(ma20Data);

        chart.timeScale().fitContent();
      } catch (err) {
        console.error('Candle load error:', err);
      } finally {
        if (isMounted) setIsLoadingCandles(false);
      }
    }

    loadCandles();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [stock.symbol, periodDays]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.5rem' }}>{stock.name}</h2>
              <span className="badge badge-tag">{stock.market}</span>
              <span className="badge" style={{ background: '#2d3748', color: '#e2e8f0' }}>{stock.symbol}</span>
              {stock.assetType === 'ETF' && <span className="badge badge-up">ETF</span>}
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{stock.sector}</span>
          </div>

          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '1.7rem', fontWeight: 800 }}>
                {stock.currency === 'KRW' ? `₩${stock.price.toLocaleString()}` : `$${stock.price.toFixed(2)}`}
              </span>
              <span className={`badge ${isUp ? 'badge-up' : 'badge-down'}`} style={{ fontSize: '0.85rem' }}>
                {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {isUp ? '+' : ''}{stock.changeRate.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>다른 종목 조회:</label>
          <select
            value={stock.symbol}
            onChange={(e) => onSelectStock(e.target.value)}
            style={{ minWidth: '160px' }}
          >
            {allStocks.map(s => (
              <option key={s.symbol} value={s.symbol}>
                {s.name} ({s.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>실시간 인터랙티브 캔들 차트</span>
            {isLoadingCandles ? (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-brand)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Loader2 size={12} className="animate-spin" /> 실시간 캔들 로딩 중...
              </span>
            ) : (
              <span style={{ fontSize: '0.75rem', color: '#10b981' }}>● 실시간 일봉 연동 완료</span>
            )}
            <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>● 20일선(MA20)</span>
            <span style={{ fontSize: '0.75rem', color: '#6366f1' }}>■ 거래량(Volume)</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {[30, 60, 90, 180].map(days => (
              <button
                key={days}
                onClick={() => setPeriodDays(days)}
                className={`btn ${periodDays === days ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                {days}일
              </button>
            ))}
          </div>
        </div>

        <div ref={chartContainerRef} style={{ width: '100%', height: '420px' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '16px' }}>핵심 밸류에이션 & 퀀트 지표</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PER (주가수익비율)</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '4px' }}>
                {stock.per ? `${stock.per}x` : 'N/A'}
              </div>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PBR (주가순자산비율)</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '4px' }}>
                {stock.pbr ? `${stock.pbr}x` : 'N/A'}
              </div>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ROE (자기자본이익률)</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '4px', color: 'var(--color-brand)' }}>
                {stock.roe ? `${stock.roe}%` : 'N/A'}
              </div>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>배당수익률</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '4px', color: 'var(--color-up)' }}>
                {stock.dividendYield ? `${stock.dividendYield}%` : '0.00%'}
              </div>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>52주 최고 / 최저</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '6px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-up)' }}>
                  {stock.high52w ? (stock.currency === 'KRW' ? `₩${stock.high52w.toLocaleString()}` : `$${stock.high52w}`) : '-'}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>/</span>
                <span style={{ color: 'var(--color-down)' }}>
                  {stock.low52w ? (stock.currency === 'KRW' ? `₩${stock.low52w.toLocaleString()}` : `$${stock.low52w}`) : '-'}
                </span>
              </div>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>시가총액</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>
                {stock.currency === 'KRW' 
                  ? `${(stock.marketCap / 10000).toFixed(1)}조원`
                  : `$${(stock.marketCap / 1000).toFixed(1)}B`}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '14px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>위험 / 퀀트 신호</div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              {stock.warningBadges && stock.warningBadges.map((b, i) => (
                <span
                  key={`w-${i}`}
                  onMouseEnter={(e) => handleBadgeMouseEnter(e, b, 'risk')}
                  onMouseLeave={handleBadgeMouseLeave}
                  style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f87171', cursor: 'help' }}
                >
                  {b}
                </span>
              ))}

              {stock.momentumBadges && stock.momentumBadges.map((m, i) => (
                <span
                  key={`m-${i}`}
                  onMouseEnter={(e) => handleBadgeMouseEnter(e, m, 'momentum')}
                  onMouseLeave={handleBadgeMouseLeave}
                  style={{ fontSize: '0.85rem', fontWeight: 600, color: '#818cf8', cursor: 'help' }}
                >
                  {m}
                </span>
              ))}

              {(!stock.warningBadges || stock.warningBadges.length === 0) && (!stock.momentumBadges || stock.momentumBadges.length === 0) && (
                <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.82rem' }}>
                  위험 요인 없음 (재무 건전성 정상)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Newspaper size={18} color="var(--color-brand)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{stock.name} 관련 뉴스 및 공시</h3>
            </div>

            <button
              onClick={handleSearchNews}
              disabled={isSearchingNews}
              className="btn btn-secondary"
              style={{
                padding: '5px 12px',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: '6px',
                fontWeight: 600
              }}
              title={`${stock.name}의 최신 뉴스 및 DART 공시를 실시간으로 추가 검색하여 업데이트합니다.`}
            >
              {isSearchingNews ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              {isSearchingNews ? '뉴스 검색 중...' : '최신뉴스 검색'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {relatedNews.length > 0 ? (
              relatedNews.map(n => (
                <div
                  key={n.id}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: n.isDisclosure ? '#fbbf24' : '#818cf8' }}>
                      {n.isDisclosure ? 'DART 공시' : n.source}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{n.date}</span>
                  </div>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#fff', textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-brand)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#fff'}
                    >
                      {n.title}
                    </a>
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {n.summary}
                  </p>
                </div>
              ))
            ) : (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                최근 7일간 등록된 중요 뉴스/공시가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      <BadgeTooltipPortal tooltip={activeBadgeTooltip} />
    </div>
  );
};
