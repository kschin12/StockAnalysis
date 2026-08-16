import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, X, RotateCcw, CheckCircle2, Sliders } from 'lucide-react';
import type { CollectorSettings } from '../../api/stockApi';
import { DEFAULT_COLLECTOR_SETTINGS, fetchCollectorSettings, saveCollectorSettingsApi, triggerUniverseCollection } from '../../api/stockApi';

interface CollectorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => Promise<void>;
}

export const CollectorSettingsModal: React.FC<CollectorSettingsModalProps> = ({
  isOpen,
  onClose,
  onRefreshData
}) => {
  const [settings, setSettings] = useState<CollectorSettings>(DEFAULT_COLLECTOR_SETTINGS);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCollecting, setIsCollecting] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCollectorSettings()
        .then(data => setSettings(data));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof CollectorSettings, val: number) => {
    setSettings(prev => ({
      ...prev,
      [field]: isNaN(val) ? 0 : val
    }));
  };

  const handleResetDefault = () => {
    setSettings(DEFAULT_COLLECTOR_SETTINGS);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await saveCollectorSettingsApi(settings);
      setSettings(saved);
      setSaveSuccessMsg('수집 설정이 안전하게 저장되었습니다.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (e) {
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndCollect = async () => {
    setIsCollecting(true);
    try {
      await saveCollectorSettingsApi(settings);
      const res = await triggerUniverseCollection(settings);
      if (res.success) {
        if (onRefreshData) await onRefreshData();
        alert(`✅ 맞춤 수집 완료! (총 ${res.updatedStocksCount || 0}개 종목 유니버스 동기화)`);
        onClose();
      } else {
        alert('종목 수집 중 오류가 발생했습니다. 백엔드 상태를 확인해 주세요.');
      }
    } catch (e) {
      alert('수집 실행에 실패했습니다.');
    } finally {
      setIsCollecting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 8, 15, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-brand)'
            }}>
              <Sliders size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>종목 수집 조건 커스텀 설정</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                코스피 200, 코스닥 150, 미국 대표지수 유니버스의 수집 비율과 급등락 종목 수를 설정합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Banner */}
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          fontSize: '0.78rem',
          color: '#93c5fd',
          lineHeight: 1.5
        }}>
          💡 <strong>합집합(Union) 자동 중복 제거</strong>: 시총 상위, 거래량 상위, 급등주, 급락주 조건에 해당하는 모든 종목을 중복 없이 모아 수집하며, 등록하신 관심종목은 항상 안전하게 포함됩니다.
        </div>

        {/* Form Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* 1. 코스피 200 */}
          <div style={{
            background: 'var(--bg-input)',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#a5b4fc' }}>🇰🇷 코스피 (KOSPI 200 기준)</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>모수: 200개</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>시가총액 상위</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={settings.kospiMarketCapPercent}
                    onChange={(e) => handleChange('kospiMarketCapPercent', parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>거래량 상위</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={settings.kospiVolumePercent}
                    onChange={(e) => handleChange('kospiVolumePercent', parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>급등 종목 수</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={settings.kospiRiseCount}
                    onChange={(e) => handleChange('kospiRiseCount', parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>개</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>급락 종목 수</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={settings.kospiFallCount}
                    onChange={(e) => handleChange('kospiFallCount', parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>개</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. 코스닥 150 */}
          <div style={{
            background: 'var(--bg-input)',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#34d399' }}>🇰🇷 코스닥 (KOSDAQ 150 기준)</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>모수: 150개</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>시가총액 상위</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={settings.kosdaqMarketCapPercent}
                    onChange={(e) => handleChange('kosdaqMarketCapPercent', parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>거래량 상위</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={settings.kosdaqVolumePercent}
                    onChange={(e) => handleChange('kosdaqVolumePercent', parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>급등 종목 수</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={settings.kosdaqRiseCount}
                    onChange={(e) => handleChange('kosdaqRiseCount', parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>개</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>급락 종목 수</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={settings.kosdaqFallCount}
                    onChange={(e) => handleChange('kosdaqFallCount', parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>개</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. 미국 시장 (S&P 500 / NASDAQ 100) */}
          <div style={{
            background: 'var(--bg-input)',
            padding: '16px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#60a5fa' }}>🇺🇸 미국 (S&P 500 / NASDAQ 100 기준)</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>모수: 대표 100개사</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>시가총액 상위</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={settings.usMarketCapPercent}
                    onChange={(e) => handleChange('usMarketCapPercent', parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>거래량 상위</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={settings.usVolumePercent}
                    onChange={(e) => handleChange('usVolumePercent', parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>급등 종목 수</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={settings.usRiseCount}
                    onChange={(e) => handleChange('usRiseCount', parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>개</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>급락 종목 수</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={settings.usFallCount}
                    onChange={(e) => handleChange('usFallCount', parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>개</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {saveSuccessMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontSize: '0.82rem', padding: '6px 12px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '6px' }}>
            <CheckCircle2 size={16} />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <button
            onClick={handleResetDefault}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCcw size={13} />
            기본값 초기화
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSave}
              disabled={isSaving || isCollecting}
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={14} />
              {isSaving ? '저장 중...' : '설정 저장'}
            </button>
            <button
              onClick={handleSaveAndCollect}
              disabled={isSaving || isCollecting}
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', padding: '7px 18px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <RefreshCw size={14} className={isCollecting ? 'animate-spin' : ''} />
              {isCollecting ? '맞춤 수집 실행 중...' : '설정 저장 후 즉시 수집'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
