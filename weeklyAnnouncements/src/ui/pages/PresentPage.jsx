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

const slideAccent = {
  day: '#d4a017',
  announcement: '#c17f3a',
  contact: '#6b9fd4',
  event: '#a87fd4',
};

export default function PresentPage() {
  const [bulletins, setBulletins] = useState([]);
  const [selected, setSelected] = useState(null);
  const [index, setIndex] = useState(0);
  const [ui, setUi] = useState(true);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef(null);
  const progressRef = useRef(null);
  const startRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    repo.listPresets().then(data => {
      setBulletins(data);
      if (data.length > 0) setSelected(data[0]);
    });
  }, []);

  const total = selected?.slides.length ?? 0;

  const goTo = useCallback(i => {
    setTransitioning(true);
    setTimeout(() => { setIndex(i); setTransitioning(false); }, 300);
  }, []);

  const next = useCallback(() => goTo((index + 1) % Math.max(total, 1)), [index, total, goTo]);
  const prev = useCallback(() => { if (index > 0) goTo(index - 1); }, [index, goTo]);

  useEffect(() => {
    if (!selected || paused || total === 0) return;
    const slide = selected.slides[index];
    const duration = slideDuration(slide);
    setProgress(0);
    startRef.current = Date.now();
    clearInterval(progressRef.current);
    clearTimeout(timerRef.current);
    progressRef.current = setInterval(() => {
      setProgress(Math.min(((Date.now() - startRef.current) / duration) * 100, 100));
    }, 50);
    timerRef.current = setTimeout(() => { clearInterval(progressRef.current); next(); }, duration);
    return () => { clearTimeout(timerRef.current); clearInterval(progressRef.current); };
  }, [index, selected, paused, next, total]);

  useEffect(() => {
    const h = e => {
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'h') setUi(u => !u);
      if (e.key === 'p') setPaused(p => !p);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [next, prev]);

  const enterFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  };

  const slide = selected?.slides[index];
  const accent = slide ? (slideAccent[slide.type] ?? '#d4a017') : '#d4a017';

  return (
    <div ref={containerRef} style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#0a0804', color: '#fff', userSelect: 'none', overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#1a1410', flexShrink: 0 }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: `linear-gradient(to right, ${accent}aa, ${accent})`,
          transition: 'width 0.05s linear',
        }} />
      </div>

      {/* Top bar */}
      {ui && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 24px', background: '#0f0c08',
          borderBottom: '1px solid #1f1810', flexShrink: 0, flexWrap: 'wrap',
        }}>
          <span style={{ color: '#d4a017', fontSize: 16, marginRight: 4 }}>✝</span>
          <span style={{ color: '#3a2e20', fontSize: 11, letterSpacing: 1 }}>{CHURCH_NAME}</span>
          <div style={{ width: 1, height: 16, background: '#2a2010', margin: '0 4px' }} />
          {bulletins.map(b => (
            <button key={b.id} onClick={() => { setSelected(b); setIndex(0); }} style={{
              padding: '4px 12px', borderRadius: 6, border: 'none', fontSize: 12, cursor: 'pointer',
              background: selected?.id === b.id ? '#2a1f0a' : 'transparent',
              color: selected?.id === b.id ? '#d4a017' : '#3d3020',
              fontWeight: selected?.id === b.id ? 600 : 400,
              outline: selected?.id === b.id ? '1px solid #d4a01744' : 'none',
            }}>{b.presetName}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => setPaused(p => !p)} style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid #2a2010',
              background: 'transparent', color: '#3d3020', fontSize: 11, cursor: 'pointer',
            }}>{paused ? '▶ Resume' : '⏸ Pause'}</button>
            <button onClick={enterFullscreen} style={{
              padding: '4px 14px', borderRadius: 6,
              border: '1px solid #d4a01744',
              background: '#2a1f0a', color: '#d4a017', fontSize: 11, cursor: 'pointer',
            }}>⛶ Fullscreen</button>
            <a href="/admin" style={{ color: '#2a2010', fontSize: 11, textDecoration: 'none' }}>Admin</a>
          </div>
        </div>
      )}

      {/* Slide area */}
      <div
        onClick={next}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 80px', cursor: 'pointer', position: 'relative',
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? 'translateY(10px)' : 'translateY(0)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 300,
          background: `radial-gradient(ellipse, ${accent}0a 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Cross watermark */}
        <div style={{
          position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
          color: '#1a1410', fontSize: 13, letterSpacing: 3,
          textTransform: 'uppercase', pointerEvents: 'none',
        }}>✝</div>

        {slide
          ? <SlideDisplay slide={slide} accent={accent} />
          : <p style={{ color: '#2a2010', fontSize: 16 }}>No bulletin loaded — go to /admin</p>
        }

        {paused && (
          <div style={{ position: 'absolute', bottom: 16, right: 20, color: '#2a2010', fontSize: 11 }}>⏸ Paused</div>
        )}
      </div>

      {/* Bottom bar */}
      {ui && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 16, padding: '14px 24px',
          background: '#0f0c08', borderTop: '1px solid #1f1810', flexShrink: 0,
        }}>
          <NavBtn onClick={prev} disabled={index === 0}>←</NavBtn>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {selected?.slides.map((s, i) => (
              <div key={i} onClick={e => { e.stopPropagation(); goTo(i); }} style={{
                width: i === index ? 24 : 6, height: 6, borderRadius: 3,
                background: i === index ? accent : '#2a2010',
                transition: 'all 0.3s', cursor: 'pointer',
              }} />
            ))}
          </div>
          <NavBtn onClick={next} disabled={index === total - 1}>→</NavBtn>
        </div>
      )}
    </div>
  );
}

function SlideDisplay({ slide, accent }) {
  const titleStyle = {
    fontFamily: 'Playfair Display, serif',
    fontSize: 'clamp(28px, 5vw, 52px)',
    color: accent,
    marginBottom: 36,
    letterSpacing: 0.5,
  };

  const divider = (
    <div style={{ width: 60, height: 2, background: `linear-gradient(to right, transparent, ${accent}, transparent)`, margin: '0 auto 36px' }} />
  );

  if (slide.type === 'day') return (
    <div style={{ textAlign: 'center', maxWidth: 900, width: '100%' }}>
      <h2 style={titleStyle}>{slide.data.day}</h2>
      {divider}
      {slide.data.items?.map((item, i) => (
        <div key={i} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 24 }}>
            <span style={{
              color: accent, fontSize: 'clamp(14px, 2vw, 20px)',
              fontWeight: 600, minWidth: 140, textAlign: 'right', opacity: 0.85,
            }}>{item.time}</span>
            <span style={{ color: '#e8dcc8', fontSize: 'clamp(18px, 3vw, 30px)', fontWeight: 400 }}>{item.label}</span>
          </div>
          {item.note && (
            <div style={{ color: '#4a3e28', fontSize: 'clamp(12px, 1.5vw, 16px)', marginTop: 6 }}>{item.note}</div>
          )}
        </div>
      ))}
    </div>
  );

  if (slide.type === 'announcement') return (
    <div style={{ textAlign: 'center', maxWidth: 860, width: '100%' }}>
      <h2 style={titleStyle}>{slide.data.title}</h2>
      {divider}
      {slide.data.items?.map((item, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 16,
          marginBottom: 20, textAlign: 'left', justifyContent: 'center',
        }}>
          <span style={{ color: accent, fontSize: 20, marginTop: 4, flexShrink: 0 }}>•</span>
          <span style={{ color: '#d4c4a8', fontSize: 'clamp(16px, 2.5vw, 26px)', lineHeight: 1.6 }}>{item}</span>
        </div>
      ))}
    </div>
  );

  if (slide.type === 'contact') return (
    <div style={{ textAlign: 'center', maxWidth: 860, width: '100%' }}>
      <h2 style={titleStyle}>{slide.data.title}</h2>
      {divider}
      {slide.data.entries?.map((e, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 20, marginBottom: 24,
          padding: '16px 32px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: 12,
          maxWidth: 600, margin: '0 auto 16px',
        }}>
          {e.role && <span style={{ color: '#4a3e28', fontSize: 14, minWidth: 120, textAlign: 'right' }}>{e.role}</span>}
          <span style={{ color: '#e8dcc8', fontSize: 'clamp(16px, 2.5vw, 24px)', fontWeight: 500 }}>{e.name}</span>
          {e.phone && <span style={{ color: accent, fontSize: 18, fontWeight: 600 }}>{e.phone}</span>}
        </div>
      ))}
    </div>
  );

  if (slide.type === 'event') return (
    <div style={{ textAlign: 'center', maxWidth: 760, width: '100%' }}>
      <h2 style={{ ...titleStyle, fontSize: 'clamp(30px, 6vw, 58px)' }}>{slide.data.title}</h2>
      {divider}
      {slide.data.subtitle && <p style={{ color: '#8a7a5a', fontSize: 'clamp(16px, 2.5vw, 26px)', marginBottom: 20 }}>{slide.data.subtitle}</p>}
      {slide.data.time && (
        <p style={{ color: accent, fontSize: 'clamp(18px, 3vw, 30px)', marginBottom: 16, fontWeight: 600 }}>
          🕐 {slide.data.time}
        </p>
      )}
      {slide.data.note && <p style={{ color: '#4a3e28', fontSize: 'clamp(13px, 1.8vw, 20px)', marginTop: 12 }}>{slide.data.note}</p>}
    </div>
  );
}

function NavBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: disabled ? 'transparent' : '#1a1410',
      color: disabled ? '#1f1810' : '#4a3e28',
      border: `1px solid ${disabled ? '#151210' : '#2a2010'}`,
      borderRadius: 8, fontSize: 16, cursor: disabled ? 'default' : 'pointer',
    }}>{children}</button>
  );
}