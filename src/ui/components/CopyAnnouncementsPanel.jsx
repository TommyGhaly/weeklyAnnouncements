import { useState } from 'react';

const iconBtn      = color => ({ background: 'none', border: 'none', color, fontSize: 13, cursor: 'pointer', padding: '3px 5px', borderRadius: 4, lineHeight: 1, flexShrink: 0 });
const primaryBtn   = { padding: '7px 18px', background: 'linear-gradient(135deg, #b8860b, #d4a017)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const secondaryBtn = { padding: '7px 14px', background: '#fff', border: '1.5px solid #e0cba8', borderRadius: 8, fontSize: 13, color: '#7a5230', cursor: 'pointer' };

// Pick announcements from sessions. Callers make fresh copies of what's picked, so sources stay untouched.
// `existing` is the destination list — entries with matching text are shown as already there.
export default function CopyAnnouncementsPanel({ sessions, existing, onCopy, onCancel, title = 'Copy announcements from another session', copyVerb = 'Copy' }) {
  const [selected, setSelected] = useState(() => new Set());
  const have = new Set(existing.map(a => a.text?.trim()).filter(Boolean));
  const sources = sessions
    .map(s => ({ s, anns: (s.announcements ?? []).filter(a => a.text?.trim() || a.image) }))
    .filter(x => x.anns.length > 0);

  const toggle = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = anns => setSelected(prev => {
    const ids = anns.filter(a => !have.has(a.text?.trim())).map(a => a.id);
    const allOn = ids.every(id => prev.has(id));
    const n = new Set(prev);
    ids.forEach(id => allOn ? n.delete(id) : n.add(id));
    return n;
  });
  const picked = sources.flatMap(x => x.anns).filter(a => selected.has(a.id));

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e0cba8', borderRadius: 10, padding: 12, marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{title}</div>
      {sources.length === 0 && <div style={{ fontSize: 12, color: '#c4a882', marginBottom: 8 }}>No sessions have announcements to copy.</div>}
      <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sources.map(({ s, anns }) => (
          <div key={s.id}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#3d2408' }}>
                {s.label ?? s.presetName ?? 'Untitled'}{s.weekLabel && <span style={{ fontWeight: 400, color: '#b0956e' }}> · {s.weekLabel}</span>}
              </div>
              <button onClick={() => toggleAll(anns)} style={{ ...iconBtn('#b8860b'), fontSize: 11 }}>Select all</button>
            </div>
            {anns.map(a => {
              const dup = have.has(a.text?.trim());
              return (
                <label key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 8px', borderRadius: 6, background: selected.has(a.id) ? '#fdf6ec' : 'transparent', cursor: dup ? 'default' : 'pointer', opacity: dup ? 0.5 : 1 }}>
                  <input type="checkbox" disabled={dup} checked={selected.has(a.id)} onChange={() => toggle(a.id)} style={{ marginTop: 3, accentColor: '#b8860b' }} />
                  {a.image && <img src={a.image} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />}
                  <span style={{ fontSize: 12, color: '#3d2408', whiteSpace: 'pre-wrap', flex: 1 }}>
                    {a.text || <em style={{ color: '#b0956e' }}>(image only)</em>}
                    {dup && <span style={{ fontSize: 10, color: '#b0956e' }}> — already here</span>}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
        <button onClick={onCancel} style={secondaryBtn}>Cancel</button>
        <button onClick={() => onCopy(picked)} disabled={!picked.length} style={{ ...primaryBtn, opacity: picked.length ? 1 : 0.5, cursor: picked.length ? 'pointer' : 'default' }}>
          {copyVerb} {picked.length || ''} {picked.length === 1 ? 'announcement' : 'announcements'}
        </button>
      </div>
    </div>
  );
}
