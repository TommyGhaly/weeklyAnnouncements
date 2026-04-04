import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FirebaseBulletinRepo } from '../../adapters/firebase/FirebaseBulletinRepo';
import { CHURCH_NAME } from '../../core/domain/Bulletin';

const repo = new FirebaseBulletinRepo();

function dur(s) {
  const b = 8500, p = 3200;
  if (s.type === 'day') return b + (s.data.events?.length ?? 0) * p;
  if (s.type === 'ann') return b + (s.data.length ?? 0) * p;
  if (s.type === 'multi') return b + (s.data.length ?? 0) * p;
  if (s.type === 'img') return 9000;
  return b;
}

function buildSlides(b) {
  const s = [];
  for (const img of b.slideImages ?? []) if (img.url) s.push({ type: 'img', data: img });
  const md = b.multiDayEvents ?? [];
  if (md.length) s.push({ type: 'multi', data: md });
  const ann = (b.announcements ?? []).filter(a => a.text?.trim());
  if (ann.length) s.push({ type: 'ann', data: ann });
  (b.days ?? []).filter(d => d.events?.length).forEach(d => s.push({ type: 'day', data: d }));
  return s;
}

function fmtD(iso, o) {
  if (!iso) return '';
  try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', o); } catch { return iso; }
}

/* Coptic pattern background - uses a tileable pattern image */
const COPTIC_PATTERN_URL = '/patterns/coptic-cross.png';

function CrossBackground() {
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
      backgroundImage: `url(${COPTIC_PATTERN_URL})`,
      backgroundSize: '500px auto',
      backgroundRepeat: 'repeat',
      backgroundPosition: '0 -10px',
      opacity: 0.06,
      filter: 'invert(1)',
    }} />
  );
}

const CSS = `@keyframes sIn{from{opacity:0}to{opacity:1}}.si{animation:sIn .35s ease both}`;

function TitleBar({ color = '#c9a050' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 6, marginBottom: 2, width: '100%' }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color}, ${color}44)` }} />
      <svg width="20" height="8" viewBox="0 0 20 8" style={{ opacity: 0.6, flexShrink: 0, margin: '0 8px' }}>
        <rect x="4" y="0.5" width="5" height="5" fill="none" stroke={color} strokeWidth="0.6" transform="rotate(45 6.5 3)"/>
        <circle cx="10" cy="4" r="1.2" fill={color}/>
        <rect x="11" y="0.5" width="5" height="5" fill="none" stroke={color} strokeWidth="0.6" transform="rotate(45 13.5 3)"/>
      </svg>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color}44, ${color})` }} />
    </div>
  );
}

/* ═══ DAY ═══ */
function DaySlide({ data, h }) {
  const evts = data.events ?? [];
  const n = evts.length;
  const dt = fmtD(data.date, { weekday: 'long', month: 'long', day: 'numeric' });
  const titleH = 90;
  const bodyH = h - titleH;
  const gap = Math.max(2, Math.min(8, Math.floor(bodyH / n / 8)));
  const cardH = n > 0 ? Math.floor((bodyH - gap * (n - 1)) / n) : bodyH;
  const nameSize = Math.min(48, Math.max(13, cardH * 0.35));
  const timeSize = Math.min(38, Math.max(11, cardH * 0.28));
  const noteSize = Math.min(15, Math.max(9, cardH * 0.12));
  const pad = Math.min(20, Math.max(3, cardH * 0.12));
  const showNotes = cardH > 60;
  const showContacts = cardH > 80;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 64px 12px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ height: titleH, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontSize: 'clamp(32px,5vw,64px)', fontFamily: "'Georgia',serif", fontWeight: 700, color: '#e8dcc0', lineHeight: 1 }}>{data.day}</span>
          {dt && <span style={{ fontSize: 'clamp(11px,1.2vw,16px)', color: '#6a5e42', letterSpacing: 3, fontWeight: 300 }}>{dt}</span>}
        </div>
        <TitleBar color="#c9a050" />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap, overflow: 'hidden' }}>
        {evts.map((ev, i) => {
          const c = ev.color ?? '#c9a050';
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'stretch', height: cardH, maxHeight: cardH, borderRadius: Math.min(8, cardH * 0.1), overflow: 'hidden', background: 'rgba(255,255,255,0.04)', flexShrink: 0 }}>
              <div style={{ width: Math.max(3, Math.min(5, cardH * 0.04)), background: c, flexShrink: 0 }} />
              {ev.image && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: Math.max(3, pad * 0.4), width: cardH * 0.9, maxWidth: '22vw', background: 'rgba(0,0,0,0.1)' }}><img src={ev.image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }} /></div>}
              <div style={{ flex: 1, padding: `${pad * 0.6}px ${pad}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1, minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: nameSize, fontFamily: "'Georgia',serif", fontWeight: 700, color: '#f0e8d4', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.name}</div>
                {showNotes && ev.notes && <div style={{ fontSize: noteSize, color: '#7a6e50', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.notes}</div>}
                {showContacts && (ev.contacts ?? []).length > 0 && <div style={{ display: 'flex', gap: 12, flexWrap: 'nowrap', overflow: 'hidden' }}>{ev.contacts.slice(0, 2).map((ct, j) => <span key={j} style={{ fontSize: noteSize * 0.9, color: '#6a5e42', whiteSpace: 'nowrap' }}>{ct.name}{ct.phone && <span style={{ color: c, fontWeight: 700, marginLeft: 4 }}>{ct.phone}</span>}</span>)}</div>}
              </div>
              {(ev.time || ev.timeTo) && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', padding: `${pad * 0.5}px ${pad * 0.8}px`, flexShrink: 0 }}>
                {ev.time && <div style={{ fontSize: timeSize, fontWeight: 800, color: c, fontFamily: "'Georgia',serif", whiteSpace: 'nowrap', lineHeight: 1 }}>{ev.time}</div>}
                {ev.timeTo && <div style={{ fontSize: timeSize * 0.72, fontWeight: 600, color: `${c}77`, fontFamily: "'Georgia',serif", whiteSpace: 'nowrap', lineHeight: 1, marginTop: 1 }}>{ev.timeTo}</div>}
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ ANNOUNCEMENTS ═══ */
function AnnSlide({ data, h }) {
  const n = data.length;
  const titleH = 90;
  const bodyH = h - titleH;
  const gap = Math.max(2, Math.min(8, Math.floor(bodyH / n / 8)));
  const rowH = n > 0 ? Math.floor((bodyH - gap * (n - 1)) / n) : bodyH;
  const fontSize = Math.min(36, Math.max(12, rowH * 0.3));

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 64px 12px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ height: titleH, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 8 }}>
        <div style={{ fontSize: 'clamp(28px,4.5vw,56px)', fontFamily: "'Georgia',serif", fontWeight: 700, color: '#c0d4e8', lineHeight: 1 }}>Announcements</div>
        <TitleBar color="#5a8ab4" />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap, overflow: 'hidden' }}>
        {data.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: Math.max(8, rowH * 0.12), height: rowH, maxHeight: rowH, flexShrink: 0, borderLeft: `${Math.max(3, Math.min(5, rowH * 0.04))}px solid #5a8ab4`, paddingLeft: Math.max(10, rowH * 0.1), background: 'rgba(255,255,255,0.02)', borderRadius: `0 ${Math.min(8, rowH * 0.08)}px ${Math.min(8, rowH * 0.08)}px 0`, overflow: 'hidden' }}>
            {a.image && <div style={{ flexShrink: 0, height: '80%', display: 'flex', alignItems: 'center' }}><img src={a.image} alt="" style={{ maxHeight: '100%', maxWidth: rowH * 1.2, objectFit: 'contain', borderRadius: 4 }} /></div>}
            <span style={{ fontSize, color: '#dde8f0', lineHeight: 1.3, fontFamily: "'Georgia',serif", fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: Math.max(1, Math.floor(rowH / (fontSize * 1.4))), WebkitBoxOrient: 'vertical' }}>{a.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ MULTI-DAY ═══ */
function MultiSlide({ data, h }) {
  const n = data.length;
  const titleH = 70;
  const bodyH = h - titleH;
  const gap = Math.max(2, Math.min(8, Math.floor(bodyH / n / 8)));
  const cardH = n > 0 ? Math.floor((bodyH - gap * (n - 1)) / n) : bodyH;
  const nameSize = Math.min(44, Math.max(13, cardH * 0.28));
  const pad = Math.min(18, Math.max(3, cardH * 0.1));
  const showNotes = cardH > 60;
  const timeSize = Math.min(52, Math.max(16, cardH * 0.38));
  const dateSize = Math.min(14, Math.max(9, cardH * 0.1));

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 64px 12px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ height: titleH, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 8 }}>
        <div style={{ fontSize: 'clamp(28px,4.5vw,56px)', fontFamily: "'Georgia',serif", fontWeight: 700, color: '#d0c4e0', lineHeight: 1 }}>Upcoming</div>
        <TitleBar color="#8a6ab4" />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap, overflow: 'hidden' }}>
        {data.map((e, i) => {
          const c = e.color ?? '#8a6ab4';
          const startD = e.startDate ? new Date(e.startDate + 'T00:00:00') : null;
          const endD = e.endDate && e.endDate !== e.startDate ? new Date(e.endDate + 'T00:00:00') : null;
          const sf = startD ? startD.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
          const ef = endD ? endD.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
          const dateStr = ef ? `Daily · ${sf} through ${ef}` : sf;

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'stretch', height: cardH, maxHeight: cardH, flexShrink: 0, borderRadius: Math.min(8, cardH * 0.1), overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ width: Math.max(3, Math.min(5, cardH * 0.04)), background: c, flexShrink: 0 }} />
              {e.image && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: Math.max(3, pad * 0.4), width: cardH * 0.9, maxWidth: '20vw', background: 'rgba(0,0,0,0.1)' }}><img src={e.image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }} /></div>}
              <div style={{ flex: 1, padding: `${pad * 0.5}px ${pad}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: nameSize, fontFamily: "'Georgia',serif", fontWeight: 700, color: '#f0e8d4', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
                {showNotes && e.notes && <div style={{ fontSize: Math.max(9, nameSize * 0.45), color: '#7a6e50', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.notes}</div>}
                <div style={{ fontSize: dateSize, color: '#9a8e70', letterSpacing: 1.5, fontWeight: 500, marginTop: 2 }}>{dateStr}</div>
              </div>
              {/* Time - the hero element */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `0 ${Math.max(16, pad * 1.5)}px`, flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  {e.time && <div style={{ fontSize: timeSize, fontWeight: 800, color: c, fontFamily: "'Georgia',serif", whiteSpace: 'nowrap', lineHeight: 1 }}>{e.time}</div>}
                  {e.timeTo && <div style={{ fontSize: timeSize * 0.65, fontWeight: 600, color: `${c}88`, fontFamily: "'Georgia',serif", whiteSpace: 'nowrap', lineHeight: 1, marginTop: 3 }}>{e.timeTo}</div>}
                  {!e.time && !e.timeTo && <div style={{ fontSize: dateSize, color: '#7a6e50', fontStyle: 'italic' }}>All day</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ IMAGE ═══ */
function ImgSlide({ data }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 64px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, width: '100%' }}>
        <img src={data.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 10 }} />
      </div>
      {data.caption && <div style={{ marginTop: 12, fontSize: 'clamp(13px, 1.8vw, 24px)', color: '#7a6e50', fontFamily: "'Georgia',serif", fontStyle: 'italic', textAlign: 'center', flexShrink: 0 }}>{data.caption}</div>}
    </div>
  );
}

function RenderSlide({ slide, h }) {
  if (!slide) return null;
  if (slide.type === 'day') return <DaySlide data={slide.data} h={h} />;
  if (slide.type === 'ann') return <AnnSlide data={slide.data} h={h} />;
  if (slide.type === 'multi') return <MultiSlide data={slide.data} h={h} />;
  if (slide.type === 'img') return <ImgSlide data={slide.data} />;
  return null;
}

/* ════════════════════════════════════════════
   MAIN
   ════════════════════════════════════════════ */
export default function PresentPage() {
  const [bulletin, setBulletin] = useState(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);
  const [isFs, setIsFs] = useState(false);
  const [bodyH, setBodyH] = useState(600);
  const cRef = useRef(null);
  const bodyRef = useRef(null);
  const tRef = useRef(null);
  const pRef = useRef(null);
  const sRef = useRef(null);
  const uRef = useRef(null);

  useEffect(() => {
    const measure = () => { if (bodyRef.current) setBodyH(bodyRef.current.clientHeight); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const u = repo.onActiveChange(id => {
      if (uRef.current) { uRef.current(); uRef.current = null; }
      if (!id) { setBulletin(null); return; }
      uRef.current = repo.onBulletinChange(id, setBulletin);
    });
    return () => { u(); if (uRef.current) uRef.current(); };
  }, []);

  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const fs = () => { if (!document.fullscreenElement) cRef.current?.requestFullscreen(); else document.exitFullscreen(); };
  const slides = useMemo(() => bulletin ? buildSlides(bulletin) : [], [bulletin]);
  const total = slides.length;

  useEffect(() => {
    if (!total) return;
    const nx = slides[(index + 1) % total];
    const urls = [];
    if (nx?.type === 'img') urls.push(nx.data.url);
    if (nx?.type === 'day') (nx.data.events ?? []).forEach(e => { if (e.image) urls.push(e.image); });
    if (nx?.type === 'multi') (nx.data ?? []).forEach(e => { if (e.image) urls.push(e.image); });
    if (nx?.type === 'ann') (nx.data ?? []).forEach(a => { if (a.image) urls.push(a.image); });
    urls.forEach(u => { const im = new Image(); im.src = u; });
  }, [index, slides, total]);

  const goTo = useCallback(i => { setIndex(i); setFadeKey(k => k + 1); }, []);
  const next = useCallback(() => { if (total) goTo((index + 1) % total); }, [index, total, goTo]);
  const prev = useCallback(() => { if (index > 0) goTo(index - 1); }, [index, goTo]);

  useEffect(() => {
    if (!bulletin || paused || !total) return;
    const d = dur(slides[index]);
    setProgress(0); sRef.current = Date.now();
    clearInterval(pRef.current); clearTimeout(tRef.current);
    pRef.current = setInterval(() => setProgress(Math.min(((Date.now() - sRef.current) / d) * 100, 100)), 50);
    tRef.current = setTimeout(() => { clearInterval(pRef.current); next(); }, d);
    return () => { clearTimeout(tRef.current); clearInterval(pRef.current); };
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

  const hn = (bulletin?.headerNotes ?? []).filter(n => n.text?.trim());

  return (
    <div ref={cRef} style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0c0a06', color: '#e8dcc0', userSelect: 'none', overflow: 'hidden', fontFamily: "'Inter',sans-serif", position: 'relative' }}>
      <CrossBackground />
      <style>{CSS}</style>

      {/* progress */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 20, background: 'rgba(255,255,255,0.03)' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: '#c9a050', transition: 'width 0.05s linear' }} />
      </div>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 64px', flexShrink: 0, zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22, color: '#c9a050', fontFamily: "'Georgia',serif" }}>✝</span>
          <div>
            <div style={{ fontSize: 'clamp(11px, 1.2vw, 15px)', color: 'rgba(255,255,255,0.3)', letterSpacing: 4, textTransform: 'uppercase', fontWeight: 300 }}>{CHURCH_NAME}</div>
            {hn.length > 0 && <div style={{ display: 'flex', gap: 12, marginTop: 1 }}>{hn.map((n, i) => <span key={i} style={{ fontSize: 'clamp(9px, 1vw, 12px)', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>{hn.length > 1 ? '· ' : ''}{n.text}</span>)}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setPaused(p => !p)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)', fontSize: 10, cursor: 'pointer', padding: '4px 12px', borderRadius: 4 }}>{paused ? '▶' : '⏸'}</button>
          <button onClick={fs} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)', fontSize: 10, cursor: 'pointer', padding: '4px 12px', borderRadius: 4 }}>{isFs ? '✕' : '⛶'}</button>
          <a href="/admin" style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, textDecoration: 'none', padding: '4px 12px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4 }}>Admin</a>
        </div>
      </div>

      {/* slide body */}
      <div ref={bodyRef} onClick={next} style={{ flex: 1, cursor: 'pointer', overflow: 'hidden', minHeight: 0, zIndex: 5 }}>
        {!bulletin ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56, color: 'rgba(255,255,255,0.04)', fontFamily: "'Georgia',serif" }}>✝</div>
              <div style={{ color: 'rgba(255,255,255,0.1)', fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 300, marginTop: 10 }}>No active bulletin</div>
            </div>
          </div>
        ) : (
          <div key={fadeKey} className="si" style={{ width: '100%', height: '100%' }}>
            <RenderSlide slide={slides[index]} h={bodyH} />
          </div>
        )}
      </div>

      {/* footer dots */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, padding: '10px 64px', flexShrink: 0, zIndex: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <button onClick={e => { e.stopPropagation(); prev(); }} disabled={index === 0} style={{ background: 'none', border: 'none', color: index === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.15)', fontSize: 18, cursor: index === 0 ? 'default' : 'pointer' }}>‹</button>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {slides.map((_, i) => <div key={i} onClick={e => { e.stopPropagation(); goTo(i); }} style={{ width: i === index ? 20 : 6, height: 4, borderRadius: 2, background: i === index ? '#c9a050' : 'rgba(255,255,255,0.06)', transition: 'all 0.3s ease', cursor: 'pointer' }} />)}
        </div>
        <button onClick={e => { e.stopPropagation(); next(); }} disabled={index === total - 1} style={{ background: 'none', border: 'none', color: index === total - 1 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.15)', fontSize: 18, cursor: index === total - 1 ? 'default' : 'pointer' }}>›</button>
      </div>
    </div>
  );
}