import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FirebaseBulletinRepo } from '../../adapters/firebase/FirebaseBulletinRepo';
import { CHURCH_NAME } from '../../core/domain/Bulletin';
import { useAppConfig } from '../../hooks/useAppConfig';
import { buildSlides, slideDurationMs } from '../../utils/slideUtils';

const repo = new FirebaseBulletinRepo();

function fmtD(iso, o) {
  if (!iso) return '';
  try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', o); } catch { return iso; }
}

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function dayName(iso) { return DAY_NAMES[new Date(iso + 'T12:00:00').getDay()]; }
function multiDayLabel(events) {
  if (!events?.length) return 'Upcoming';
  const keys = [...new Set(events.map(e => `${e.startDate}|${e.endDate}`))];
  if (keys.length === 1) {
    const [s, e] = keys[0].split('|');
    const sd = dayName(s), ed = dayName(e);
    return sd === ed ? sd : `${sd} – ${ed}`;
  }
  return 'Upcoming';
}

function mkTheme(light) {
  return light ? {
    bg: '#f0e8d4', headerBg: '#e8dcc4', headerBorder: 'rgba(0,0,0,0.08)', footerBorder: 'rgba(0,0,0,0.08)',
    churchName: 'rgba(0,0,0,0.3)', headerNote: 'rgba(0,0,0,0.25)', text: '#1a1208', textMuted: '#3d2c14',
    textFaint: '#7a5c30', cardBg: 'rgba(0,0,0,0.04)', dotInactive: 'rgba(0,0,0,0.1)',
    ctrlBg: 'rgba(0,0,0,0.04)', ctrlBorder: 'rgba(0,0,0,0.1)', ctrlColor: 'rgba(0,0,0,0.3)',
    progressBg: 'rgba(0,0,0,0.06)', gold: '#8a6a00', blue: '#1a4a7a', purple: '#5a3a8a',
    patternInvert: false, noActiveBg: 'rgba(0,0,0,0.04)', noActiveText: 'rgba(0,0,0,0.15)',
  } : {
    bg: '#0c0a06', headerBg: 'transparent', headerBorder: 'rgba(255,255,255,0.04)', footerBorder: 'rgba(255,255,255,0.04)',
    churchName: 'rgba(255,255,255,0.3)', headerNote: 'rgba(255,255,255,0.2)', text: '#f0e8d4', textMuted: '#7a6e50',
    textFaint: '#6a5e42', cardBg: 'rgba(255,255,255,0.04)', dotInactive: 'rgba(255,255,255,0.06)',
    ctrlBg: 'rgba(255,255,255,0.03)', ctrlBorder: 'rgba(255,255,255,0.06)', ctrlColor: 'rgba(255,255,255,0.2)',
    progressBg: 'rgba(255,255,255,0.03)', gold: '#c9a050', blue: '#5a8ab4', purple: '#8a6ab4',
    patternInvert: true, noActiveBg: 'transparent', noActiveText: 'rgba(255,255,255,0.1)',
  };
}

const COPTIC_PATTERN_URL = '/patterns/coptic-cross.png';

function CrossBackground({ t }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
      backgroundImage: `url(${COPTIC_PATTERN_URL})`,
      backgroundSize: '500px auto', backgroundRepeat: 'repeat', backgroundPosition: '0 -10px',
      opacity: 0.06, filter: t.patternInvert ? 'invert(1)' : 'none',
    }} />
  );
}

const CSS = `@keyframes sIn{from{opacity:0}to{opacity:1}}.si{animation:sIn .35s ease both}`;

function TitleBar({ color }) {
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

// Single source of truth: all card/font/spacing derived from available body height and item count.
// Title fonts are intentionally excluded — those stay fixed via clamp() in each slide.
function cardMetrics(bodyH, n) {
  const gap   = Math.max(2, Math.min(6, Math.floor(bodyH / Math.max(n, 1) / 10)));
  const cardH = n > 0 ? Math.floor((bodyH - gap * (n - 1)) / n * 0.85) : Math.floor(bodyH * 0.85);
  const nameSize = Math.min(42, Math.max(11, cardH * 0.32));
  const timeSize = Math.min(28, Math.max(9,  cardH * 0.20));
  const noteSize = Math.min(14, Math.max(8,  cardH * 0.11));
  const dateSize = Math.min(13, Math.max(8,  cardH * 0.09));
  const pad      = Math.min(18, Math.max(3,  cardH * 0.11));
  const barW     = Math.max(3,  Math.min(5,  cardH * 0.04));
  const br       = Math.min(8,  cardH * 0.08);
  const showNotes    = cardH > 52;
  const showContacts = cardH > 70;
  return { gap, cardH, nameSize, timeSize, noteSize, dateSize, pad, barW, br, showNotes, showContacts };
}

function DaySlide({ data, h, t }) {
  const evts = data.events ?? [];
  const n = evts.length;
  const dt = fmtD(data.date, { weekday: 'long', month: 'long', day: 'numeric' });

  const TITLE_H = 86;
  const { gap, cardH, nameSize, timeSize, noteSize, pad, showNotes, showContacts } = cardMetrics(h - TITLE_H, n);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 144px 16px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ height: TITLE_H, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontSize: 'clamp(32px,5vw,64px)', fontFamily: "'Georgia',serif", fontWeight: 700, color: t.text, lineHeight: 1 }}>{data.day}</span>
          {dt && <span style={{ fontSize: 'clamp(11px,1.2vw,16px)', color: t.textFaint, letterSpacing: 3, fontWeight: 300 }}>{dt}</span>}
        </div>
        <TitleBar color={t.gold} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap, overflow: 'hidden' }}>
        {evts.map((ev, i) => {
          const c = ev.color ?? t.gold;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'stretch', height: cardH, maxHeight: cardH, borderRadius: Math.min(8, cardH * 0.1), overflow: 'hidden', background: t.cardBg, flexShrink: 0 }}>
              <div style={{ width: Math.max(3, Math.min(5, cardH * 0.04)), background: c, flexShrink: 0 }} />
              {ev.image && (
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: Math.max(3, pad * 0.4), width: cardH * 0.9, maxWidth: '22vw', background: 'rgba(0,0,0,0.1)' }}>
                  <img src={ev.image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }} />
                </div>
              )}
              <div style={{ flex: 1, padding: `${pad * 0.5}px ${pad}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1, minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: nameSize, fontFamily: "'Georgia',serif", fontWeight: 700, color: t.text, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.name}</div>
                {showNotes && ev.notes && (
                  <div style={{ fontSize: noteSize, color: t.textMuted, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.notes}</div>
                )}
                {showContacts && (ev.contacts ?? []).length > 0 && (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'nowrap', overflow: 'hidden' }}>
                    {ev.contacts.slice(0, 2).map((ct, j) => (
                      <span key={j} style={{ fontSize: noteSize * 0.9, color: t.textFaint, whiteSpace: 'nowrap' }}>
                        {ct.name}{ct.phone && <span style={{ color: c, fontWeight: 700, marginLeft: 4 }}>{ct.phone}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {(ev.time || ev.timeTo) && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', padding: `${pad * 0.5}px ${pad * 0.8}px`, flexShrink: 0, gap: 2 }}>
                  {ev.time && <div style={{ fontSize: timeSize, fontWeight: 800, color: c, fontFamily: "'Georgia',serif", whiteSpace: 'nowrap', lineHeight: 1 }}>{ev.time}</div>}
                  {ev.time && ev.timeTo && <div style={{ fontSize: timeSize * 0.72, fontWeight: 600, color: `${c}99`, fontFamily: "'Georgia',serif", whiteSpace: 'nowrap', lineHeight: 1 }}>to</div>}
                  {ev.timeTo && <div style={{ fontSize: timeSize * 0.72, fontWeight: 600, color: `${c}99`, fontFamily: "'Georgia',serif", whiteSpace: 'nowrap', lineHeight: 1 }}>{ev.timeTo}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnnSlide({ data, h, t }) {
  const n = data.length;
  const TITLE_H = 86;
  const { gap, cardH, nameSize: fontSize, pad, barW, br } = cardMetrics(h - TITLE_H, n);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 144px 16px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ height: TITLE_H, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 8 }}>
        <div style={{ fontSize: 'clamp(28px,4.5vw,56px)', fontFamily: "'Georgia',serif", fontWeight: 700, color: t.text, lineHeight: 1 }}>Announcements</div>
        <TitleBar color={t.blue} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap, overflow: 'hidden' }}>
        {data.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: Math.max(8, cardH * 0.12), height: cardH, maxHeight: cardH, flexShrink: 0, borderLeft: `${barW}px solid ${t.blue}`, paddingLeft: Math.max(10, cardH * 0.1), background: t.cardBg, borderRadius: `0 ${br}px ${br}px 0`, overflow: 'hidden' }}>
            {a.image && (
              <div style={{ flexShrink: 0, height: '80%', display: 'flex', alignItems: 'center' }}>
                <img src={a.image} alt="" style={{ maxHeight: '100%', maxWidth: cardH * 1.2, objectFit: 'contain', borderRadius: 4 }} />
              </div>
            )}
            <span style={{ fontSize, color: t.text, lineHeight: 1.3, fontFamily: "'Georgia',serif", fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: Math.max(1, Math.floor(cardH / (fontSize * 1.4))), WebkitBoxOrient: 'vertical' }}>{a.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiSlide({ data, h, t }) {
  const n = data.length;
  const label = multiDayLabel(data);
  const TITLE_H = 66;
  const { gap, cardH, nameSize, timeSize, noteSize, dateSize, pad, showNotes } = cardMetrics(h - TITLE_H, n);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 144px 16px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ height: TITLE_H, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 8 }}>
        <div style={{ fontSize: 'clamp(28px,4.5vw,56px)', fontFamily: "'Georgia',serif", fontWeight: 700, color: t.text, lineHeight: 1 }}>{label}</div>
        <TitleBar color={t.purple} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap, overflow: 'hidden' }}>
        {data.map((e, i) => {
          const c = e.color ?? t.purple;
          const startD = e.startDate ? new Date(e.startDate + 'T00:00:00') : null;
          const endD   = e.endDate && e.endDate !== e.startDate ? new Date(e.endDate + 'T00:00:00') : null;
          const sf = startD ? startD.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
          const ef = endD   ? endD.toLocaleDateString('en-US',   { weekday: 'short', month: 'short', day: 'numeric' }) : '';
          const dateStr = ef ? `Daily · ${sf} through ${ef}` : sf;

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'stretch', height: cardH, maxHeight: cardH, flexShrink: 0, borderRadius: Math.min(8, cardH * 0.1), overflow: 'hidden', background: t.cardBg }}>
              <div style={{ width: Math.max(3, Math.min(5, cardH * 0.04)), background: c, flexShrink: 0 }} />
              {e.image && (
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: Math.max(3, pad * 0.4), width: cardH * 0.9, maxWidth: '20vw', background: 'rgba(0,0,0,0.1)' }}>
                  <img src={e.image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }} />
                </div>
              )}
              <div style={{ flex: 1, padding: `${pad * 0.5}px ${pad}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: nameSize, fontFamily: "'Georgia',serif", fontWeight: 700, color: t.text, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
                {showNotes && e.notes && (
                  <div style={{ fontSize: Math.max(8, noteSize), color: t.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.notes}</div>
                )}
                <div style={{ fontSize: dateSize, color: t.textFaint, letterSpacing: 1.5, fontWeight: 500, marginTop: 2 }}>{dateStr}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `0 ${Math.max(14, pad * 1.5)}px`, flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  {e.time   && <div style={{ fontSize: timeSize,        fontWeight: 800, color: c,         fontFamily: "'Georgia',serif", whiteSpace: 'nowrap', lineHeight: 1 }}>{e.time}</div>}
                  {e.time && e.timeTo && <div style={{ fontSize: timeSize * 0.65, fontWeight: 600, color: `${c}88`, fontFamily: "'Georgia',serif", whiteSpace: 'nowrap', lineHeight: 1 }}>to</div>}
                  {e.timeTo && <div style={{ fontSize: timeSize * 0.65, fontWeight: 600, color: `${c}88`, fontFamily: "'Georgia',serif", whiteSpace: 'nowrap', lineHeight: 1 }}>{e.timeTo}</div>}
                  {!e.time && !e.timeTo && <div style={{ fontSize: dateSize, color: t.textFaint, fontStyle: 'italic' }}>All day</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImgSlide({ data, t }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 64px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, width: '100%' }}>
        <img src={data.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 10 }} />
      </div>
      {data.caption && <div style={{ marginTop: 12, fontSize: 'clamp(13px,1.8vw,24px)', color: t.textFaint, fontFamily: "'Georgia',serif", fontStyle: 'italic', textAlign: 'center', flexShrink: 0 }}>{data.caption}</div>}
    </div>
  );
}

function RenderSlide({ slide, h, t }) {
  if (!slide) return null;
  if (slide.type === 'day')   return <DaySlide   data={slide.data} h={h} t={t} />;
  if (slide.type === 'ann')   return <AnnSlide   data={slide.data} h={h} t={t} />;
  if (slide.type === 'multi') return <MultiSlide data={slide.data} h={h} t={t} />;
  if (slide.type === 'img')   return <ImgSlide   data={slide.data} t={t} />;
  return null;
}

export default function PresentPage() {
  const { config } = useAppConfig();
  const t        = mkTheme(config.lightMode);
  const baseline    = config.slideBaseline    ?? 10;
  const multiplier  = config.slideMultiplier  ?? 0.4;

  const [bulletin, setBulletin] = useState(null);
  const [index,    setIndex]    = useState(0);
  const [paused,   setPaused]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [fadeKey,  setFadeKey]  = useState(0);
  const [isFs,     setIsFs]     = useState(false);
  const [bodyH,    setBodyH]    = useState(600);

  const cRef    = useRef(null);
  const bodyRef = useRef(null);
  const tRef    = useRef(null);
  const pRef    = useRef(null);
  const sRef    = useRef(null);
  const uRef    = useRef(null);

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

  const fs     = () => { if (!document.fullscreenElement) cRef.current?.requestFullscreen(); else document.exitFullscreen(); };
  const slides  = useMemo(() => bulletin ? buildSlides(bulletin) : [], [bulletin]);
  const total   = slides.length;

  useEffect(() => {
    if (!total) return;
    const nx = slides[(index + 1) % total];
    const urls = [];
    if (nx?.type === 'img')   urls.push(nx.data.url);
    if (nx?.type === 'day')   (nx.data.events ?? []).forEach(e => { if (e.image) urls.push(e.image); });
    if (nx?.type === 'multi') (nx.data ?? []).forEach(e => { if (e.image) urls.push(e.image); });
    if (nx?.type === 'ann')   (nx.data ?? []).forEach(a => { if (a.image) urls.push(a.image); });
    urls.forEach(u => { const im = new Image(); im.src = u; });
  }, [index, slides, total]);

  const goTo = useCallback(i => { setIndex(i); setFadeKey(k => k + 1); }, []);
  const next = useCallback(() => { if (total) goTo((index + 1) % total); }, [index, total, goTo]);
  const prev = useCallback(() => { if (index > 0) goTo(index - 1); }, [index, goTo]);

  useEffect(() => {
    if (!bulletin || paused || !total) return;
    const d = slideDurationMs(slides[index], bulletin, baseline, multiplier);
    setProgress(0); sRef.current = Date.now();
    clearInterval(pRef.current); clearTimeout(tRef.current);
    pRef.current = setInterval(() => setProgress(Math.min(((Date.now() - sRef.current) / d) * 100, 100)), 50);
    tRef.current = setTimeout(() => { clearInterval(pRef.current); next(); }, d);
    return () => { clearTimeout(tRef.current); clearInterval(pRef.current); };
  }, [index, bulletin, paused, next, total, baseline]);

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
    <div ref={cRef} style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: t.bg, color: t.text, userSelect: 'none', overflow: 'hidden', fontFamily: "'Inter',sans-serif", position: 'relative' }}>
      {config.devMode && <div style={{ position: 'fixed', inset: 0, border: '4px solid #22c55e', pointerEvents: 'none', zIndex: 99999 }} />}
      <CrossBackground t={t} />
      <style>{CSS}</style>

      {config.devMode && (
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 100, background: '#22c55e', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: 1, textTransform: 'uppercase' }}>DEV</div>
      )}

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 20, background: t.progressBg }}>
        <div style={{ height: '100%', width: `${progress}%`, background: t.gold, transition: 'width 0.05s linear' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 64px', flexShrink: 0, zIndex: 10, borderBottom: `1px solid ${t.headerBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22, color: t.gold, fontFamily: "'Georgia',serif" }}>✝</span>
          <div>
            <div style={{ fontSize: 'clamp(11px,1.2vw,15px)', color: t.churchName, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 300 }}>{CHURCH_NAME}</div>
            {hn.length > 0 && (
              <div style={{ display: 'flex', gap: 12, marginTop: 1 }}>
                {hn.map((n, i) => <span key={i} style={{ fontSize: 'clamp(9px,1vw,12px)', color: t.headerNote, fontStyle: 'italic' }}>{hn.length > 1 ? '· ' : ''}{n.text}</span>)}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setPaused(p => !p)} style={{ background: t.ctrlBg, border: `1px solid ${t.ctrlBorder}`, color: t.ctrlColor, fontSize: 10, cursor: 'pointer', padding: '4px 12px', borderRadius: 4 }}>{paused ? '▶' : '⏸'}</button>
          <button onClick={fs}                       style={{ background: t.ctrlBg, border: `1px solid ${t.ctrlBorder}`, color: t.ctrlColor, fontSize: 10, cursor: 'pointer', padding: '4px 12px', borderRadius: 4 }}>{isFs ? '✕' : '⛶'}</button>
          <a href="/admin" style={{ color: t.ctrlColor, fontSize: 10, textDecoration: 'none', padding: '4px 12px', border: `1px solid ${t.ctrlBorder}`, borderRadius: 4 }}>Admin</a>
        </div>
      </div>

      <div ref={bodyRef} onClick={next} style={{ flex: 1, cursor: 'pointer', overflow: 'hidden', minHeight: 0, zIndex: 5 }}>
        {!bulletin ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56, color: t.noActiveText, fontFamily: "'Georgia',serif" }}>✝</div>
              <div style={{ color: t.noActiveText, fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 300, marginTop: 10 }}>No active bulletin</div>
            </div>
          </div>
        ) : (
          <div key={fadeKey} className="si" style={{ width: '100%', height: '100%' }}>
            <RenderSlide slide={slides[index]} h={bodyH} t={t} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, padding: '10px 64px', flexShrink: 0, zIndex: 10, borderTop: `1px solid ${t.footerBorder}` }}>
        <button onClick={e => { e.stopPropagation(); prev(); }} disabled={index === 0}
          style={{ background: 'none', border: 'none', color: index === 0 ? t.dotInactive : t.ctrlColor, fontSize: 18, cursor: index === 0 ? 'default' : 'pointer' }}>‹</button>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {slides.map((_, i) => (
            <div key={i} onClick={e => { e.stopPropagation(); goTo(i); }}
              style={{ width: i === index ? 20 : 6, height: 4, borderRadius: 2, background: i === index ? t.gold : t.dotInactive, transition: 'all 0.3s ease', cursor: 'pointer' }} />
          ))}
        </div>
        <button onClick={e => { e.stopPropagation(); next(); }} disabled={index === total - 1}
          style={{ background: 'none', border: 'none', color: index === total - 1 ? t.dotInactive : t.ctrlColor, fontSize: 18, cursor: index === total - 1 ? 'default' : 'pointer' }}>›</button>
      </div>
    </div>
  );
}