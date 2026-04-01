import { useState, useEffect, useCallback, useRef } from 'react';
import { FirebaseBulletinRepo } from '../../adapters/firebase/FirebaseBulletinRepo';
import { CHURCH_NAME } from '../../core/domain/Bulletin';

const repo = new FirebaseBulletinRepo();

const slideDuration = slide => {
  const base = 6000;
  const perItem = 3000;
  switch (slide.type) {
    case 'day': return base + (slide.data.events?.length ?? 0) * perItem;
    case 'multiday': return base + (slide.data.length ?? 0) * perItem;
    case 'announcements': return base + (slide.data.length ?? 0) * perItem;
    default: return base;
  }
};

const slideAccent = {
  day: '#d4a017',
  multiday: '#a87fd4',
  announcements: '#6b9fd4',
};

function buildSlides(bulletin) {
  const slides = [];

  // Multi-day events slide
  const multiDay = bulletin.multiDayEvents ?? [];
  if (multiDay.length > 0) slides.push({ type: 'multiday', data: multiDay });

  // Announcements slide
  const announcements = (bulletin.announcements ?? []).filter(a => a.text?.trim());
  if (announcements.length > 0) slides.push({ type: 'announcements', data: announcements });

  // Daily slides
  (bulletin.days ?? [])
    .filter(d => d.events?.length > 0)
    .forEach(d => slides.push({ type: 'day', data: d }));

  return slides;
}

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

  const slides = selected ? buildSlides(selected) : [];
  const total = slides.length;

  const goTo = useCallback(i => {
    setTransitioning(true);
    setTimeout(() => { setIndex(i); setTransitioning(false); }, 300);
  }, []);

  const next = useCallback(() => goTo((index + 1) % Math.max(total, 1)), [index, total, goTo]);
  const prev = useCallback(() => { if (index > 0) goTo(index - 1); }, [index, goTo]);

  useEffect(() => {
    if (!selected || paused || total === 0) return;
    const slide = slides[index];
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

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const slide = slides[index];
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
            <button onClick={toggleFullscreen} style={{
              padding: '4px 14px', borderRadius: 6,
              border: '1px solid #d4a01744',
              background: '#2a1f0a', color: '#d4a017', fontSize: 11, cursor: 'pointer',
            }}>            {isFullscreen ? '⊠ Exit fullscreen' : '⛶ Fullscreen'}</button>
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
          padding: '32px 80px', cursor: 'pointer', position: 'relative',
          overflow: 'hidden',
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
            {slides.map((s, i) => (
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
  const { data } = slide;

  if (slide.type === 'announcements') return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '28px 56px 20px', borderBottom: `1px solid ${accent}30`, flexShrink: 0 }}>
        <div style={{ fontSize: 'clamp(40px, 7vw, 80px)', fontFamily: 'Playfair Display, serif', fontWeight: 600, color: accent, lineHeight: 1 }}>
          Announcements
        </div>
      </div>
      <div style={{ flex: 1, padding: '24px 56px', display: 'flex', flexDirection: 'column', justifyContent: data.length <= 3 ? 'center' : 'space-evenly', gap: 8, overflow: 'hidden' }}>
        {data.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <span style={{ color: accent, fontSize: 'clamp(18px, 2.5vw, 28px)', flexShrink: 0, marginTop: 4 }}>•</span>
            <span style={{ color: '#e8dcc8', fontSize: 'clamp(16px, 2.5vw, 30px)', lineHeight: 1.5 }}>{a.text}</span>
          </div>
        ))}
      </div>
      <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${accent}33, transparent)`, margin: '0 40px 16px', flexShrink: 0 }} />
    </div>
  );

  if (slide.type === 'multiday') return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '28px 56px 20px', borderBottom: `1px solid ${accent}30`, flexShrink: 0 }}>
        <div style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontFamily: 'Playfair Display, serif', fontWeight: 600, color: accent, lineHeight: 1 }}>
          Upcoming Events
        </div>
      </div>
      <div style={{ flex: 1, padding: '20px 40px', display: 'flex', flexDirection: 'column', gap: 12, justifyContent: data.length <= 2 ? 'center' : 'space-evenly', overflow: 'hidden' }}>
        {data.map((e, i) => {
          const color = e.color ?? accent;
          const startFmt = e.startDate ? new Date(e.startDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' }) : '';
          const endFmt = e.endDate && e.endDate !== e.startDate ? new Date(e.endDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' }) : '';
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'stretch',
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid rgba(255,255,255,0.06)`,
              borderLeft: `4px solid ${color}`,
              borderRadius: 12, overflow: 'hidden',
              flex: 1, maxHeight: data.length <= 2 ? 180 : 'none',
            }}>
              {e.image && (
                <div style={{ width: 'clamp(80px, 10vw, 140px)', flexShrink: 0, background: '#0a0804', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img src={e.image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              )}
              <div style={{ flex: 1, padding: 'clamp(12px, 2vw, 24px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                <div style={{ fontSize: 'clamp(18px, 2.8vw, 36px)', fontFamily: 'Playfair Display, serif', fontWeight: 600, color: '#fff' }}>{e.name}</div>
                {e.notes && <div style={{ fontSize: 'clamp(12px, 1.4vw, 18px)', color: '#9a8a6a' }}>{e.notes}</div>}
                {(e.contacts ?? []).length > 0 && (
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {e.contacts.map((c, j) => (
                      <span key={j} style={{ fontSize: 'clamp(11px, 1.2vw, 16px)', color: '#7a6a4a' }}>
                        {c.name}{c.phone && <span style={{ color: '#ccc', marginLeft: 6 }}>{c.phone}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {/* Date range — right column */}
              <div style={{
                padding: 'clamp(16px, 2.5vw, 32px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, flexShrink: 0, minWidth: 'clamp(180px, 22vw, 300px)',
                borderLeft: '1px solid rgba(255,255,255,0.05)',
                background: `${color}0d`,
              }}>
                {startFmt && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6a5a3a', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                      {endFmt ? 'Starts' : 'Date'}
                    </div>
                    <div style={{ fontSize: 'clamp(14px, 2vw, 26px)', fontWeight: 700, color: '#fff', lineHeight: 1.2, textAlign: 'center' }}>{startFmt}</div>
                  </div>
                )}
                {endFmt && (
                  <>
                    <div style={{ width: 24, height: 1, background: `${color}44` }} />
                    <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6a5a3a', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Ends</div>
                    <div style={{ fontSize: 'clamp(14px, 2vw, 26px)', fontWeight: 700, color: '#fff', lineHeight: 1.2, textAlign: 'center' }}>{endFmt}</div>
                    </div>
                  </>
                )}
                {e.time && (
                  <div style={{ marginTop: 4, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6a5a3a', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Daily</div>
                    <div style={{ fontSize: 'clamp(12px, 1.6vw, 20px)', color: '#ccc' }}>
                      {e.time}{e.timeTo ? ` – ${e.timeTo}` : ''}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${accent}33, transparent)`, margin: '0 40px 16px', flexShrink: 0 }} />
    </div>
  );

  // Day slide
  const events = data.events ?? [];
  const dateLabel = data.date
    ? new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : null;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '28px 56px 24px', borderBottom: `1px solid ${accent}30`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 'clamp(48px, 8vw, 96px)', fontFamily: 'Playfair Display, serif', fontWeight: 600, color: accent, lineHeight: 1, letterSpacing: -1 }}>{data.day}</div>
          {dateLabel && <div style={{ fontSize: 'clamp(14px, 1.8vw, 22px)', color: '#4a3e28', marginTop: 6, letterSpacing: 2, textTransform: 'uppercase' }}>{dateLabel}</div>}
        </div>
        <div style={{ fontSize: 'clamp(32px, 5vw, 64px)', color: `${accent}22`, fontFamily: 'Playfair Display, serif', lineHeight: 1 }}>✝</div>
      </div>

      <div style={{ flex: 1, padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: events.length <= 2 ? 'center' : 'space-evenly', overflow: 'hidden' }}>
        {events.map((event, i) => {
          const color = event.color ?? accent;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'stretch', gap: 0,
              background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.06)`,
              borderLeft: `4px solid ${color}`, borderRadius: 12, overflow: 'hidden',
              minHeight: events.length <= 2 ? 100 : 70, flex: 1,
              maxHeight: events.length <= 2 ? 200 : 'none',
            }}>
              {/* Image — natural dimensions, no crop */}
              {event.image && (
                <div style={{ width: 'clamp(80px, 10vw, 140px)', flexShrink: 0, background: '#0a0804', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img src={event.image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              )}
              <div style={{ flex: 1, padding: 'clamp(12px, 2vw, 24px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                <div style={{ fontSize: 'clamp(18px, 3vw, 38px)', fontFamily: 'Playfair Display, serif', fontWeight: 600, color: '#f0e4cc', lineHeight: 1.1 }}>{event.name}</div>
                {event.notes && <div style={{ fontSize: 'clamp(12px, 1.4vw, 18px)', color: '#4a3e28', lineHeight: 1.4 }}>{event.notes}</div>}
                {(event.contacts ?? []).length > 0 && (
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 2 }}>
                    {event.contacts.map((c, j) => (
                      <span key={j} style={{ fontSize: 'clamp(11px, 1.2vw, 16px)', color: '#5a4a30' }}>
                        {c.name}{c.phone && <span style={{ color, marginLeft: 6 }}>{c.phone}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {(event.time || event.timeTo) && (
                <div style={{ padding: 'clamp(12px, 2vw, 24px)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 4, flexShrink: 0, minWidth: 'clamp(100px, 14vw, 200px)', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                  {event.time && <div style={{ fontSize: 'clamp(14px, 2vw, 26px)', fontWeight: 700, color, lineHeight: 1 }}>{event.time}</div>}
                  {event.timeTo && <>
                    <div style={{ fontSize: 10, color: '#3a2e1a' }}>→</div>
                    <div style={{ fontSize: 'clamp(13px, 1.8vw, 22px)', fontWeight: 600, color: `${color}bb`, lineHeight: 1 }}>{event.timeTo}</div>
                  </>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${accent}33, transparent)`, margin: '0 40px 16px', flexShrink: 0 }} />
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