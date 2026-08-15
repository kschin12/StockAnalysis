import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, ColorType } from 'lightweight-charts';
import type { IChartApi, CandlestickData, HistogramData, LineData } from 'lightweight-charts';
import type { Stock, NewsItem } from '../../types/stock';
import { generateSampleCandles } from '../../mock/stockData';
import { TrendingUp, TrendingDown, ShieldAlert, Newspaper } from 'lucide-react';

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

  const relatedNews = news.filter(n => n.symbol === stock.symbol);
  const isUp = stock.changeRate >= 0;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 차트 초기화
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

    // 1. Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderUpColor: '#10b981',
      borderDownColor: '#f43f5e',
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e'
    });

    // 2. Volume Series (하단 배치)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#6366f1',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // overlay
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 }
    });

    // 3. Moving Average Line Series (20일선)
    const ma20Series = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 2,
      title: 'MA20'
    });

    // 데이터 세팅
    const candles = generateSampleCandles(stock.price, periodDays);

    const candleData: CandlestickData[] = candles.map(c => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));

    const volumeData: HistogramData[] = candles.map(c => ({
      time: c.time as any,
      value: c.volume || 1000000,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)'
    }));

    // 20일 이동평균선 계산
    const ma20Data: LineData[] = [];
    for (let i = 0; i < candles.length; i++) {
      if (i >= 19) {
        const slice = candles.slice(i - 19, i + 1);
        const avg = slice.reduce((sum, item) => sum + item.close, 0) / 20;
        ma20Data.push({ time: candles[i].time as any, value: avg });
      }
    }

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);
    ma20Series.setData(ma20Data);

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [stock.symbol, periodDays, stock.price]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Card */}
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

        {/* Stock Switcher dropdown */}
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

      {/* Chart & Technical Box */}
      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>TradingView 인터랙티브 차트</span>
            <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>● 20일 이동평균선(MA20)</span>
            <span style={{ fontSize: '0.75rem', color: '#10b981' }}>■ 거래량(Volume)</span>
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

        {/* Chart Canvas */}
        <div ref={chartContainerRef} style={{ width: '100%', height: '420px' }} />
      </div>

      {/* Key Metrics Grid & News Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Valuation & Fundamental Cards */}
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
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>부채비율</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '4px' }}>
                {stock.debtRatio ? `${stock.debtRatio}%` : 'N/A'}
              </div>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RSI (14)</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '4px' }}>
                {stock.rsi14 ? stock.rsi14 : 'N/A'}
              </div>
            </div>
          </div>

          {/* Warning Badges if any */}
          {stock.warningBadges && stock.warningBadges.length > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--color-warning-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-warning)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-warning)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>
                <ShieldAlert size={16} /> 가치함정 및 리스크 요인
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {stock.warningBadges.map((b, i) => (
                  <span key={i} className="badge badge-warning">{b}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Related News & DART Disclosures */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Newspaper size={18} color="var(--color-brand)" />
            <h3 style={{ fontSize: '1.05rem' }}>{stock.name} 관련 뉴스 및 공시</h3>
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
                    <span className={`badge ${n.isDisclosure ? 'badge-warning' : 'badge-tag'}`} style={{ fontSize: '0.65rem' }}>
                      {n.isDisclosure ? 'DART 공시' : n.source}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{n.date}</span>
                  </div>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '4px' }}>{n.title}</h4>
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
    </div>
  );
};
