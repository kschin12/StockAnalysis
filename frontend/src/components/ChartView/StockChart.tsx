import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, ColorType } from 'lightweight-charts';
import type { IChartApi, CandlestickData, HistogramData } from 'lightweight-charts';
import type { Stock, NewsItem } from '../../types/stock';
import { fetchStockCandles, searchStockNews } from '../../api/stockApi';
import { generateMockCandles } from '../../mock/stockData';
import { TrendingUp, TrendingDown, Newspaper, Loader2, Search, Sliders, Activity } from 'lucide-react';
import { getBadgeDetail, calculateBadgeTooltipPosition } from '../../utils/badgeDetails';
import type { ActiveTooltipState } from '../../utils/badgeDetails';
import { BadgeTooltipPortal } from '../common/BadgeTooltipPortal';
import {
  calculateSMA,
  calculateBollingerBands,
  calculateRSI,
  calculateMACD,
  aggregateCandles
} from '../../utils/chartIndicators';
import type { Candle, ChartInterval } from '../../utils/chartIndicators';

interface StockChartProps {
  stock: Stock;
  news: NewsItem[];
  allStocks: Stock[];
  onSelectStock: (symbol: string) => void;
}

export const StockChart: React.FC<StockChartProps> = ({ stock, news, allStocks, onSelectStock }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const subChartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const subChartInstanceRef = useRef<IChartApi | null>(null);

  // 차트 컨트롤 상태
  const [periodDays, setPeriodDays] = useState<number>(180);
  const [chartInterval, setChartInterval] = useState<ChartInterval>('D');
  const [activeMAs, setActiveMAs] = useState<{ [key: number]: boolean }>({
    5: true,
    20: true,
    60: true,
    120: false,
    240: false
  });
  const [showBB, setShowBB] = useState<boolean>(false);
  const [subIndicator, setSubIndicator] = useState<'VOL' | 'RSI' | 'MACD'>('VOL');

  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(false);
  const [activeBadgeTooltip, setActiveBadgeTooltip] = useState<ActiveTooltipState | null>(null);
  const [isSearchingNews, setIsSearchingNews] = useState<boolean>(false);
  const [searchedNews, setSearchedNews] = useState<NewsItem[] | null>(null);
  const [chartNewsTab, setChartNewsTab] = useState<'NEWS' | 'DISCLOSURE' | 'ALL'>('NEWS');

  // 종목 드릴다운 및 실시간 검색 상태
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'KOSPI' | 'KOSDAQ' | 'US'>('ALL');
  const [stockSearchQuery, setStockSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // 종목 변경 시 검색 뉴스 초기화
  useEffect(() => {
    setSearchedNews(null);
  }, [stock.symbol]);

  // 검색 및 시장 드릴다운 필터링된 종목 리스트
  const filteredStockList = allStocks.filter(s => {
    if (marketFilter !== 'ALL' && s.market !== marketFilter) return false;
    if (!stockSearchQuery.trim()) return true;
    const q = stockSearchQuery.trim().toLowerCase();
    return s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q);
  });

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
    : news.filter(n => n.symbol === stock.symbol).slice(0, 8);
  const newsOnly = relatedNews.filter(n => !n.isDisclosure);
  const disclosureOnly = relatedNews.filter(n => n.isDisclosure);
  const displayedRelatedNews = chartNewsTab === 'NEWS' 
    ? newsOnly 
    : chartNewsTab === 'DISCLOSURE' 
      ? disclosureOnly 
      : relatedNews;
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

  const toggleMA = (period: number) => {
    setActiveMAs(prev => ({ ...prev, [period]: !prev[period] }));
  };

  // 메인 및 서브 차트 렌더링
  useEffect(() => {
    if (!chartContainerRef.current) return;

    let isMounted = true;
    let isSyncingMain = false;
    let isSyncingSub = false;

    // 1. 메인 캔들 차트 인스턴스 생성
    const mainChart = createChart(chartContainerRef.current, {
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
        scaleMargins: { top: 0.08, bottom: 0.1 }
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        visible: false // 시간축은 하단 서브 차트에서 일괄 표시
      },
      height: 360
    });
    chartInstanceRef.current = mainChart;

    // 2. 하단 서브 차트 인스턴스 생성
    let subChart: IChartApi | null = null;
    if (subChartContainerRef.current) {
      subChart = createChart(subChartContainerRef.current, {
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
          scaleMargins: { top: 0.12, bottom: 0.12 }
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          timeVisible: true
        },
        height: 150
      });
      subChartInstanceRef.current = subChart;

      // 시간축 동기화 (Zoom / Scroll Sync)
      mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (isSyncingMain || !range || !subChart) return;
        isSyncingSub = true;
        subChart.timeScale().setVisibleLogicalRange(range);
        isSyncingSub = false;
      });

      subChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (isSyncingSub || !range) return;
        isSyncingMain = true;
        mainChart.timeScale().setVisibleLogicalRange(range);
        isSyncingMain = false;
      });
    }

    // 메인 차트 시리즈
    const candleSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderUpColor: '#10b981',
      borderDownColor: '#f43f5e',
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e'
    });

    // 이동평균선 시리즈 설정
    const maColorMap: { [key: number]: string } = {
      5: '#38bdf8',
      20: '#f59e0b',
      60: '#a855f7',
      120: '#ec4899',
      240: '#64748b'
    };

    const maSeriesList: { period: number; series: any }[] = [];
    [5, 20, 60, 120, 240].forEach(period => {
      if (activeMAs[period]) {
        const s = mainChart.addSeries(LineSeries, {
          color: maColorMap[period],
          lineWidth: period === 20 ? 2 : 1,
          title: `MA${period}`
        });
        maSeriesList.push({ period, series: s });
      }
    });

    // 볼린저 밴드 시리즈
    let bbUpperSeries: any = null;
    let bbLowerSeries: any = null;
    if (showBB) {
      bbUpperSeries = mainChart.addSeries(LineSeries, {
        color: '#06b6d4',
        lineWidth: 1,
        lineStyle: 2,
        title: 'BB Upper'
      });
      bbLowerSeries = mainChart.addSeries(LineSeries, {
        color: '#06b6d4',
        lineWidth: 1,
        lineStyle: 2,
        title: 'BB Lower'
      });
    }

    async function loadCandles() {
      setIsLoadingCandles(true);
      try {
        // 이평선과 주봉/월봉 계산을 위해 충분한 과거 데이터(기본 365일 이상) 로드
        const requestDays = Math.max(periodDays, 365);
        const realCandles = await fetchStockCandles(stock.symbol, requestDays);
        const rawCandles: Candle[] = (realCandles && realCandles.length > 0)
          ? realCandles
          : generateMockCandles(stock.price, requestDays);

        if (!isMounted) return;

        // 봉 주기에 맞게 데이터 집계 (일봉/주봉/월봉)
        const aggregated = aggregateCandles(rawCandles, chartInterval);
        
        // 캔들 데이터 매핑
        const candleData: CandlestickData[] = aggregated.map(c => ({
          time: c.time as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close
        }));

        candleSeries.setData(candleData);

        // 이동평균선 데이터 주입
        maSeriesList.forEach(({ period, series }) => {
          const smaData = calculateSMA(aggregated, period);
          series.setData(smaData.map(d => ({ time: d.time as any, value: d.value })));
        });

        // 볼린저 밴드 데이터 주입
        if (showBB && bbUpperSeries && bbLowerSeries) {
          const bbData = calculateBollingerBands(aggregated, 20, 2);
          bbUpperSeries.setData(bbData.upper.map(d => ({ time: d.time as any, value: d.value })));
          bbLowerSeries.setData(bbData.lower.map(d => ({ time: d.time as any, value: d.value })));
        }

        // 서브 차트 보조지표 렌더링
        if (subChart) {
          if (subIndicator === 'VOL') {
            const volSeries = subChart.addSeries(HistogramSeries, {
              priceFormat: { type: 'volume' },
              title: '거래량'
            });
            const volData: HistogramData[] = aggregated.map(c => ({
              time: c.time as any,
              value: c.volume || 1000000,
              color: c.close >= c.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(244, 63, 94, 0.5)'
            }));
            volSeries.setData(volData);
          } else if (subIndicator === 'RSI') {
            const rsiData = calculateRSI(aggregated, 14);
            
            // 기준선 (70 과매수 / 30 과매도 / 50 중간선)
            const overboughtSeries = subChart.addSeries(LineSeries, {
              color: 'rgba(244, 63, 94, 0.6)',
              lineWidth: 1,
              lineStyle: 2,
              title: '70 과매수'
            });
            const oversoldSeries = subChart.addSeries(LineSeries, {
              color: 'rgba(16, 185, 129, 0.6)',
              lineWidth: 1,
              lineStyle: 2,
              title: '30 과매도'
            });

            if (rsiData.length > 0) {
              overboughtSeries.setData(rsiData.map(d => ({ time: d.time as any, value: 70 })));
              oversoldSeries.setData(rsiData.map(d => ({ time: d.time as any, value: 30 })));
            }

            const rsiSeries = subChart.addSeries(LineSeries, {
              color: '#818cf8',
              lineWidth: 2,
              title: 'RSI(14)'
            });
            rsiSeries.setData(rsiData.map(d => ({ time: d.time as any, value: d.value })));
          } else if (subIndicator === 'MACD') {
            const macdData = calculateMACD(aggregated, 12, 26, 9);
            
            // 0 기준선
            const zeroSeries = subChart.addSeries(LineSeries, {
              color: 'rgba(255, 255, 255, 0.2)',
              lineWidth: 1,
              lineStyle: 2,
              title: '0 기준선'
            });
            if (macdData.macd.length > 0) {
              zeroSeries.setData(macdData.macd.map(d => ({ time: d.time as any, value: 0 })));
            }

            const histSeries = subChart.addSeries(HistogramSeries, {
              title: '히스토그램'
            });
            histSeries.setData(macdData.histogram.map(d => ({
              time: d.time as any,
              value: d.value,
              color: d.color
            })));

            const macdLineSeries = subChart.addSeries(LineSeries, {
              color: '#38bdf8',
              lineWidth: 2,
              title: 'MACD'
            });
            macdLineSeries.setData(macdData.macd.map(d => ({ time: d.time as any, value: d.value })));

            const signalLineSeries = subChart.addSeries(LineSeries, {
              color: '#f59e0b',
              lineWidth: 1,
              title: 'Signal'
            });
            signalLineSeries.setData(macdData.signal.map(d => ({ time: d.time as any, value: d.value })));
          }

          subChart.timeScale().fitContent();
        }

        mainChart.timeScale().fitContent();
      } catch (err) {
        console.error('Candle load error:', err);
      } finally {
        if (isMounted) setIsLoadingCandles(false);
      }
    }

    loadCandles();

    const handleResize = () => {
      if (chartContainerRef.current) {
        mainChart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
      if (subChartContainerRef.current && subChart) {
        subChart.applyOptions({ width: subChartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      mainChart.remove();
      if (subChart) subChart.remove();
    };
  }, [stock.symbol, periodDays, chartInterval, activeMAs, showBB, subIndicator]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-card" style={{
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        position: 'relative',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <a
                href={stock.market === 'KOSPI' || stock.market === 'KOSDAQ' || /^[0-9]{6}$/.test(stock.symbol)
                  ? `https://finance.naver.com/item/main.naver?code=${stock.symbol}`
                  : `https://finance.yahoo.com/quote/${stock.symbol}`
                }
                target="_blank"
                rel="noopener noreferrer"
                title={`${stock.market === 'KOSPI' || stock.market === 'KOSDAQ' || /^[0-9]{6}$/.test(stock.symbol) ? '네이버 증권' : 'Yahoo Finance'}에서 '${stock.name}' 상세 정보 보기 (새 탭)`}
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'inherit',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-brand)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'inherit')}
              >
                {stock.name}
              </a>
              <span className="badge badge-tag">{stock.market}</span>
              <a
                href={stock.market === 'KOSPI' || stock.market === 'KOSDAQ' || /^[0-9]{6}$/.test(stock.symbol)
                  ? `https://finance.naver.com/item/main.naver?code=${stock.symbol}`
                  : `https://finance.yahoo.com/quote/${stock.symbol}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="badge"
                title={`${stock.market === 'KOSPI' || stock.market === 'KOSDAQ' || /^[0-9]{6}$/.test(stock.symbol) ? '네이버 증권' : 'Yahoo Finance'}에서 '${stock.symbol}' 상세 정보 보기 (새 탭)`}
                style={{
                  background: '#2d3748',
                  color: '#e2e8f0',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#4a5568')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#2d3748')}
              >
                {stock.symbol}
              </a>
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

        {/* 종목 드릴다운 및 검색 컨트롤 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* 1. 시장 드릴다운 버튼 탭 */}
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {(['ALL', 'KOSPI', 'KOSDAQ', 'US'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMarketFilter(m)}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.74rem',
                  fontWeight: marketFilter === m ? 700 : 500,
                  borderRadius: '4px',
                  background: marketFilter === m ? 'var(--color-brand)' : 'transparent',
                  color: marketFilter === m ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {m === 'ALL' ? '전체' : m}
              </button>
            ))}
          </div>

          {/* 2. 실시간 검색 & 선택 콤보박스 */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <input
                type="text"
                placeholder="종목명/티커 검색..."
                value={stockSearchQuery}
                onChange={(e) => {
                  setStockSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredStockList.length > 0) {
                    onSelectStock(filteredStockList[0].symbol);
                    setStockSearchQuery('');
                    setIsDropdownOpen(false);
                  } else if (e.key === 'Escape') {
                    setIsDropdownOpen(false);
                  }
                }}
                className="input"
                style={{
                  width: '100%',
                  padding: '5px 28px 5px 10px',
                  fontSize: '0.8rem',
                  height: '32px',
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.8)'
                }}
              />
              <Search size={14} style={{ position: 'absolute', right: '8px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            </div>

            {/* 자동완성 / 검색 결과 드롭다운 리스트 */}
            {isDropdownOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '6px',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  background: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.85)',
                  zIndex: 100
                }}>
                  {filteredStockList.length === 0 ? (
                    <div style={{ padding: '10px', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      일치하는 종목이 없습니다
                    </div>
                  ) : (
                    filteredStockList.map(s => (
                      <div
                        key={s.symbol}
                        onClick={() => {
                          onSelectStock(s.symbol);
                          setStockSearchQuery('');
                          setIsDropdownOpen(false);
                        }}
                        style={{
                          padding: '7px 10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          background: s.symbol === stock.symbol ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = s.symbol === stock.symbol ? 'rgba(99, 102, 241, 0.25)' : 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, color: s.symbol === stock.symbol ? 'var(--color-brand)' : '#f8fafc' }}>
                            {s.name}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.symbol}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: '#94a3b8'
                          }}>
                            {s.market}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: s.changeRate >= 0 ? 'var(--color-up)' : 'var(--color-down)'
                          }}>
                            {s.changeRate >= 0 ? '+' : ''}{s.changeRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', zIndex: 1 }}>
        {/* 차트 상단 컨트롤 바 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* 봉 주기 선택 */}
            <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              {(['D', 'W', 'M'] as ChartInterval[]).map(interval => (
                <button
                  key={interval}
                  onClick={() => setChartInterval(interval)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: chartInterval === interval ? 700 : 500,
                    borderRadius: '4px',
                    background: chartInterval === interval ? 'var(--color-brand)' : 'transparent',
                    color: chartInterval === interval ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {interval === 'D' ? '일봉' : interval === 'W' ? '주봉' : '월봉'}
                </button>
              ))}
            </div>

            {/* 이동평균선 토글 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sliders size={12} /> 이평:
              </span>
              {[
                { period: 5, label: '5일', color: '#38bdf8' },
                { period: 20, label: '20일', color: '#f59e0b' },
                { period: 60, label: '60일', color: '#a855f7' },
                { period: 120, label: '120일', color: '#ec4899' },
                { period: 240, label: '240일', color: '#64748b' }
              ].map(ma => (
                <button
                  key={ma.period}
                  onClick={() => toggleMA(ma.period)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    borderRadius: '4px',
                    border: `1px solid ${activeMAs[ma.period] ? ma.color : 'var(--border-subtle)'}`,
                    background: activeMAs[ma.period] ? `${ma.color}22` : 'transparent',
                    color: activeMAs[ma.period] ? ma.color : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: activeMAs[ma.period] ? 700 : 400,
                    transition: 'all 0.15s'
                  }}
                >
                  ● {ma.label}
                </button>
              ))}

              {/* 볼린저 밴드 토글 */}
              <button
                onClick={() => setShowBB(!showBB)}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  borderRadius: '4px',
                  border: `1px solid ${showBB ? '#06b6d4' : 'var(--border-subtle)'}`,
                  background: showBB ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                  color: showBB ? '#06b6d4' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: showBB ? 700 : 400,
                  transition: 'all 0.15s'
                }}
              >
                ● 볼린저(20,2)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isLoadingCandles ? (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-brand)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Loader2 size={12} className="animate-spin" /> 로딩 중...
              </span>
            ) : null}

            {/* 조회 기간 */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {[90, 180, 365, 730].map(days => (
                <button
                  key={days}
                  onClick={() => setPeriodDays(days)}
                  className={`btn ${periodDays === days ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                >
                  {days === 730 ? '2년' : days === 365 ? '1년' : `${days}일`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 메인 캔들 차트 */}
        <div ref={chartContainerRef} style={{ width: '100%', height: '360px' }} />

        {/* 하단 보조지표 탭 & 서브 차트 */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Activity size={12} /> 하단 보조지표:
              </span>
              {[
                { id: 'VOL', label: '거래량 (VOL)' },
                { id: 'RSI', label: 'RSI (14)' },
                { id: 'MACD', label: 'MACD (12, 26, 9)' }
              ].map(ind => (
                <button
                  key={ind.id}
                  onClick={() => setSubIndicator(ind.id as any)}
                  style={{
                    padding: '3px 10px',
                    fontSize: '0.74rem',
                    borderRadius: '4px',
                    border: subIndicator === ind.id ? '1px solid var(--color-brand)' : '1px solid var(--border-subtle)',
                    background: subIndicator === ind.id ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                    color: subIndicator === ind.id ? 'var(--color-brand)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: subIndicator === ind.id ? 700 : 500,
                    transition: 'all 0.15s'
                  }}
                >
                  {ind.label}
                </button>
              ))}
            </div>

            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {subIndicator === 'RSI' && 'RSI: 70이상 과매수(경고) / 30이하 과매도(반등권)'}
              {subIndicator === 'MACD' && 'MACD(하늘색) - 시그널(주황색) 골든크로스 / 히스토그램'}
              {subIndicator === 'VOL' && '양봉 녹색 / 음봉 적색 거래량'}
            </span>
          </div>

          <div ref={subChartContainerRef} style={{ width: '100%', height: '150px' }} />
        </div>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Newspaper size={18} color="var(--color-brand)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{stock.name} 관련 소식</h3>
              </div>

              {/* 뉴스와 공시 분리 탭 (기본값: 최신 뉴스) */}
              <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => setChartNewsTab('NEWS')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: chartNewsTab === 'NEWS' ? 700 : 500,
                    borderRadius: '4px',
                    background: chartNewsTab === 'NEWS' ? 'var(--color-brand)' : 'transparent',
                    color: chartNewsTab === 'NEWS' ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  최신 뉴스 ({newsOnly.length})
                </button>
                <button
                  onClick={() => setChartNewsTab('DISCLOSURE')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: chartNewsTab === 'DISCLOSURE' ? 700 : 500,
                    borderRadius: '4px',
                    background: chartNewsTab === 'DISCLOSURE' ? 'var(--color-brand)' : 'transparent',
                    color: chartNewsTab === 'DISCLOSURE' ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  DART 공시 ({disclosureOnly.length})
                </button>
                <button
                  onClick={() => setChartNewsTab('ALL')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: chartNewsTab === 'ALL' ? 700 : 500,
                    borderRadius: '4px',
                    background: chartNewsTab === 'ALL' ? 'var(--color-brand)' : 'transparent',
                    color: chartNewsTab === 'ALL' ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  전체 ({relatedNews.length})
                </button>
              </div>
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
            {displayedRelatedNews.length > 0 ? (
              displayedRelatedNews.map(n => (
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
                  {n.summary && n.summary.trim() !== '' && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {n.summary}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {chartNewsTab === 'DISCLOSURE' 
                  ? '최근 7일간 등록된 중요 DART 공시가 없습니다.'
                  : chartNewsTab === 'NEWS'
                    ? '최근 7일간 등록된 중요 뉴스가 없습니다.'
                    : '최근 7일간 등록된 중요 뉴스/공시가 없습니다.'}
              </div>
            )}
          </div>
        </div>
      </div>

      <BadgeTooltipPortal tooltip={activeBadgeTooltip} />
    </div>
  );
};
