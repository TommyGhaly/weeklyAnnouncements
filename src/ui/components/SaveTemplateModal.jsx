import { useState } from 'react';

export default function SaveTemplateModal({ open, defaultName, sourceTemplateId, templates, onSave, onClose }) {
  const [name, setName] = useState(defaultName ?? '');
  const [mode, setMode] = useState('new'); // 'new' | 'overwrite'
  const [overwriteId, setOverwriteId] = useState(sourceTemplateId ?? '');

  if (!open) return null;

  const sourceTemplate = templates.find(t => t.id === sourceTemplateId);
  const canOverwrite = sourceTemplate || templates.length > 0;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <style>{`@keyframes slideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 20, width: '90%', maxWidth: 440,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '1.5px solid #e8d9c0',
        animation: 'slideUp 0.2s ease', overflow: 'hidden',
      }}>
        <div style={{ background: 'linear-gradient(135deg, #2e1a08, #5c3d1e)', padding: '20px 28px' }}>
          <div style={{ color: '#d4a017', fontSize: 14, fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>Save as Template</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>Dates will be converted to relative offsets</div>
        </div>

        <div style={{ padding: '20px 28px' }}>
          {/* Mode selection */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => setMode('new')} style={{
              flex: 1, padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: mode === 'new' ? '#fdf6ec' : '#fff',
              border: mode === 'new' ? '1.5px solid #b8860b' : '1.5px solid #e8d9c0',
              color: mode === 'new' ? '#b8860b' : '#5c3d1e',
            }}>New Template</button>
            {canOverwrite && (
              <button onClick={() => setMode('overwrite')} style={{
                flex: 1, padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: mode === 'overwrite' ? '#fdf6ec' : '#fff',
                border: mode === 'overwrite' ? '1.5px solid #b8860b' : '1.5px solid #e8d9c0',
                color: mode === 'overwrite' ? '#b8860b' : '#5c3d1e',
              }}>Overwrite Existing</button>
            )}
          </div>

          {mode === 'new' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#b0956e', fontWeight: 600, marginBottom: 6 }}>Template Name</div>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Regular Week, Fasting Week..."
                autoFocus
                style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1.5px solid #e0cba8', borderRadius: 8, background: '#fff', color: '#3d2408', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {mode === 'overwrite' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#b0956e', fontWeight: 600, marginBottom: 6 }}>Select Template to Overwrite</div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {templates.map(t => (
                  <div
                    key={t.id}
                    onClick={() => { setOverwriteId(t.id); setName(t.name); }}
                    style={{
                      padding: '10px 14px', borderRadius: 8, marginBottom: 6, cursor: 'pointer',
                      border: overwriteId === t.id ? '1.5px solid #b8860b' : '1.5px solid #e8d9c0',
                      background: overwriteId === t.id ? '#fdf6ec' : '#fff',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: overwriteId === t.id ? 700 : 500, color: '#3d2408' }}>{t.name}</div>
                  </div>
                ))}
              </div>
              {overwriteId && (
                <div style={{ fontSize: 11, color: '#c0392b', marginTop: 8, background: '#fdf0ed', padding: '8px 12px', borderRadius: 6, border: '1px solid #f5c6cb' }}>
                  ⚠️ This will replace the existing template's contents.
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '8px 18px', background: '#f4ece0', border: '1px solid #e0cba8', borderRadius: 8, fontSize: 13, color: '#5c3d1e', cursor: 'pointer' }}>Cancel</button>
            <button
              onClick={() => onSave(mode, mode === 'overwrite' ? overwriteId : null, name)}
              disabled={mode === 'new' ? !name.trim() : !overwriteId}
              style={{
                padding: '8px 22px',
                background: (mode === 'new' ? name.trim() : overwriteId) ? 'linear-gradient(135deg, #b8860b, #d4a017)' : '#ccc',
                color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: (mode === 'new' ? name.trim() : overwriteId) ? 'pointer' : 'default',
              }}
            >Save Template</button>
          </div>
        </div>
      </div>
    </div>
  );
}