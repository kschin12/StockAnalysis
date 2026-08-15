import React, { useState } from 'react';
import type { FilterState, CustomPreset } from '../../types/stock';

interface FilterPanelProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  presets: CustomPreset[];
  onApplyPreset: (preset: CustomPreset) => void;
  onSavePreset: (name: string, description: string) => void;
  onDeletePreset: (id: string) => void;
  onResetFilters: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  setFilters,
  presets,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onResetFilters
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDesc, setPresetDesc] = useState('');

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetName.trim()) return;
    onSavePreset(presetName, presetDesc);
    setPresetName('');
    setPresetDesc('');
    setIsSaving(false);
  };

  return (
    <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header & Presets */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>필터 조건</h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsSaving(!isSaving)}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            조건 저장
          </button>

          <button
            onClick={onResetFilters}
            className="btn btn-ghost"
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            title="필터 조건을 초기화합니다."
          >
            초기화
          </button>
        </div>
      </div>

      {/* Preset Buttons Bar */}
      {presets.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>프리셋:</span>
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => onApplyPreset(p)}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              title={p.description}
            >
              {p.name}
              {p.id.startsWith('custom-') && (
                <span
                  style={{ marginLeft: '4px', color: '#f43f5e', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePreset(p.id);
                  }}
                >
                  ×
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Save Preset Form */}
      {isSaving && (
        <form onSubmit={handleSaveSubmit} style={{
          padding: '12px',
          background: 'var(--bg-input)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-accent)',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="프리셋 이름"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            style={{ flex: '1 1 120px', padding: '6px 10px', fontSize: '0.8rem' }}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            저장
          </button>
          <button type="button" onClick={() => setIsSaving(false)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
            취소
          </button>
        </form>
      )}

      {/* Filter Inputs Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px'
      }}>
        {/* Market */}
        <div>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            시장 (Market)
          </label>
          <select
            value={filters.market}
            onChange={(e) => setFilters(prev => ({ ...prev, market: e.target.value as any }))}
            style={{ width: '100%' }}
          >
            <option value="ALL">전체 (국내 + 미국)</option>
            <option value="KRX">국내 (KRX/KOSPI)</option>
            <option value="US">미국 (NYSE/NASDAQ)</option>
          </select>
        </div>

        {/* Asset Type */}
        <div>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            종목 구분 (Type)
          </label>
          <select
            value={filters.assetType}
            onChange={(e) => setFilters(prev => ({ ...prev, assetType: e.target.value as any }))}
            style={{ width: '100%' }}
          >
            <option value="ALL">전체 (개별주 + ETF)</option>
            <option value="STOCK">개별 보통주만</option>
            <option value="ETF">ETF만</option>
          </select>
        </div>

        {/* PER */}
        <div>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            PER (최대)
          </label>
          <input
            type="number"
            placeholder="예: 15"
            value={filters.maxPer}
            onChange={(e) => setFilters(prev => ({ ...prev, maxPer: e.target.value ? parseFloat(e.target.value) : '' }))}
            style={{ width: '100%' }}
          />
        </div>

        {/* PBR */}
        <div>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            PBR (최대)
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="예: 1.5"
            value={filters.maxPbr}
            onChange={(e) => setFilters(prev => ({ ...prev, maxPbr: e.target.value ? parseFloat(e.target.value) : '' }))}
            style={{ width: '100%' }}
          />
        </div>

        {/* ROE */}
        <div>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            ROE (최소 %)
          </label>
          <input
            type="number"
            placeholder="예: 10"
            value={filters.minRoe}
            onChange={(e) => setFilters(prev => ({ ...prev, minRoe: e.target.value ? parseFloat(e.target.value) : '' }))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Dividend Yield */}
        <div>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            배당수익률 (최소 %)
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="예: 3.0"
            value={filters.minDividend}
            onChange={(e) => setFilters(prev => ({ ...prev, minDividend: e.target.value ? parseFloat(e.target.value) : '' }))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Debt Ratio */}
        <div>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            부채비율 (최대 %)
          </label>
          <input
            type="number"
            placeholder="예: 100"
            value={filters.maxDebtRatio}
            onChange={(e) => setFilters(prev => ({ ...prev, maxDebtRatio: e.target.value ? parseFloat(e.target.value) : '' }))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Search Query */}
        <div>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            종목명 / 티커 검색
          </label>
          <input
            type="text"
            placeholder="예: 삼성전자, AAPL"
            value={filters.searchQuery}
            onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};
