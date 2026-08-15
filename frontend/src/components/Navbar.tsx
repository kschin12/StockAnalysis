import React from 'react';
import { Activity, Filter, BarChart3, Newspaper, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'screener' | 'chart' | 'news';
  setActiveTab: (tab: 'dashboard' | 'screener' | 'chart' | 'news') => void;
  selectedStockSymbol: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, selectedStockSymbol }) => {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(10, 13, 20, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '64px'
    }}>
      {/* Brand Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)'
        }}>
          <Sparkles size={20} />
        </div>
        <div>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AlphaQuant
          </span>
          <span style={{ fontSize: '0.65rem', marginLeft: '6px', padding: '2px 6px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', borderRadius: '4px', fontWeight: 700 }}>
            PRO
          </span>
        </div>
      </div>

      {/* Nav Tabs */}
      <nav style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '8px 14px' }}
        >
          <Activity size={16} />
          증시 시황
        </button>

        <button
          onClick={() => setActiveTab('screener')}
          className={`btn ${activeTab === 'screener' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '8px 14px' }}
        >
          <Filter size={16} />
          종목 스크리너
        </button>

        <button
          onClick={() => setActiveTab('chart')}
          className={`btn ${activeTab === 'chart' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '8px 14px' }}
        >
          <BarChart3 size={16} />
          차트 분석 ({selectedStockSymbol})
        </button>

        <button
          onClick={() => setActiveTab('news')}
          className={`btn ${activeTab === 'news' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '8px 14px' }}
        >
          <Newspaper size={16} />
          뉴스 & 공시
        </button>
      </nav>

      {/* Status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          무료 실시간 피드 활성
        </span>
      </div>
    </header>
  );
};
