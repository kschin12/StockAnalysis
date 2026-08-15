import React from 'react';
import { createPortal } from 'react-dom';
import type { ActiveTooltipState } from '../../utils/badgeDetails';

interface BadgeTooltipPortalProps {
  tooltip: ActiveTooltipState | null;
}

export const BadgeTooltipPortal: React.FC<BadgeTooltipPortalProps> = ({ tooltip }) => {
  if (!tooltip || typeof document === 'undefined') return null;

  const isRisk = tooltip.type === 'risk';

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: `${tooltip.x}px`,
        top: `${tooltip.y}px`,
        width: '320px',
        background: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isRisk ? 'rgba(239, 68, 68, 0.5)' : 'rgba(99, 102, 241, 0.5)'}`,
        borderRadius: '8px',
        padding: '12px 14px',
        zIndex: 999999,
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.8), 0 0 20px rgba(99, 102, 241, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        pointerEvents: 'none',
        transition: 'opacity 0.1s ease-out'
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: '0.85rem',
          color: isRisk ? '#f87171' : '#818cf8',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>{tooltip.title}</span>
        <span
          style={{
            fontSize: '0.65rem',
            padding: '1px 6px',
            borderRadius: '3px',
            background: isRisk ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
            color: isRisk ? '#fca5a5' : '#c7d2fe',
            fontWeight: 600
          }}
        >
          {isRisk ? '위험 감지' : '모멘텀 신호'}
        </span>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
        {tooltip.desc}
      </div>
      <div
        style={{
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          background: 'rgba(0, 0, 0, 0.35)',
          padding: '6px 8px',
          borderRadius: '4px',
          lineHeight: 1.4,
          borderLeft: `2px solid ${isRisk ? '#f87171' : '#818cf8'}`
        }}
      >
        <strong style={{ color: '#fff' }}>사유 및 유의사항:</strong> {tooltip.reason}
      </div>
    </div>,
    document.body
  );
};
