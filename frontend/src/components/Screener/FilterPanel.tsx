import React, { useState } from 'react';
import type { FilterState, CustomPreset } from '../../types/stock';
import { RotateCcw, Bookmark, Save, Trash2, SlidersHorizontal, Sparkles } from 'lucide-react';

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
    <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Presets */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SlidersHorizontal size={20} color="var(--color-brand)" />
          <h3 style={{ fontSize: '1.1rem' }}>퀀트 스크리너 필터 조건</h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* 전체 종목 원클릭 조회 버튼 */}
          <button
            onClick={onResetFilters}
            className="btn btn-primary"
            style={{ fontSize: '0.82rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            title="모든 필터를 해제하고 국내외 28개 전종목을 한눈에 조회합니다."
          >
            <span>🌐</span>
            <strong>전체 종목 한번에 보기</strong>
          </button>

          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '6px' }}>추천 프리셋:</span>
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => onApplyPreset(p)}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title={p.description}
            >
              <Sparkles size={12} color="#818cf8" />
              {p.name}
              {p.id.startsWith('custom-') && (
                <Trash2
                  size={12}
                  color="#f43f5e"
                  style={{ marginLeft: '4px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePreset(p.id);
                  }}
                />
              )}
            </button>
          ))}

          <button
            onClick={() => setIsSaving(!isSaving)}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '5px 10px' }}
          >
            <Bookmark size={13} />
            현재 조건 저장
          </button>

          <button
            onClick={onResetFilters}
            className="btn btn-ghost"
            style={{ fontSize: '0.8rem', padding: '5px 10px' }}
            title="필터 조건을 초기화합니다."
          >
            <RotateCcw size={13} />
            초기화
          </button>
        </div>
      </div>

      {/* Save Preset Form */}
      {isSaving && (
        <form onSubmit={handleSaveSubmit} style={{
          padding: '14px',
          background: 'var(--bg-input)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-accent)',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="프리셋 이름 (예: 나만의 퀀트)"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            style={{ flex: '1 1 200px' }}
            required
          />
          <input
            type="text"
            placeholder="설명 (선택)"
            value={presetDesc}
            onChange={(e) => setPresetDesc(e.target.value)}
            style={{ flex: '2 1 300px' }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>
            <Save size={14} /> 저장
          </button>
          <button type="button" onClick={() => setIsSaving(false)} className="btn btn-ghost">
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
