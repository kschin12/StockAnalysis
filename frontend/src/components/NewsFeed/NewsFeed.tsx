import React, { useState } from 'react';
import type { NewsItem } from '../../types/stock';
import { Newspaper, FileText, ArrowRight } from 'lucide-react';

interface NewsFeedProps {
  news: NewsItem[];
  onSelectStock: (symbol: string) => void;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ news, onSelectStock }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'NEWS' | 'DISCLOSURE'>('ALL');

  const filteredNews = news.filter(n => {
    if (filterType === 'NEWS') return !n.isDisclosure;
    if (filterType === 'DISCLOSURE') return n.isDisclosure;
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Filter */}
      <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>📰 실시간 뉴스 & DART 공시 큐레이션</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            스크리너 종목과 연동된 네이버 뉴스 및 DART 주요 전자공시 피드
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setFilterType('ALL')}
            className={`btn ${filterType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            전체 피드
          </button>
          <button
            onClick={() => setFilterType('NEWS')}
            className={`btn ${filterType === 'NEWS' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            <Newspaper size={14} /> 뉴스만
          </button>
          <button
            onClick={() => setFilterType('DISCLOSURE')}
            className={`btn ${filterType === 'DISCLOSURE' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
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
        {filteredNews.map(item => {
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
                        {item.companyName} ({item.symbol})
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.date}</span>
                </div>

                <h3 style={{ fontSize: '1rem', lineHeight: 1.4, marginBottom: '8px' }}>
                  {item.title}
                </h3>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {item.summary}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                {item.sentiment && (
                  <span className={`badge ${item.sentiment === 'positive' ? 'badge-up' : item.sentiment === 'negative' ? 'badge-down' : 'badge-tag'}`} style={{ fontSize: '0.7rem' }}>
                    {item.sentiment === 'positive' ? '🟢 긍정 시그널' : item.sentiment === 'negative' ? '🔴 부정 주의' : '⚪ 중립 정보'}
                  </span>
                )}

                {item.symbol && (
                  <button
                    onClick={() => onSelectStock(item.symbol!)}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.78rem', padding: '4px 8px', color: '#818cf8' }}
                  >
                    차트 분석으로 이동 <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
