import { useState, useEffect, useCallback, useRef } from 'react';
import { FirebaseBulletinRepo } from '../../adapters/firebase/FirebaseBulletinRepo';
import { CHURCH_NAME } from '../../core/domain/Bulletin';

const repo = new FirebaseBulletinRepo();

const slideDuration = slide => {
  const base = 7000;
  const per = 3000;
  if (slide.type === 'day') return base + (slide.data.events?.length ?? 0) * per;
  if (slide.type === 'announcements') return base + (slide.data.length ?? 0) * per;
  if (slide.type === 'multiday') return base + (slide.data.length ?? 0) * per;
  return base;
};

function buildSlides(bulletin) {
  const slides = [];
  const multiDay = bulletin.multiDayEvents ?? [];
  if (multiDay.length > 0) slides.push({ type: 'multiday', data: multiDay });
  const ann = (bulletin.announcements ?? []).filter(a => a.text?.trim());
  if (ann.length > 0) slides.push({ type: 'announcements', data: ann });
  (bulletin.days ?? []).filter(d => d.events?.length > 0).forEach(d =>
    slides.push({ type: 'day', data: d })
  );
  return slides;
}

// ── Background patterns ───────────────────────────────────────
function SlideBackground({ accent }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Deep vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(20,14,4,0) 30%, rgba(4,3,1,0.85) 100%)' }} />

      {/* Diagonal hatching */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.02 }}>
        <defs>
          <pattern id="diag" width="60" height="60" patternUnits="userSpaceOnUse">
            <line x1="0" y1="60" x2="60" y2="0" stroke="#b8860b" strokeWidth="0.5"/>
            <line x1="-30" y1="60" x2="30" y2="0" stroke="#b8860b" strokeWidth="0.5"/>
            <line x1="30" y1="60" x2="90" y2="0" stroke="#b8860b" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diag)"/>
      </svg>

      {/* Coptic cross watermark */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.015 }}>
        <defs>
          <pattern id="crosses" width="220" height="220" patternUnits="userSpaceOnUse">
            <g transform="translate(110,110)" stroke="#b8860b" strokeWidth="1" fill="none">
              <line x1="0" y1="-20" x2="0" y2="20"/>
              <line x1="-20" y1="0" x2="20" y2="0"/>
              <circle cx="0" cy="-20" r="5"/>
              <circle cx="0" cy="20" r="5"/>
              <circle cx="-20" cy="0" r="5"/>
              <circle cx="20" cy="0" r="5"/>
              <circle cx="0" cy="0" r="7"/>
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#crosses)"/>
      </svg>

      {/* Interlocking circles (Coptic geometric) */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.012 }}>
        <defs>
          <pattern id="interlock" width="140" height="140" patternUnits="userSpaceOnUse">
            <circle cx="70" cy="70" r="50" fill="none" stroke="#b8860b" strokeWidth="0.6"/>
            <circle cx="0" cy="0" r="50" fill="none" stroke="#b8860b" strokeWidth="0.6"/>
            <circle cx="140" cy="0" r="50" fill="none" stroke="#b8860b" strokeWidth="0.6"/>
            <circle cx="0" cy="140" r="50" fill="none" stroke="#b8860b" strokeWidth="0.6"/>
            <circle cx="140" cy="140" r="50" fill="none" stroke="#b8860b" strokeWidth="0.6"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#interlock)"/>
      </svg>

      {/* Rosette top-right */}
      <svg style={{ position: 'absolute', top: 30, right: 30, width: 140, height: 140, opacity: 0.04 }} viewBox="0 0 140 140">
        {[0,30,60,90,120,150].map(r => (
          <ellipse key={r} cx="70" cy="70" rx="58" ry="18" fill="none" stroke="#b8860b" strokeWidth="0.6" transform={`rotate(${r} 70 70)`}/>
        ))}
        <circle cx="70" cy="70" r="14" fill="none" stroke="#b8860b" strokeWidth="0.8"/>
        <circle cx="70" cy="70" r="5" fill="#b8860b" opacity="0.3"/>
      </svg>

      {/* Rosette bottom-left */}
      <svg style={{ position: 'absolute', bottom: 30, left: 30, width: 110, height: 110, opacity: 0.035 }} viewBox="0 0 110 110">
        {[0,45,90,135].map(r => (
          <ellipse key={r} cx="55" cy="55" rx="44" ry="14" fill="none" stroke="#b8860b" strokeWidth="0.6" transform={`rotate(${r} 55 55)`}/>
        ))}
        <circle cx="55" cy="55" r="10" fill="none" stroke="#b8860b" strokeWidth="0.5"/>
      </svg>

      {/* Star pattern center-left */}
      <svg style={{ position: 'absolute', top: '40%', left: 20, width: 80, height: 80, opacity: 0.03 }} viewBox="0 0 80 80">
        {[0,72,144,216,288].map(r => (
          <line key={r} x1="40" y1="5" x2="40" y2="35" stroke="#b8860b" strokeWidth="0.8" transform={`rotate(${r} 40 40)`}/>
        ))}
        <circle cx="40" cy="40" r="8" fill="none" stroke="#b8860b" strokeWidth="0.5"/>
      </svg>

      {/* Wavy filigree top */}
      <svg style={{ position: 'absolute', top: 68, left: '8%', width: '84%', height: 24, opacity: 0.04 }} preserveAspectRatio="none" viewBox="0 0 800 24">
        <path d="M0 12 Q50 0 100 12 Q150 24 200 12 Q250 0 300 12 Q350 24 400 12 Q450 0 500 12 Q550 24 600 12 Q650 0 700 12 Q750 24 800 12" fill="none" stroke="#b8860b" strokeWidth="1"/>
        <path d="M0 12 Q50 24 100 12 Q150 0 200 12 Q250 24 300 12 Q350 0 400 12 Q450 24 500 12 Q550 0 600 12 Q650 24 700 12 Q750 0 800 12" fill="none" stroke="#b8860b" strokeWidth="0.5"/>
      </svg>

      {/* Wavy filigree bottom */}
      <svg style={{ position: 'absolute', bottom: 52, left: '8%', width: '84%', height: 24, opacity: 0.04 }} preserveAspectRatio="none" viewBox="0 0 800 24">
        <path d="M0 12 Q50 0 100 12 Q150 24 200 12 Q250 0 300 12 Q350 24 400 12 Q450 0 500 12 Q550 24 600 12 Q650 0 700 12 Q750 24 800 12" fill="none" stroke="#b8860b" strokeWidth="1"/>
      </svg>

      {/* Vertical side filigree left */}
      <svg style={{ position: 'absolute', top: '15%', left: 10, width: 16, height: '70%', opacity: 0.03 }} preserveAspectRatio="none" viewBox="0 0 16 400">
        <path d="M8 0 Q0 25 8 50 Q16 75 8 100 Q0 125 8 150 Q16 175 8 200 Q0 225 8 250 Q16 275 8 300 Q0 325 8 350 Q16 375 8 400" fill="none" stroke="#b8860b" strokeWidth="1"/>
      </svg>

      {/* Vertical side filigree right */}
      <svg style={{ position: 'absolute', top: '15%', right: 10, width: 16, height: '70%', opacity: 0.03 }} preserveAspectRatio="none" viewBox="0 0 16 400">
        <path d="M8 0 Q16 25 8 50 Q0 75 8 100 Q16 125 8 150 Q0 175 8 200 Q16 225 8 250 Q0 275 8 300 Q16 325 8 350 Q0 375 8 400" fill="none" stroke="#b8860b" strokeWidth="1"/>
      </svg>

      {/* Accent glow */}
      <div style={{ position: 'absolute', top: '25%', left: '25%', width: '50%', height: '50%', borderRadius: '50%', background: `radial-gradient(ellipse, ${accent}10 0%, transparent 70%)`, transition: 'background 1s ease' }} />

      {/* Side glow strips */}
      <div style={{ position: 'absolute', top: '15%', left: 0, width: 2, height: '70%', background: `linear-gradient(to bottom, transparent, ${accent}22, transparent)` }} />
      <div style={{ position: 'absolute', top: '15%', right: 0, width: 2, height: '70%', background: `linear-gradient(to bottom, transparent, ${accent}22, transparent)` }} />
    </div>
  );
}

// ── Ornate border ─────────────────────────────────────────────
function OrnateBorder({ color = '#b8860b', opacity = 0.25 }) {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} preserveAspectRatio="none">
      <rect x="12" y="12" width="calc(100% - 24px)" height="calc(100% - 24px)"
        fill="none" stroke={color} strokeWidth="0.5" strokeOpacity={opacity} vectorEffect="non-scaling-stroke"/>
      <rect x="20" y="20" width="calc(100% - 40px)" height="calc(100% - 40px)"
        fill="none" stroke={color} strokeWidth="0.3" strokeOpacity={opacity * 0.6} vectorEffect="non-scaling-stroke"/>
      {[[1,1],[-1,1],[1,-1],[-1,-1]].map(([sx,sy], i) => (
        <g key={i} stroke={color} strokeWidth="1" fill="none" strokeOpacity={opacity * 2}
          transform={`translate(${sx < 0 ? '100%' : '0'},${sy < 0 ? '100%' : '0'}) scale(${sx},${sy})`}>
          <line x1="12" y1="60" x2="12" y2="12"/>
          <line x1="12" y1="12" x2="60" y2="12"/>
          <line x1="20" y1="65" x2="20" y2="20"/>
          <line x1="20" y1="20" x2="65" y2="20"/>
          <circle cx="12" cy="12" r="5" fill={color} fillOpacity={opacity}/>
          <circle cx="12" cy="12" r="2" fill={color} fillOpacity={opacity * 2}/>
          <path d="M 12 30 Q 12 12 30 12" strokeWidth="0.6" strokeOpacity={opacity * 1.2}/>
          <path d="M 12 44 Q 12 12 44 12" strokeWidth="0.4" strokeOpacity={opacity * 0.8}/>
          <rect x="26" y="26" width="6" height="6" transform="rotate(45 29 29)" strokeWidth="0.6" strokeOpacity={opacity * 1.5}/>
        </g>
      ))}
    </svg>
  );
}

// ── Divider ornament ──────────────────────────────────────────
function OrnateDivider({ color = '#b8860b', opacity = 0.5 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', margin: '8px 0' }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${color})`, opacity }} />
      <svg width="80" height="14" viewBox="0 0 80 14" style={{ flexShrink: 0, opacity }}>
        <line x1="0" y1="7" x2="22" y2="7" stroke={color} strokeWidth="0.5"/>
        <circle cx="26" cy="7" r="2" fill={color} opacity="0.5"/>
        <rect x="33" y="2.5" width="6" height="6" fill="none" stroke={color} strokeWidth="0.8" transform="rotate(45 36 5.5)"/>
        <circle cx="40" cy="7" r="1.5" fill={color}/>
        <rect x="41" y="2.5" width="6" height="6" fill="none" stroke={color} strokeWidth="0.8" transform="rotate(45 44 5.5)"/>
        <circle cx="54" cy="7" r="2" fill={color} opacity="0.5"/>
        <line x1="58" y1="7" x2="80" y2="7" stroke={color} strokeWidth="0.5"/>
      </svg>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${color})`, opacity }} />
    </div>
  );
}

// ── Event image ───────────────────────────────────────────────
function EventImage({ src }) {
  if (!src) return null;
  return (
    <div style={{
      flexShrink: 0, flexGrow: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      background: 'rgba(0,0,0,0.15)',
      padding: 8,
    }}>
      <img src={src} alt="" style={{
        display: 'block',
        height: '100%',
        width: 'auto',
        maxWidth: '35vw',
        objectFit: 'contain',
        opacity: 0.9,
        borderRadius: 4,
      }} />
    </div>
  );
}

// ── Event card ────────────────────────────────────────────────
function EventCard({ event, accent, count }) {
  const color = event.color ?? accent;
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      flex: 1, minHeight: 0,
      borderRadius: 4,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: '0 2px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ width: 4, background: `linear-gradient(to bottom, ${color}ff, ${color}44, ${color}ff)`, flexShrink: 0 }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 60, background: `linear-gradient(to right, ${color}15, transparent)`, pointerEvents: 'none' }} />

      <EventImage src={event.image} />

      <div style={{ flex: 1, padding: 'clamp(8px, 1.2vw, 20px) clamp(12px, 1.8vw, 24px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, zIndex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{ fontSize: count <= 2 ? 'clamp(20px, 3.2vw, 44px)' : 'clamp(16px, 2.4vw, 32px)', fontFamily: 'Playfair Display, serif', fontWeight: 600, color: '#f5edd8', lineHeight: 1.1 }}>
          {event.name}
        </div>
        {event.notes && <div style={{ fontSize: 'clamp(10px, 1.1vw, 15px)', color: '#5a4828', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{event.notes}</div>}
        {(event.contacts ?? []).length > 0 && (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {event.contacts.map((c, j) => (
              <span key={j} style={{ fontSize: 'clamp(9px, 1vw, 13px)', color: '#4a3820' }}>
                {c.name}{c.phone && <span style={{ color, marginLeft: 6, fontWeight: 700 }}>{c.phone}</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {(event.time || event.timeTo) && (
        <div style={{
          padding: 'clamp(8px, 1.2vw, 20px) clamp(12px, 1.8vw, 22px)',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center',
          gap: 2, flexShrink: 0, minWidth: 'clamp(90px, 12vw, 180px)',
          borderLeft: `1px solid ${color}22`,
          background: `linear-gradient(135deg, ${color}14, transparent)`,
          zIndex: 1,
        }}>
          {event.time && <div style={{ fontSize: count <= 2 ? 'clamp(22px, 3.4vw, 48px)' : 'clamp(16px, 2.4vw, 34px)', fontWeight: 800, color, lineHeight: 1, letterSpacing: -1, textShadow: `0 0 20px ${color}88` }}>{event.time}</div>}
          {event.timeTo && <>
            <div style={{ fontSize: 'clamp(8px, 0.8vw, 11px)', color: '#3a2e1a', letterSpacing: 2, textTransform: 'uppercase', margin: '1px 0' }}>to</div>
            <div style={{ fontSize: count <= 2 ? 'clamp(17px, 2.8vw, 38px)' : 'clamp(13px, 2vw, 28px)', fontWeight: 700, color: `${color}88`, lineHeight: 1 }}>{event.timeTo}</div>
          </>}
        </div>
      )}
    </div>
  );
}

// ── Slide displays ────────────────────────────────────────────
function DaySlide({ data, accent }) {
  const events = data.events ?? [];
  const dateLabel = data.date
    ? new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : null;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 52px 20px', boxSizing: 'border-box' }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 'clamp(44px, 8vw, 100px)', fontFamily: 'Playfair Display, serif', fontWeight: 600, color: accent, lineHeight: 0.88, letterSpacing: -3, textShadow: `0 0 40px ${accent}55` }}>
          {data.day}
        </div>
        {dateLabel && (
          <div style={{ fontSize: 'clamp(10px, 1.3vw, 16px)', color: '#6a5828', marginTop: 6, letterSpacing: 5, textTransform: 'uppercase' }}>
            {dateLabel}
          </div>
        )}
        <OrnateDivider color={accent} opacity={0.6} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, overflow: 'hidden', paddingTop: 4 }}>
        {events.map((event, i) => (
          <EventCard key={i} event={event} accent={accent} count={events.length} />
        ))}
      </div>
    </div>
  );
}

function AnnouncementsSlide({ data, accent }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 52px 20px', boxSizing: 'border-box' }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 'clamp(38px, 6.5vw, 85px)', fontFamily: 'Playfair Display, serif', fontWeight: 600, color: accent, lineHeight: 0.9, letterSpacing: -2, textShadow: `0 0 40px ${accent}55` }}>
          Announcements
        </div>
        <OrnateDivider color={accent} opacity={0.6} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: data.length <= 3 ? 'center' : 'flex-start', gap: 10, minHeight: 0, overflow: 'hidden', paddingTop: 4 }}>
        {data.map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 18, flex: data.length <= 4 ? 1 : 'none', minHeight: 0,
            borderLeft: `4px solid ${accent}`, paddingLeft: 20,
            position: 'relative', background: 'rgba(255,255,255,0.015)',
            borderRadius: '0 6px 6px 0', padding: '10px 18px 10px 20px', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 50, background: `linear-gradient(to right, ${accent}18, transparent)`, pointerEvents: 'none', borderRadius: '0 6px 6px 0' }} />
            {a.image && (
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <img src={a.image} alt="" style={{ maxHeight: '100%', maxWidth: 'clamp(48px, 8vw, 120px)', objectFit: 'contain', borderRadius: 6 }} />
              </div>
            )}
            <span style={{ fontSize: 'clamp(14px, 2.2vw, 28px)', color: '#f0e4cc', lineHeight: 1.4, fontFamily: 'Playfair Display, serif' }}>{a.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiDaySlide({ data, accent }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '24px 52px 20px', boxSizing: 'border-box' }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 'clamp(38px, 6.5vw, 85px)', fontFamily: 'Playfair Display, serif', fontWeight: 600, color: accent, lineHeight: 0.9, letterSpacing: -2, textShadow: `0 0 40px ${accent}55` }}>
          Upcoming Events
        </div>
        <OrnateDivider color={accent} opacity={0.6} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, overflow: 'hidden', paddingTop: 4 }}>
        {data.map((e, i) => {
          const color = e.color ?? accent;
          const startFmt = e.startDate && !isNaN(new Date(e.startDate + 'T00:00:00'))
            ? new Date(e.startDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' }) : e.startDate;
          const endFmt = e.endDate && e.endDate !== e.startDate && !isNaN(new Date(e.endDate + 'T00:00:00'))
            ? new Date(e.endDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' }) : null;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'stretch', flex: 1, minHeight: 0,
              borderRadius: 4, overflow: 'hidden',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 2px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
              position: 'relative',
            }}>
              <div style={{ width: 4, background: `linear-gradient(to bottom, ${color}ff, ${color}44, ${color}ff)`, flexShrink: 0 }} />
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 60, background: `linear-gradient(to right, ${color}15, transparent)`, pointerEvents: 'none' }} />

              <EventImage src={e.image} />

              <div style={{ flex: 1, padding: 'clamp(10px, 1.5vw, 24px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, zIndex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: data.length <= 2 ? 'clamp(20px, 3.2vw, 44px)' : 'clamp(16px, 2.4vw, 32px)', fontFamily: 'Playfair Display, serif', fontWeight: 600, color: '#f5edd8', lineHeight: 1.1 }}>{e.name}</div>
                {e.notes && <div style={{ fontSize: 'clamp(10px, 1.2vw, 16px)', color: '#5a4828', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.notes}</div>}
                {(e.contacts ?? []).length > 0 && (
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {e.contacts.map((c, j) => (
                      <span key={j} style={{ fontSize: 'clamp(9px, 1vw, 14px)', color: '#4a3820' }}>
                        {c.name}{c.phone && <span style={{ color, marginLeft: 6, fontWeight: 700 }}>{c.phone}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ padding: 'clamp(10px, 1.5vw, 24px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0, minWidth: 'clamp(120px, 16vw, 240px)', borderLeft: `1px solid ${color}22`, background: `linear-gradient(135deg, ${color}18, transparent)`, zIndex: 1 }}>
                {startFmt && <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'clamp(8px, 0.9vw, 11px)', fontWeight: 700, color: '#4a3820', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 3 }}>{endFmt ? 'Starts' : 'Date'}</div>
                  <div style={{ fontSize: 'clamp(12px, 1.6vw, 20px)', fontWeight: 700, color, textShadow: `0 0 12px ${color}66` }}>{startFmt}</div>
                </div>}
                {endFmt && <>
                  <div style={{ width: 24, height: 1, background: `${color}44` }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'clamp(8px, 0.9vw, 11px)', fontWeight: 700, color: '#4a3820', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 3 }}>Ends</div>
                    <div style={{ fontSize: 'clamp(12px, 1.6vw, 20px)', fontWeight: 700, color, textShadow: `0 0 12px ${color}66` }}>{endFmt}</div>
                  </div>
                </>}
                {e.time && <div style={{ textAlign: 'center', marginTop: 2 }}>
                  <div style={{ fontSize: 'clamp(8px, 0.9vw, 11px)', fontWeight: 700, color: '#4a3820', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 3 }}>Daily</div>
                  <div style={{ fontSize: 'clamp(10px, 1.2vw, 16px)', color: '#7a6840' }}>{e.time}{e.timeTo ? ` – ${e.timeTo}` : ''}</div>
                </div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function PresentPage() {
  const [bulletin, setBulletin] = useState(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const timerRef = useRef(null);
  const progressRef = useRef(null);
  const startRef = useRef(null);
  const bulletinUnsubRef = useRef(null);

  // Realtime: watch active bulletin config, then subscribe to that bulletin doc
  useEffect(() => {
    const unsubActive = repo.onActiveChange(activeId => {
      // Clean up previous bulletin listener
      if (bulletinUnsubRef.current) {
        bulletinUnsubRef.current();
        bulletinUnsubRef.current = null;
      }
      if (!activeId) {
        setBulletin(null);
        return;
      }
      // Subscribe to the active bulletin document
      bulletinUnsubRef.current = repo.onBulletinChange(activeId, data => {
        setBulletin(data);
      });
    });
    return () => {
      unsubActive();
      if (bulletinUnsubRef.current) bulletinUnsubRef.current();
    };
  }, []);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  const slides = bulletin ? buildSlides(bulletin) : [];
  const total = slides.length;

  const goTo = useCallback(i => {
    setTransitioning(true);
    setTimeout(() => { setIndex(i); setTransitioning(false); }, 350);
  }, []);

  const next = useCallback(() => goTo((index + 1) % Math.max(total, 1)), [index, total, goTo]);
  const prev = useCallback(() => { if (index > 0) goTo(index - 1); }, [index, goTo]);

  useEffect(() => {
    if (!bulletin || paused || total === 0) return;
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
  }, [index, bulletin, paused, next, total]);

  useEffect(() => {
    const h = e => {
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'p') setPaused(p => !p);
      if (e.key === 'f') toggleFullscreen();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [next, prev]);

  const slide = slides[index];
  const accent = '#b8860b';
  const slideAccents = { day: '#b8860b', announcements: '#6b9fd4', multiday: '#a87fd4' };
  const slideAccent = slide ? (slideAccents[slide.type] ?? accent) : accent;
  const headerNotes = (bulletin?.headerNotes ?? []).filter(n => n.text?.trim());

  return (
    <div ref={containerRef} style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#080604',
      color: '#fff', userSelect: 'none', overflow: 'hidden',
      fontFamily: "'Inter', sans-serif", position: 'relative',
    }}>
      <SlideBackground accent={slideAccent} />
      <OrnateBorder color={accent} opacity={0.2} />

      {/* Progress bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 10 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(to right, ${slideAccent}88, ${slideAccent})`, transition: 'width 0.05s linear' }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 52px', flexShrink: 0, zIndex: 5, borderBottom: `1px solid ${accent}18` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 18, color: accent, fontFamily: 'Playfair Display, serif', textShadow: `0 0 12px ${accent}88` }}>✝</div>
          <div>
            <div style={{ fontSize: 'clamp(10px, 1.2vw, 14px)', color: '#5a4828', letterSpacing: 3, textTransform: 'uppercase', fontWeight: 400 }}>{CHURCH_NAME}</div>
            {headerNotes.length > 0 && (
              <div style={{ display: 'flex', gap: 16, marginTop: 2, flexWrap: 'wrap' }}>
                {headerNotes.map((n, i) => (
                  <span key={i} style={{ fontSize: 'clamp(9px, 1vw, 12px)', color: accent, fontStyle: 'italic', opacity: 0.8 }}>
                    {headerNotes.length > 1 ? '• ' : ''}{n.text}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => setPaused(p => !p)} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent}33`, color: '#5a4828', fontSize: 11, cursor: 'pointer', padding: '4px 12px', borderRadius: 4, letterSpacing: 1 }}>
            {paused ? '▶' : '⏸'}
          </button>
          <button onClick={toggleFullscreen} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent}33`, color: accent, fontSize: 11, cursor: 'pointer', padding: '4px 14px', borderRadius: 4, letterSpacing: 1 }}>
            {isFullscreen ? 'EXIT' : 'FULLSCREEN'}
          </button>
          <a href="/admin" style={{ color: '#3a2e18', fontSize: 11, textDecoration: 'none', letterSpacing: 1 }}>ADMIN</a>
        </div>
      </div>

      {/* Slide content */}
      <div
        onClick={next}
        style={{
          flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'center',
          cursor: 'pointer', overflow: 'hidden', position: 'relative', zIndex: 2,
          minHeight: 0,
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? 'translateY(8px)' : 'translateY(0)',
          transition: 'opacity 0.35s ease, transform 0.35s ease',
        }}
      >
        {!bulletin && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, color: `${accent}44`, fontFamily: 'Playfair Display, serif', marginBottom: 16 }}>✝</div>
              <div style={{ color: '#3a2e18', fontSize: 14, letterSpacing: 3, textTransform: 'uppercase' }}>No active bulletin — set one from admin</div>
            </div>
          </div>
        )}
        {slide?.type === 'day' && <DaySlide data={slide.data} accent={slideAccent} />}
        {slide?.type === 'announcements' && <AnnouncementsSlide data={slide.data} accent={slideAccent} />}
        {slide?.type === 'multiday' && <MultiDaySlide data={slide.data} accent={slideAccent} />}
      </div>

      {/* Footer nav */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, padding: '10px 52px', flexShrink: 0, zIndex: 5, borderTop: `1px solid ${accent}18` }}>
        <button onClick={e => { e.stopPropagation(); prev(); }} disabled={index === 0} style={{ background: 'none', border: 'none', color: index === 0 ? '#2a2010' : '#5a4828', fontSize: 18, cursor: index === 0 ? 'default' : 'pointer' }}>‹</button>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {slides.map((s, i) => (
            <div key={i} onClick={e => { e.stopPropagation(); goTo(i); }}
              style={{
                width: i === index ? 20 : 5, height: 5, borderRadius: 3,
                background: i === index ? slideAccent : `${accent}33`,
                transition: 'all 0.3s', cursor: 'pointer',
                boxShadow: i === index ? `0 0 6px ${slideAccent}88` : 'none',
              }}
            />
          ))}
        </div>
        <button onClick={e => { e.stopPropagation(); next(); }} disabled={index === total - 1} style={{ background: 'none', border: 'none', color: index === total - 1 ? '#2a2010' : '#5a4828', fontSize: 18, cursor: index === total - 1 ? 'default' : 'pointer' }}>›</button>
      </div>
    </div>
  );
}