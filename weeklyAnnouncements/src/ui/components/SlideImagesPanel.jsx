import { useState, useEffect } from 'react';
import { createSlideImage, createSlidePreset } from '../../core/domain/Bulletin';
import ImagePicker from './ImagePicker';

const STORAGE_KEY = 'wa_slide_presets';

function loadSlidePresets() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveSlidePresets(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export default function SlideImagesPanel({ slideImages, onChange }) {
  const images = slideImages ?? [];
  const [presets, setPresets] = useState([]);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => { setPresets(loadSlidePresets()); }, []);
  useEffect(() => { if (presets.length > 0) saveSlidePresets(presets); }, [presets]);

  const add = () => onChange([...images, createSlideImage()]);
  const addFromPreset = p => onChange([...images, createSlideImage(p.url, p.caption)]);
  const update = (i, changes) => { const u = [...images]; u[i] = { ...u[i], ...changes }; onChange(u); };
  const remove = i => onChange(images.filter((_, j) => j !== i));
  const move = (from, to) => { if (to < 0 || to >= images.length) return; const u = [...images]; const [item] = u.splice(from, 1); u.splice(to, 0, item); onChange(u); };

  const saveAsPreset = img => {
    if (!img.url) return;
    const p = createSlidePreset(img.url, img.caption, img.caption || 'Slide');
    setPresets(ps => [...ps, p]);
  };

  const removePreset = id => setPresets(ps => ps.filter(p => p.id !== id));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 1 }}>Slide Images</div>
          <div style={{ fontSize: 10, color: '#c4a882', marginTop: 2 }}>Presentation only — not in Telegram or PDF</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowPresets(s => !s)} style={{ padding: '4px 12px', background: showPresets ? '#fdf6ec' : '#fff', border: '1.5px solid #e0cba8', borderRadius: 6, color: '#7a5230', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
            {showPresets ? 'Hide' : 'Presets'} ({presets.length})
          </button>
          <button onClick={add} style={{ padding: '4px 12px', background: 'none', border: '1.5px dashed #c9a96e', borderRadius: 6, color: '#7a5230', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>+ Add slide</button>
        </div>
      </div>

      {/* Presets panel */}
      {showPresets && (
        <div style={{ background: '#fdf6ec', border: '1.5px solid #e8d9c0', borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Saved Slide Presets</div>
          {presets.length === 0 && <div style={{ fontSize: 11, color: '#c4a882' }}>No presets yet. Save a slide as preset using the ★ button.</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {presets.map(p => (
              <div key={p.id} style={{ width: 100, background: '#fff', border: '1px solid #e8d9c0', borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }} onClick={() => addFromPreset(p)}>
                {p.url ? (
                  <div style={{ width: '100%', height: 64, background: '#f4ece0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={p.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div style={{ width: '100%', height: 64, background: '#f4ece0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 10, color: '#c4a882' }}>No img</span>
                  </div>
                )}
                <div style={{ padding: '4px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: '#5c3d1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.name}</span>
                  <button onClick={e => { e.stopPropagation(); removePreset(p.id); }} style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 10, cursor: 'pointer', padding: 0 }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {images.length === 0 && (
        <div style={{ fontSize: 12, color: '#c4a882', padding: '12px 0', textAlign: 'center', border: '1.5px dashed #e8d9c0', borderRadius: 10 }}>
          No slide images — add flyers or posters to display between schedule slides.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {images.map((img, i) => (
          <div key={img.id} style={{ background: '#fdf6ec', border: '1.5px solid #e8d9c0', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
            {img.url ? (
              <div style={{ width: '100%', aspectRatio: '4/3', background: '#f4ece0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <img src={img.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ width: '100%', aspectRatio: '4/3', background: '#f4ece0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: '#c4a882' }}>No image</span>
              </div>
            )}
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <ImagePicker value={img.url} onChange={url => update(i, { url })} />
              <input value={img.caption ?? ''} onChange={e => update(i, { caption: e.target.value })} placeholder="Caption (optional)"
                style={{ padding: '5px 8px', fontSize: 11, border: '1px solid #e0cba8', borderRadius: 5, background: '#fff', color: '#3d2408', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => move(i, i - 1)} disabled={i === 0} style={{ background: 'none', border: 'none', color: i === 0 ? '#e0cba8' : '#b0956e', fontSize: 13, cursor: i === 0 ? 'default' : 'pointer' }}>‹</button>
                  <button onClick={() => move(i, i + 1)} disabled={i === images.length - 1} style={{ background: 'none', border: 'none', color: i === images.length - 1 ? '#e0cba8' : '#b0956e', fontSize: 13, cursor: i === images.length - 1 ? 'default' : 'pointer' }}>›</button>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {img.url && <button onClick={() => saveAsPreset(img)} title="Save as preset" style={{ background: 'none', border: 'none', color: '#b8860b', fontSize: 13, cursor: 'pointer' }}>★</button>}
                  <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 11, cursor: 'pointer' }}>Remove</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}