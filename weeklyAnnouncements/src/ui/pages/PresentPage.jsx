import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FirebaseBulletinRepo } from '../../adapters/firebase/FirebaseBulletinRepo';
import { CHURCH_NAME } from '../../core/domain/Bulletin';

const repo = new FirebaseBulletinRepo();

const dur = s => {
  const b = 8500, p = 3200;
  if (s.type === 'day') return b + (s.data.events?.length ?? 0) * p;
  if (s.type === 'announcements') return b + (s.data.length ?? 0) * p;
  if (s.type === 'multiday') return b + (s.data.length ?? 0) * p;
  if (s.type === 'slideImage') return 9000;
  return b;
};

function buildSlides(b) {
  const s = [];
  for (const img of b.slideImages ?? []) if (img.url) s.push({ type: 'slideImage', data: img });
  const md = b.multiDayEvents ?? [];
  if (md.length) s.push({ type: 'multiday', data: md });
  const ann = (b.announcements ?? []).filter(a => a.text?.trim());
  if (ann.length) s.push({ type: 'announcements', data: ann });
  (b.days ?? []).filter(d => d.events?.length).forEach(d => s.push({ type: 'day', data: d }));
  return s;
}

const ACCENTS = { day: '#d4a017', announcements: '#4a90c4', multiday: '#8a6cbf', slideImage: '#d4a017' };

/* ═══ FULLSCREEN BG ═══ */
function Stage({ accent }) {
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    {/* warm radial base */}
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 40%, #1a140a 0%, #080604 60%, #020201 100%)` }} />
    {/* top warm wash */}
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '35%', background: `linear-gradient(180deg, ${accent}08 0%, transparent 100%)` }} />
    {/* bottom dark fade */}
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%', background: 'linear-gradient(0deg, #020201 0%, transparent 100%)' }} />
    {/* noise texture via subtle SVG */}
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.03 }}>
      <filter id="n"><feTurbulence baseFrequency="0.65" numOctaves="4" stitchTiles="stitch"/></filter>
      <rect width="100%" height="100%" filter="url(#n)"/>
    </svg>
  </div>;
}

/* ═══ TIME DISPLAY ═══ */
function TimeBlock({ time, timeTo, color, big }) {
  if (!time && !timeTo) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}>
      {time && <div style={{ fontSize: big ? 'clamp(32px, 5vw, 72px)' : 'clamp(24px, 3.5vw, 48px)', fontWeight: 800, color, lineHeight: 1, fontFamily: "'Georgia', serif", letterSpacing: -2, textShadow: `0 0 30px ${color}44` }}>{time}</div>}
      {timeTo && <>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 4, fontWeight: 300 }}>TO</div>
        <div style={{ fontSize: big ? 'clamp(24px, 3.8vw, 54px)' : 'clamp(18px, 2.6vw, 36px)', fontWeight: 600, color: `${color}66`, lineHeight: 1, fontFamily: "'Georgia', serif" }}>{timeTo}</div>
      </>}
    </div>
  );
}

/* ═══ EVENT ROW ═══ */
function EventRow({ ev, accent, big }) {
  const c = ev.color ?? accent;
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', flex: 1, minHeight: 0,
      background: `linear-gradient(135deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.008) 100%)`,
      borderRadius: 12, overflow: 'hidden', position: 'relative',
      backdropFilter: 'blur(2px)',
    }}>
      {/* left accent */}
      <div style={{ width: 4, background: c, flexShrink: 0, opacity: 0.8 }} />

      {/* image */}
      {ev.image && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, background: 'rgba(0,0,0,0.15)' }}>
          <img src={ev.image} alt="" style={{ height: '100%', width: 'auto', maxWidth: '30vw', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}

      {/* text */}
      <div style={{ flex: 1, padding: big ? 'clamp(18px, 2.5vw, 36px) clamp(24px, 3vw, 44px)' : 'clamp(12px, 1.6vw, 24px) clamp(18px, 2.4vw, 34px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, zIndex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: big ? 'clamp(30px, 5vw, 68px)' : 'clamp(22px, 3.2vw, 48px)',
          fontFamily: "'Georgia', serif", fontWeight: 700,
          color: 'rgba(255,255,255,0.92)', lineHeight: 1.05,
          textShadow: '0 2px 12px rgba(0,0,0,0.5)',
        }}>{ev.name}</div>
        {ev.notes && <div style={{ fontSize: big ? 'clamp(15px, 1.7vw, 24px)' : 'clamp(12px, 1.4vw, 18px)', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{ev.notes}</div>}
        {(ev.contacts ?? []).length > 0 && <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 2 }}>{ev.contacts.map((ct, j) => <span key={j} style={{ fontSize: 'clamp(12px, 1.3vw, 17px)', color: 'rgba(255,255,255,0.25)' }}>{ct.name}{ct.phone && <span style={{ color: c, marginLeft: 8, fontWeight: 700 }}>{ct.phone}</span>}</span>)}</div>}
      </div>

      {/* time */}
      <div style={{ padding: big ? 'clamp(18px, 2.5vw, 36px)' : 'clamp(12px, 1.6vw, 24px)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0, minWidth: 'clamp(100px, 14vw, 240px)', borderLeft: '1px solid rgba(255,255,255,0.04)', zIndex: 1 }}>
        <TimeBlock time={ev.time} timeTo={ev.timeTo} color={c} big={big} />
      </div>
    </div>
  );
}

/* ═══ SLIDE: DAY ═══ */
function DaySlide({ data, accent }) {
  const evts = data.events ?? [];
  const big = evts.length <= 2;
  const dt = data.date ? new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : null;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '32px 64px 28px', boxSizing: 'border-box' }}>
      <div style={{ flexShrink: 0, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
          <span style={{
            fontSize: 'clamp(64px, 12vw, 160px)', fontFamily: "'Georgia', serif", fontWeight: 700,
            color: 'transparent', WebkitTextStroke: `2px ${accent}`,
            lineHeight: 0.8, letterSpacing: -5,
          }}>{data.day}</span>
          {dt && <span style={{ fontSize: 'clamp(14px, 1.8vw, 22px)', color: 'rgba(255,255,255,0.2)', letterSpacing: 8, textTransform: 'uppercase', fontWeight: 300 }}>{dt}</span>}
        </div>
        <div style={{ width: 60, height: 2, background: accent, marginTop: 14, opacity: 0.6, borderRadius: 1 }} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'hidden' }}>
        {evts.map((ev, i) => <EventRow key={i} ev={ev} accent={accent} big={big} />)}
      </div>
    </div>
  );
}

/* ═══ SLIDE: ANNOUNCEMENTS ═══ */
function AnnSlide({ data, accent }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '32px 64px 28px', boxSizing: 'border-box' }}>
      <div style={{ flexShrink: 0, marginBottom: 16 }}>
        <div style={{
          fontSize: 'clamp(48px, 9vw, 120px)', fontFamily: "'Georgia', serif", fontWeight: 700,
          color: 'transparent', WebkitTextStroke: `2px ${accent}`,
          lineHeight: 0.85, letterSpacing: -3,
        }}>Announcements</div>
        <div style={{ width: 60, height: 2, background: accent, marginTop: 14, opacity: 0.6, borderRadius: 1 }} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: data.length <= 3 ? 'center' : 'flex-start', gap: 14, minHeight: 0, overflow: 'hidden' }}>
        {data.map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 24,
            flex: data.length <= 4 ? 1 : 'none', minHeight: 0,
            paddingLeft: 28, position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
            borderRadius: 12,
          }}>
            {/* accent dot */}
            <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, borderRadius: '50%', background: accent, opacity: 0.5 }} />
            {a.image && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', height: '100%' }}><img src={a.image} alt="" style={{ maxHeight: '100%', maxWidth: 'clamp(64px, 10vw, 160px)', objectFit: 'contain', borderRadius: 8 }} /></div>}
            <span style={{ fontSize: 'clamp(20px, 3.2vw, 44px)', color: 'rgba(255,255,255,0.8)', lineHeight: 1.4, fontFamily: "'Georgia', serif", fontWeight: 400 }}>{a.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ SLIDE: MULTI-DAY ═══ */
function MultiSlide({ data, accent }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '32px 64px 28px', boxSizing: 'border-box' }}>
      <div style={{ flexShrink: 0, marginBottom: 16 }}>
        <div style={{
          fontSize: 'clamp(48px, 9vw, 120px)', fontFamily: "'Georgia', serif", fontWeight: 700,
          color: 'transparent', WebkitTextStroke: `2px ${accent}`,
          lineHeight: 0.85, letterSpacing: -3,
        }}>Upcoming</div>
        <div style={{ width: 60, height: 2, background: accent, marginTop: 14, opacity: 0.6, borderRadius: 1 }} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, overflow: 'hidden' }}>
        {data.map((e, i) => {
          const c = e.color ?? accent;
          const sf = e.startDate && !isNaN(new Date(e.startDate+'T00:00:00')) ? new Date(e.startDate+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric'}) : e.startDate;
          const ef = e.endDate && e.endDate !== e.startDate && !isNaN(new Date(e.endDate+'T00:00:00')) ? new Date(e.endDate+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric'}) : null;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'stretch', flex: 1, minHeight: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.008) 100%)',
              borderRadius: 12, overflow: 'hidden', position: 'relative',
            }}>
              <div style={{ width: 4, background: c, flexShrink: 0, opacity: 0.8 }} />
              {e.image && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, background: 'rgba(0,0,0,0.15)' }}><img src={e.image} alt="" style={{ height: '100%', width: 'auto', maxWidth: '28vw', objectFit: 'contain', borderRadius: 8 }} /></div>}
              <div style={{ flex: 1, padding: 'clamp(14px, 2vw, 30px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, zIndex: 1 }}>
                <div style={{ fontSize: data.length <= 2 ? 'clamp(28px, 4.2vw, 58px)' : 'clamp(20px, 3vw, 42px)', fontFamily: "'Georgia', serif", fontWeight: 700, color: 'rgba(255,255,255,0.92)', lineHeight: 1.05, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>{e.name}</div>
                {e.notes && <div style={{ fontSize: 'clamp(12px, 1.4vw, 18px)', color: 'rgba(255,255,255,0.3)' }}>{e.notes}</div>}
              </div>
              <div style={{ padding: 'clamp(14px, 2vw, 30px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, flexShrink: 0, minWidth: 'clamp(150px, 20vw, 280px)', borderLeft: '1px solid rgba(255,255,255,0.04)', zIndex: 1 }}>
                {sf && <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: 4, marginBottom: 4 }}>{ef ? 'Starts' : 'Date'}</div>
                  <div style={{ fontSize: 'clamp(16px, 2.2vw, 28px)', fontWeight: 700, color: c, fontFamily: "'Georgia', serif" }}>{sf}</div>
                </div>}
                {ef && <><div style={{ width: 36, height: 1, background: 'rgba(255,255,255,0.06)' }} /><div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: 4, marginBottom: 4 }}>Ends</div><div style={{ fontSize: 'clamp(16px, 2.2vw, 28px)', fontWeight: 700, color: c, fontFamily: "'Georgia', serif" }}>{ef}</div></div></>}
                {e.time && <div style={{ textAlign: 'center', marginTop: 4 }}><div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: 4, marginBottom: 4 }}>Daily</div><div style={{ fontSize: 'clamp(13px, 1.6vw, 20px)', color: 'rgba(255,255,255,0.35)' }}>{e.time}{e.timeTo ? ` – ${e.timeTo}` : ''}</div></div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ SLIDE: IMAGE ═══ */
function ImgSlide({ data, accent }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 64px', boxSizing: 'border-box' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, width: '100%' }}>
        <img src={data.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12, boxShadow: '0 12px 60px rgba(0,0,0,0.5)' }} />
      </div>
      {data.caption && <div style={{ marginTop: 18, fontSize: 'clamp(16px, 2.2vw, 30px)', color: 'rgba(255,255,255,0.5)', fontFamily: "'Georgia', serif", fontStyle: 'italic', textAlign: 'center' }}>{data.caption}</div>}
    </div>
  );
}

function Slide({ slide, accent }) {
  if (!slide) return null;
  const a = ACCENTS[slide.type] ?? accent;
  if (slide.type === 'day') return <DaySlide data={slide.data} accent={a} />;
  if (slide.type === 'announcements') return <AnnSlide data={slide.data} accent={a} />;
  if (slide.type === 'multiday') return <MultiSlide data={slide.data} accent={a} />;
  if (slide.type === 'slideImage') return <ImgSlide data={slide.data} accent={a} />;
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════ */
export default function PresentPage() {
  const [bulletin, setBulletin] = useState(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFs, setIsFs] = useState(false);
  // Dual buffer: activeBuffer is 'a' or 'b', indicates which is currently visible
  const [activeBuffer, setActiveBuffer] = useState('a');
  const [bufA, setBufA] = useState(0);
  const [bufB, setBufB] = useState(1);
  const ref = useRef(null);
  const timer = useRef(null);
  const prog = useRef(null);
  const start = useRef(null);
  const unsubRef = useRef(null);

  useEffect(() => {
    const u = repo.onActiveChange(id => {
      if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
      if (!id) { setBulletin(null); return; }
      unsubRef.current = repo.onBulletinChange(id, setBulletin);
    });
    return () => { u(); if (unsubRef.current) unsubRef.current(); };
  }, []);

  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const fs = () => { if (!document.fullscreenElement) ref.current?.requestFullscreen(); else document.exitFullscreen(); };

  const slides = useMemo(() => bulletin ? buildSlides(bulletin) : [], [bulletin]);
  const total = slides.length;
  const accent = slides[index] ? (ACCENTS[slides[index].type] ?? '#d4a017') : '#d4a017';
  const hn = (bulletin?.headerNotes ?? []).filter(n => n.text?.trim());

  // Navigate: load next slide into hidden buffer, then cross-fade
  const goTo = useCallback(i => {
    const nextBuf = activeBuffer === 'a' ? 'b' : 'a';
    // Set the hidden buffer to the target slide
    if (nextBuf === 'a') setBufA(i); else setBufB(i);
    // Small delay to let the image render in hidden buffer
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setActiveBuffer(nextBuf);
        // After transition completes, update index
        setTimeout(() => setIndex(i), 600);
      });
    });
  }, [activeBuffer]);

  const next = useCallback(() => { if (total) goTo((index + 1) % total); }, [index, total, goTo]);
  const prev = useCallback(() => { if (index > 0) goTo(index - 1); }, [index, goTo]);

  // Keep visible buffer in sync with index
  useEffect(() => {
    if (activeBuffer === 'a') setBufA(index); else setBufB(index);
  }, [index]);

  // Keep hidden buffer preloaded with next slide
  useEffect(() => {
    if (!total) return;
    const ni = (index + 1) % total;
    if (activeBuffer === 'a') setBufB(ni); else setBufA(ni);
  }, [index, total, activeBuffer]);

  // Auto-advance timer
  useEffect(() => {
    if (!bulletin || paused || !total) return;
    const d = dur(slides[index]);
    setProgress(0);
    start.current = Date.now();
    clearInterval(prog.current); clearTimeout(timer.current);
    prog.current = setInterval(() => setProgress(Math.min(((Date.now() - start.current) / d) * 100, 100)), 50);
    timer.current = setTimeout(() => { clearInterval(prog.current); next(); }, d);
    return () => { clearTimeout(timer.current); clearInterval(prog.current); };
  }, [index, bulletin, paused, next, total]);

  useEffect(() => {
    const h = e => {
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'p') setPaused(p => !p);
      if (e.key === 'f') fs();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [next, prev]);

  return (
    <div ref={ref} style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#050402', color: '#fff', userSelect: 'none', overflow: 'hidden',
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif", position: 'relative',
    }}>
      <Stage accent={accent} />

      {/* thin progress line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 20, background: 'rgba(255,255,255,0.03)' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: accent, transition: 'width 0.05s linear' }} />
      </div>

      {/* minimal header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 64px', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 28, color: accent, fontFamily: "'Georgia', serif", lineHeight: 1 }}>✝</span>
          <div>
            <div style={{ fontSize: 'clamp(11px, 1.3vw, 16px)', color: 'rgba(255,255,255,0.25)', letterSpacing: 6, textTransform: 'uppercase', fontWeight: 300 }}>{CHURCH_NAME}</div>
            {hn.length > 0 && <div style={{ display: 'flex', gap: 16, marginTop: 2 }}>{hn.map((n, i) => <span key={i} style={{ fontSize: 'clamp(10px, 1.1vw, 14px)', color: 'rgba(255,255,255,0.15)', fontStyle: 'italic' }}>{hn.length > 1 ? '· ' : ''}{n.text}</span>)}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setPaused(p => !p)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)', fontSize: 11, cursor: 'pointer', padding: '4px 14px', borderRadius: 4, letterSpacing: 2 }}>{paused ? '▶' : '⏸'}</button>
          <button onClick={fs} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)', fontSize: 11, cursor: 'pointer', padding: '4px 14px', borderRadius: 4, letterSpacing: 2 }}>{isFs ? '✕' : '⛶'}</button>
        </div>
      </div>

      {/* dual-buffer slide area */}
      <div onClick={next} style={{ flex: 1, position: 'relative', cursor: 'pointer', overflow: 'hidden', minHeight: 0, zIndex: 5 }}>
        {!bulletin && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 80, color: 'rgba(255,255,255,0.03)', fontFamily: "'Georgia', serif" }}>✝</div>
              <div style={{ color: 'rgba(255,255,255,0.12)', fontSize: 14, letterSpacing: 6, textTransform: 'uppercase', fontWeight: 300 }}>No active bulletin</div>
            </div>
          </div>
        )}

        {/* Buffer A */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: activeBuffer === 'a' ? 1 : 0,
          transform: activeBuffer === 'a' ? 'scale(1)' : 'scale(1.015)',
          transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: activeBuffer === 'a' ? 2 : 1,
          willChange: 'opacity, transform',
        }}>
          <Slide slide={slides[bufA]} accent={accent} />
        </div>

        {/* Buffer B */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: activeBuffer === 'b' ? 1 : 0,
          transform: activeBuffer === 'b' ? 'scale(1)' : 'scale(1.015)',
          transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: activeBuffer === 'b' ? 2 : 1,
          willChange: 'opacity, transform',
        }}>
          <Slide slide={slides[bufB]} accent={accent} />
        </div>
      </div>

      {/* minimal footer dots */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, padding: '14px 64px', flexShrink: 0, zIndex: 10 }}>
        <button onClick={e => { e.stopPropagation(); prev(); }} disabled={index === 0} style={{ background: 'none', border: 'none', color: index === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.15)', fontSize: 20, cursor: index === 0 ? 'default' : 'pointer' }}>‹</button>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {slides.map((_, i) => (
            <div key={i} onClick={e => { e.stopPropagation(); goTo(i); }} style={{
              width: i === index ? 28 : 8, height: 4, borderRadius: 2,
              background: i === index ? accent : 'rgba(255,255,255,0.06)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
            }} />
          ))}
        </div>
        <button onClick={e => { e.stopPropagation(); next(); }} disabled={index === total - 1} style={{ background: 'none', border: 'none', color: index === total - 1 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.15)', fontSize: 20, cursor: index === total - 1 ? 'default' : 'pointer' }}>›</button>
      </div>
    </div>
  );
}