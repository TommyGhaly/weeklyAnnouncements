import { useState } from 'react';

const primaryBtn   = { padding: '7px 18px', background: 'linear-gradient(135deg, #b8860b, #d4a017)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const secondaryBtn = { padding: '7px 14px', background: '#fff', border: '1.5px solid #e0cba8', borderRadius: 8, fontSize: 13, color: '#7a5230', cursor: 'pointer' };
const linkBtn      = { background: 'none', border: 'none', padding: '2px 4px', fontSize: 11, fontWeight: 600, color: '#b8860b', cursor: 'pointer', flexShrink: 0 };
const checkbox     = { width: 15, height: 15, margin: '2px 0 0', flexShrink: 0, accentColor: '#b8860b', cursor: 'inherit' };
// Long announcements are truncated to 3 lines so one entry can't dominate the list.
const clamp3       = { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' };

// Pick announcements from sessions. Callers make fresh copies of what's picked, so sources stay untouched.
// `existing` is the destination list — entries with matching text are shown as already there.
export default function CopyAnnouncementsPanel({ sessions, existing, onCopy, onCancel, title = 'Copy announcements from another session', copyVerb = 'Copy' }) {
  const [selected, setSelected] = useState(() => new Set());
  const have = new Set(existing.map(a => a.text?.trim()).filter(Boolean));
  const isDup = a => have.has(a.text?.trim());
  const sources = sessions
    .map(s => ({ s, anns: (s.announcements ?? []).filter(a => a.text?.trim() || a.image) }))
    .filter(x => x.anns.length > 0);

  const toggle = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectable = anns => anns.filter(a => !isDup(a)).map(a => a.id);
  const allOn = anns => { const ids = selectable(anns); return ids.length > 0 && ids.every(id => selected.has(id)); };
  const toggleAll = anns => setSelected(prev => {
    const ids = selectable(anns);
    const on = ids.every(id => prev.has(id));
    const n = new Set(prev);
    ids.forEach(id => on ? n.delete(id) : n.add(id));
    return n;
  });
  const picked = sources.flatMap(x => x.anns).filter(a => selected.has(a.id));

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e0cba8', borderRadius: 12, marginBottom: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(122,82,48,0.08)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 14px', background: '#fdf6ec', borderBottom: '1px solid #f0e2cc' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#3d2408' }}>{title}</div>
        <button onClick={onCancel} aria-label="Close" style={{ ...linkBtn, fontSize: 14, color: '#b0956e', fontWeight: 400 }}>✕</button>
      </div>

      {/* Session groups */}
      <div style={{ maxHeight: 360, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sources.length === 0 && (
          <div style={{ fontSize: 12, color: '#b0956e', textAlign: 'center', padding: '16px 0' }}>No sessions have announcements to copy.</div>
        )}
        {sources.map(({ s, anns }) => {
          const canSelect = selectable(anns).length > 0;
          return (
            // flexShrink 0: overflow:hidden drops a flex item's min-height to 0, so without it the
            // cards squash to fit the scroll area (clipping their rows) instead of overflowing it.
            <div key={s.id} style={{ border: '1px solid #f0e2cc', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', background: '#fffaf3', borderBottom: '1px solid #f0e2cc' }}>
                <div style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#3d2408' }}>{s.label ?? s.presetName ?? 'Untitled'}</span>
                  {s.weekLabel && <span style={{ fontSize: 11, color: '#b0956e' }}>{s.weekLabel}</span>}
                  <span style={{ fontSize: 10, color: '#c4a882' }}>· {anns.length}</span>
                </div>
                {canSelect && (
                  <button onClick={() => toggleAll(anns)} style={linkBtn}>{allOn(anns) ? 'Clear' : 'Select all'}</button>
                )}
              </div>

              {anns.map((a, i) => {
                const dup = isDup(a);
                const on = selected.has(a.id);
                return (
                  <label key={a.id} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 12px',
                    borderTop: i ? '1px solid #f5ecdf' : 'none',
                    background: on ? '#fdf3e2' : '#fff',
                    cursor: dup ? 'default' : 'pointer', opacity: dup ? 0.55 : 1, transition: 'background 0.15s',
                  }}>
                    <input type="checkbox" disabled={dup} checked={on} onChange={() => toggle(a.id)} style={checkbox} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: '#3d2408', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', ...clamp3 }}>
                        {a.text || <em style={{ color: '#b0956e' }}>Image only</em>}
                      </div>
                      {dup && (
                        <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 600, color: '#7a5230', background: '#f3e6d1', borderRadius: 999, padding: '1px 8px' }}>Already added</span>
                      )}
                    </div>
                    {a.image && <img src={a.image} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: '1px solid #f0e2cc' }} />}
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', borderTop: '1px solid #f0e2cc', background: '#fffaf3' }}>
        <span style={{ fontSize: 11, color: '#b0956e', flex: 1 }}>{picked.length ? `${picked.length} selected` : 'Nothing selected'}</span>
        <button onClick={onCancel} style={secondaryBtn}>Cancel</button>
        <button onClick={() => onCopy(picked)} disabled={!picked.length} style={{ ...primaryBtn, opacity: picked.length ? 1 : 0.5, cursor: picked.length ? 'pointer' : 'default' }}>
          {copyVerb}{picked.length ? ` ${picked.length}` : ''}
        </button>
      </div>
    </div>
  );
}
