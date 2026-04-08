import { useState } from 'react';
import { useAppConfig } from '../../hooks/useAppConfig';
import { autoSec, fmtSec } from '../../utils/slideUtils';

/**
 * Inline duration override chip.
 * Props:
 *   type       — 'day' | 'ann' | 'multi' | 'img'
 *   items      — number of content items (events, announcements, etc.)
 *   value      — current override in seconds (null = auto)
 *   onChange   — (seconds | null) => void
 */
export default function DurationChip({ type, items = 0, value, onChange }) {
  const { config } = useAppConfig();
  const baseline   = config.slideBaseline   ?? 10;
  const multiplier = config.slideMultiplier ?? 0.4;
  const auto       = autoSec(type, items, baseline, multiplier);
  const isOverride = value != null;
  const effective  = isOverride ? value : auto;
  const [editing, setEditing] = useState(false);

  const commit = raw => {
    const n = parseInt(raw, 10);
    if (!raw || isNaN(n) || n <= 0) { onChange(null); }
    else { onChange(Math.min(120, Math.max(1, n))); }
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <input
          type="number" min={1} max={120} defaultValue={effective}
          autoFocus
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(e.target.value); if (e.key === 'Escape') setEditing(false); }}
          style={{
            width: 52, padding: '2px 6px', fontSize: 11, textAlign: 'center',
            border: `1.5px solid ${isOverride ? '#b8860b' : '#e0cba8'}`,
            borderRadius: 5, background: '#fff', color: '#3d2408', outline: 'none',
          }}
        />
        <span style={{ fontSize: 10, color: '#b0956e' }}>s</span>
        {isOverride && (
          <button onClick={() => { onChange(null); setEditing(false); }}
            style={{ background: 'none', border: 'none', color: '#b8860b', fontSize: 13, cursor: 'pointer', padding: 0, lineHeight: 1 }}>↺</button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title={isOverride ? `Override: ${fmtSec(effective)} — click to edit` : `Auto: ${fmtSec(auto)} — click to override`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 20, cursor: 'pointer',
        border: `1px solid ${isOverride ? '#e8c87a' : '#e0cba8'}`,
        background: isOverride ? '#fffbf0' : '#f8f4ee',
        fontSize: 10, fontWeight: isOverride ? 700 : 400,
        color: isOverride ? '#b8860b' : '#b0956e',
        transition: 'all 0.15s',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 9 }}>⏱</span>
      <span>{isOverride ? fmtSec(effective) : `auto ${fmtSec(auto)}`}</span>
      {isOverride && <span style={{ fontSize: 9, opacity: 0.6 }}>✎</span>}
    </button>
  );
}