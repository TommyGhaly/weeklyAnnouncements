import { useState, useEffect, useCallback, useRef } from 'react';
import { FirebaseBulletinRepo } from '../../adapters/firebase/FirebaseBulletinRepo';
import { CHURCH_NAME } from '../../core/domain/Bulletin';

const repo = new FirebaseBulletinRepo();

const slideDuration = slide => {
  const base = 6000;
  const perItem = 3000;
  switch (slide.type) {
    case 'day': return base + (slide.data.items?.length ?? 0) * perItem;
    case 'announcement': return base + (slide.data.items?.length ?? 0) * perItem;
    case 'contact': return base + (slide.data.entries?.length ?? 0) * perItem;
    case 'event': return base + 2000;
    default: return base;
  }
};

export default function PresentPage() {
  const [bulletins, setBulletins] = useState([]);
  const [selected, setSelected] = useState(null);
  const [index, setIndex] = useState(0);
  const [ui, setUi] = useState(true);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const progressRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    repo.listPresets().then(data => {
      setBulletins(data);
      if (data.length > 0) setSelected(data[0]);
    });
  }, []);

  const total = selected?.slides.length ?? 0;
  const next = useCallback(() => setIndex(i => (i + 1) % Math.max(total, 1)), [total]);
  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);

  // Auto-advance + progress bar
  useEffect(() => {
    if (!selected || paused || total === 0) return;
    const slide = selected.slides[index];
    const duration = slideDuration(slide);
    setProgress(0);
    startRef.current = Date.now();

    clearInterval(progressRef.current);
    clearTimeout(timerRef.current);

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setProgress(Math.min((elapsed / duration) * 100, 100));
    }, 50);

    timerRef.current = setTimeout(() => {
      clearInterval(progressRef.current);
      next();
    }, duration);

    return () => { clearTimeout(timerRef.current); clearInterval(progressRef.current); };
  }, [index, selected, paused, next, total]);

  useEffect(() => {
    const h = e => {
      if (e.key === 'ArrowRight' || e.key === ' ') { next(); }
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'h') setUi(u => !u);
      if (e.key === 'p') setPaused(p => !p);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [next, prev]);

  const slide = selected?.slides[index];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#000', color: '#fff', userSelect: 'none', overflow: 'hidden' }}>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#111', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: '#b8860b', transition: 'width 0.05s linear' }} />
      </div>

      {/* Top bar */}
      {ui && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', background: '#0d0d0d', borderBottom: '1px solid #1a1a1a', flexWrap: 'wrap' }}>
          <span style={{ color: '#b8860b', fontSize: 14 }}>✝</span>
          <span style={{ color: '#555', fontSize: 11, marginRight: 8 }}>{CHURCH_NAME}</span>
          {bulletins.map(b => (
            <button key={b.id} onClick={() => { setSelected(b); setIndex(0); }} style={{
              padding: '4px 12px', borderRadius: 5, border: 'none', fontSize: 12, cursor: 'pointer',
              background: selected?.id === b.id ? '#b8860b' : '#1c1c1c',
              color: selected?.id === b.id ? '#fff' : '#777',
              fontWeight: selected?.id === b.id ? 600 : 400,
            }}>{b.presetName}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ color: '#333', fontSize: 11 }}>H = hide · P = pause</span>
            <a href="/admin" style={{ color: '#444', fontSize: 11, textDecoration: 'none' }}>Admin</a>
          </div>
        </div>
      )}

      {/* Slide */}
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 80px', cursor: 'pointer', position: 'relative' }}
        onClick={next}
      >
        {/* Church name watermark */}
        <div style={{ position: 'absolute', top: 20, width: '100%', textAlign: 'center', color: '#1a1a1a', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', pointerEvents: 'none' }}>
          {CHURCH_NAME}
        </div>

        {slide ? <SlideDisplay slide={slide} /> : (
          <p style={{ color: '#333', fontSize: 16 }}>No bulletin loaded — go to /admin to create one</p>
        )}

        {/* Paused indicator */}
        {paused && (
          <div style={{ position: 'absolute', bottom: 20, right: 20, color: '#444', fontSize: 11 }}>⏸ Paused</div>
        )}
      </div>

      {/* Bottom bar */}
      {ui && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, padding: '12px 24px', background: '#0d0d0d', borderTop: '1px solid #1a1a1a' }}>
          <NavBtn onClick={prev} disabled={index === 0}>← Prev</NavBtn>
          <div style={{ display: 'flex', gap: 6 }}>
            {selected?.slides.map((_, i) => (
              <div key={i} onClick={() => setIndex(i)} style={{ width: i === index ? 20 : 6, height: 6, borderRadius: 3, background: i === index ? '#b8860b' : '#2a2a2a', transition: 'all 0.2s', cursor: 'pointer' }} />
            ))}
          </div>
          <NavBtn onClick={next} disabled={index === total - 1}>Next →</NavBtn>
        </div>
      )}
    </div>
  );
}

function SlideDisplay({ slide }) {
  const wrap = { textAlign: 'center', maxWidth: 1000, width: '100%' };
  const heading = { fontSize: 38, fontFamily: 'Playfair Display, serif', color: '#b8860b', marginBottom: 32 };

  if (slide.type === 'day') return (
    <div style={wrap}>
      <h2 style={heading}>{slide.data.day}</h2>
      {slide.data.items?.map((item, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, fontSize: 28 }}>
            <span style={{ color: '#b8860b', minWidth: 160, textAlign: 'right', fontSize: 22, paddingTop: 4 }}>{item.time}</span>
            <span style={{ color: '#eee' }}>{item.label}</span>
          </div>
          {item.note && <div style={{ fontSize: 16, color: '#555', marginTop: 4 }}>{item.note}</div>}
        </div>
      ))}
    </div>
  );

  if (slide.type === 'announcement') return (
    <div style={wrap}>
      <h2 style={heading}>{slide.data.title}</h2>
      {slide.data.items?.map((item, i) => (
        <p key={i} style={{ fontSize: 26, color: '#ddd', marginBottom: 16, lineHeight: 1.5 }}>• {item}</p>
      ))}
    </div>
  );

  if (slide.type === 'contact') return (
    <div style={wrap}>
      <h2 style={heading}>{slide.data.title}</h2>
      {slide.data.entries?.map((e, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 18, fontSize: 24 }}>
          {e.role && <span style={{ color: '#555', minWidth: 160, textAlign: 'right', fontSize: 16, paddingTop: 6 }}>{e.role}</span>}
          <span style={{ color: '#eee' }}>{e.name}</span>
          {e.phone && <span style={{ color: '#b8860b', fontSize: 20, paddingTop: 4 }}>{e.phone}</span>}
        </div>
      ))}
    </div>
  );

  if (slide.type === 'event') return (
    <div style={wrap}>
      <h2 style={{ ...heading, fontSize: 44 }}>{slide.data.title}</h2>
      {slide.data.subtitle && <p style={{ fontSize: 26, color: '#aaa', marginBottom: 16 }}>{slide.data.subtitle}</p>}
      {slide.data.time && <p style={{ fontSize: 28, color: '#b8860b', marginBottom: 12 }}>🕐 {slide.data.time}</p>}
      {slide.data.note && <p style={{ fontSize: 20, color: '#666' }}>{slide.data.note}</p>}
    </div>
  );
}

function NavBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '6px 18px', background: disabled ? '#0a0a0a' : '#1a1a1a',
      color: disabled ? '#2a2a2a' : '#777', border: '1px solid #222',
      borderRadius: 5, fontSize: 12, cursor: disabled ? 'default' : 'pointer',
    }}>{children}</button>
  );
}