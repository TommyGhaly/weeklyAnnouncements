import { useState, useEffect, useCallback } from 'react';
import { FirebaseBulletinRepo } from '../../adapters/firebase/FirebaseBulletinRepo';

const repo = new FirebaseBulletinRepo();

export default function PresentPage() {
  const [bulletins, setBulletins] = useState([]);
  const [selected, setSelected] = useState(null);
  const [index, setIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    repo.listPresets().then(data => {
      setBulletins(data);
      if (data.length > 0) setSelected(data[0]);
    });
  }, []);

  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex(i => Math.min((selected?.slides.length ?? 1) - 1, i + 1)), [selected]);

  useEffect(() => {
    const handler = e => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  const slide = selected?.slides[index];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#111', color: '#fff' }}>

      {/* Bulletin selector */}
      {!isFullscreen && (
        <div style={{ padding: '12px 24px', display: 'flex', gap: 12, alignItems: 'center', background: '#1a1a1a' }}>
          {bulletins.map(b => (
            <button
              key={b.id}
              onClick={() => { setSelected(b); setIndex(0); }}
              style={{
                padding: '6px 14px', borderRadius: 6, cursor: 'pointer', border: 'none',
                background: selected?.id === b.id ? '#4a90d9' : '#333', color: '#fff'
              }}
            >
              {b.presetName}
            </button>
          ))}
          <button
            onClick={() => setIsFullscreen(true)}
            style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', background: '#27ae60', color: '#fff', border: 'none' }}
          >
            Fullscreen
          </button>
        </div>
      )}

      {/* Slide display */}
      <div
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}
        onClick={next}
      >
        {slide ? <SlideDisplay slide={slide} /> : <p style={{ color: '#555' }}>No bulletin loaded</p>}
      </div>

      {/* Controls */}
      <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, background: '#1a1a1a' }}>
        <button onClick={prev} disabled={index === 0} style={ctrlBtn}>← Prev</button>
        <span style={{ color: '#888' }}>{index + 1} / {selected?.slides.length ?? 0}</span>
        <button onClick={next} disabled={index === (selected?.slides.length ?? 1) - 1} style={ctrlBtn}>Next →</button>
        {isFullscreen && (
          <button onClick={() => setIsFullscreen(false)} style={{ ...ctrlBtn, marginLeft: 24 }}>Exit</button>
        )}
      </div>
    </div>
  );
}

function SlideDisplay({ slide }) {
  const base = { textAlign: 'center', maxWidth: 900, width: '100%' };

  if (slide.type === 'schedule') return (
    <div style={base}>
      <h2 style={{ fontSize: 36, marginBottom: 32 }}>Schedule</h2>
      {slide.data.items?.map((item, i) => (
        <p key={i} style={{ fontSize: 28, marginBottom: 16 }}>
          <span style={{ color: '#4a90d9', marginRight: 16 }}>{item.time}</span>
          {item.label}
        </p>
      ))}
    </div>
  );

  if (slide.type === 'announcement') return (
    <div style={base}>
      <h2 style={{ fontSize: 36, marginBottom: 32 }}>Announcements</h2>
      {slide.data.items?.map((item, i) => (
        <p key={i} style={{ fontSize: 26, marginBottom: 16 }}>• {item}</p>
      ))}
    </div>
  );

  if (slide.type === 'image') return (
    <div style={base}>
      <img src={slide.data.url} alt="slide" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }} />
    </div>
  );

  if (slide.type === 'custom') return (
    <div style={base}>
      <h2 style={{ fontSize: 36, marginBottom: 24 }}>{slide.data.title}</h2>
      <p style={{ fontSize: 24, lineHeight: 1.7, color: '#ccc' }}>{slide.data.body}</p>
    </div>
  );
}

const ctrlBtn = {
  padding: '8px 20px', borderRadius: 6, cursor: 'pointer',
  background: '#333', color: '#fff', border: 'none', fontSize: 14
};