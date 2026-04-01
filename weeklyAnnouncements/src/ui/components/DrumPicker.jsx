import { useRef, useEffect, useState, useCallback, forwardRef } from 'react';
import { createPortal } from 'react-dom';

const H = 44;
const VISIBLE = 7;
const PAD = 3;

// ── Anchor position (absolute, scrolls with page) ─────────────
function useAnchorPos(btnRef, open, width = 210) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    setPos({
      top: r.bottom + scrollY + 4,
      left: Math.min(r.left + scrollX, window.innerWidth - width - 8),
    });
  }, [open]);
  return pos;
}

function ClickAway({ children, onClose, skipRef }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = e => {
      if (ref.current && !ref.current.contains(e.target) && !skipRef?.current?.contains(e.target))
        onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return <div ref={ref}>{children}</div>;
}

// ── Chip ──────────────────────────────────────────────────────
const Chip = forwardRef(function Chip({ value, display, placeholder, icon, onClick, onClear }, ref) {
  return (
    <button ref={ref} onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '6px 10px',
      border: `1.5px solid ${value ? '#c9a96e' : '#e0cba8'}`,
      borderRadius: 8,
      background: value ? '#fff8ee' : '#fff',
      color: value ? '#5c3d1e' : '#b0956e',
      fontSize: 12, fontWeight: value ? 600 : 400,
      cursor: 'pointer', whiteSpace: 'nowrap',
    }}>
      {icon && <span>{icon}</span>}
      <span>{display ?? value ?? placeholder}</span>
      {value
        ? <span onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onClear(); }}
            style={{ fontSize: 11, color: '#c0392b', lineHeight: 1, padding: '0 2px' }}>✕</span>
        : <span style={{ fontSize: 9, color: '#c4a882' }}>▾</span>
      }
    </button>
  );
});

// ── Single drum column ────────────────────────────────────────
function Column({ items, value, onChange, width = 56, label }) {
  const ref = useRef(null);
  const idx = Math.max(0, items.indexOf(value));
  const drag = useRef({ on: false, y0: 0, s0: 0 });

  const scrollTo = useCallback((i, smooth = false) => {
    ref.current?.scrollTo({ top: i * H, behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  useEffect(() => { scrollTo(idx); }, []);

  const settle = useCallback(() => {
    if (!ref.current) return;
    const i = Math.round(ref.current.scrollTop / H);
    const c = Math.max(0, Math.min(items.length - 1, i));
    scrollTo(c, true);
    onChange(items[c]);
  }, [items, onChange, scrollTo]);

  useEffect(() => {
    const mm = e => {
      if (!drag.current.on) return;
      ref.current.scrollTop = drag.current.s0 + drag.current.y0 - e.clientY;
    };
    const mu = () => {
      if (drag.current.on) { drag.current.on = false; settle(); }
    };
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    return () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); };
  }, [settle]);

  const padded = [...Array(PAD).fill(null), ...items, ...Array(PAD).fill(null)];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width }}>
      {label && (
        <div style={{ fontSize: 10, fontWeight: 700, color: '#c4a882', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, height: 16 }}>
          {label}
        </div>
      )}
      {!label && <div style={{ height: 16 }} />}
      <div
        ref={ref}
        onScroll={() => { clearTimeout(ref.current._t); ref.current._t = setTimeout(settle, 90); }}
        onMouseDown={e => { e.preventDefault(); drag.current = { on: true, y0: e.clientY, s0: ref.current.scrollTop }; }}
        onTouchStart={e => { drag.current = { on: true, y0: e.touches[0].clientY, s0: ref.current.scrollTop }; }}
        onTouchMove={e => { e.preventDefault(); ref.current.scrollTop = drag.current.s0 + drag.current.y0 - e.touches[0].clientY; }}
        onTouchEnd={settle}
        style={{ height: H * VISIBLE, width, overflowY: 'scroll', scrollbarWidth: 'none', cursor: 'ns-resize', userSelect: 'none' }}
      >
        <style>{`*::-webkit-scrollbar{display:none}`}</style>
        {padded.map((item, i) => {
          if (!item) return <div key={`pad-${i}`} style={{ height: H }} />;
          const dist = Math.abs(items.indexOf(item) - idx);
          return (
            <div
              key={item}
              onClick={() => { scrollTo(items.indexOf(item), true); onChange(item); }}
              style={{
                height: H, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: dist === 0 ? 16 : 13,
                fontWeight: dist === 0 ? 700 : 400,
                color: dist === 0 ? '#3d2408' : dist === 1 ? '#8a6a45' : '#c4a882',
                cursor: 'pointer',
                transition: 'color 0.1s, font-size 0.1s',
                position: 'relative', zIndex: dist === 0 ? 2 : 1,
              }}
            >{item}</div>
          );
        })}
      </div>
    </div>
  );
}

// ── Drum shell ────────────────────────────────────────────────
// The selection band sits at exactly PAD*H from the top of the scroll area.
// The scroll area starts after the 16px label row + 8px top padding = 24px from shell top.
function DrumShell({ columns, onClear, onDone }) {
  const LABEL_H = 22;
  const TOP_PAD = 8;
  const bandTop = TOP_PAD + LABEL_H + PAD * H;

  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ position: 'relative', padding: `${TOP_PAD}px 16px 0` }}>
        {/* Selection band — sits precisely behind center row */}
        <div style={{
          position: 'absolute',
          top: bandTop,
          left: 0, right: 0,
          height: H,
          background: '#fdf3e0',
          borderTop: '1.5px solid #e8d5a8',
          borderBottom: '1.5px solid #e8d5a8',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
        {/* Top fade */}
        <div style={{
          position: 'absolute',
          top: TOP_PAD + LABEL_H,
          left: 0, right: 0,
          height: PAD * H,
          background: 'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none', zIndex: 3,
        }} />
        {/* Bottom fade */}
        <div style={{
          position: 'absolute',
          top: TOP_PAD + LABEL_H + (VISIBLE - PAD) * H,
          left: 0, right: 0,
          height: PAD * H,
          background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none', zIndex: 3,
        }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0, position: 'relative', zIndex: 2 }}>
          {columns.map((col, i) => (
            <Column key={i} items={col.items} value={col.value} onChange={col.onChange} width={col.width ?? 56} label={col.label ?? ''} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid #f0e4cc' }}>
        <button onClick={onClear} style={{ background: 'none', border: 'none', fontSize: 12, color: '#b0956e', cursor: 'pointer' }}>Clear</button>
        <button onClick={onDone} style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: '#5c3d1e', cursor: 'pointer' }}>Done</button>
      </div>
    </div>
  );
}

// ── Time Picker ───────────────────────────────────────────────
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINS = ['00', '15', '30', '45'];
const AMPM = ['am', 'pm'];

function parseTime(val) {
  if (!val) return { h: '12', m: '00', ap: 'am' };
  const match = val.match(/(\d+):(\d+)(am|pm)/i);
  if (!match) return { h: '12', m: '00', ap: 'am' };
  const snap = MINS.reduce((p, c) => Math.abs(+c - +match[2]) < Math.abs(+p - +match[2]) ? c : p);
  return { h: String(+match[1]), m: snap, ap: match[3].toLowerCase() };
}

export function TimePicker({ value, onChange, placeholder = 'Time' }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const pos = useAnchorPos(btnRef, open, 200);
  const { h, m, ap } = parseTime(value);
  const set = (nh, nm, nap) => onChange(`${nh}:${nm}${nap}`);

  return (
    <>
      <Chip ref={btnRef} value={value} placeholder={placeholder}
        onClick={() => setOpen(o => !o)}
        onClear={() => { onChange(''); setOpen(false); }} />
      {open && createPortal(
        <ClickAway onClose={() => setOpen(false)} skipRef={btnRef}>
          <div style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999, width: 200, borderRadius: 16, border: '1.5px solid #e8d5a8', boxShadow: '0 16px 48px rgba(92,61,30,0.18)' }}>
            <DrumShell
              columns={[
                { label: 'hr', items: HOURS, value: h, onChange: v => set(v, m, ap), width: 60 },
                { label: 'min', items: MINS, value: m, onChange: v => set(h, v, ap), width: 60 },
                { label: '', items: AMPM, value: ap, onChange: v => set(h, m, v), width: 48 },
              ]}
              onClear={() => { onChange(''); setOpen(false); }}
              onDone={() => setOpen(false)}
            />
          </div>
        </ClickAway>,
        document.body
      )}
    </>
  );
}

// ── Date Picker ───────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function parseCalDate(val) {
  if (!val) return null;
  const d = new Date(val + 'T00:00:00');
  return { y: d.getFullYear(), mo: d.getMonth(), d: d.getDate() };
}

function toISO(y, mo, d) {
  return `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function fmtDate(val) {
  if (!val) return null;
  return new Date(val + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const pos = useAnchorPos(btnRef, open, 232);
  const now = new Date();
  const parsed = parseCalDate(value);
  const [vy, setVy] = useState(parsed?.y ?? now.getFullYear());
  const [vmo, setVmo] = useState(parsed?.mo ?? now.getMonth());

  const firstDow = new Date(vy, vmo, 1).getDay();
  const dim = new Date(vy, vmo + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const prevMo = () => vmo === 0 ? (setVmo(11), setVy(y => y - 1)) : setVmo(m => m - 1);
  const nextMo = () => vmo === 11 ? (setVmo(0), setVy(y => y + 1)) : setVmo(m => m + 1);

  const isSel = d => d && parsed && parsed.y === vy && parsed.mo === vmo && parsed.d === d;
  const isToday = d => d && now.getFullYear() === vy && now.getMonth() === vmo && now.getDate() === d;

  return (
    <>
      <Chip ref={btnRef} value={value} display={value ? fmtDate(value) : null}
        placeholder="Set date" icon="📅"
        onClick={() => setOpen(o => !o)}
        onClear={() => { onChange(''); setOpen(false); }} />
      {open && createPortal(
        <ClickAway onClose={() => setOpen(false)} skipRef={btnRef}>
          <div style={{
            position: 'absolute', top: pos.top, left: pos.left,
            zIndex: 9999, width: 232, background: '#fff',
            borderRadius: 16, border: '1.5px solid #e8d5a8',
            boxShadow: '0 16px 48px rgba(92,61,30,0.18)', padding: '14px',
          }}>
            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <button onClick={prevMo} style={{ background: 'none', border: 'none', fontSize: 20, color: '#c4a882', cursor: 'pointer', lineHeight: 1 }}>‹</button>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#3d2408' }}>{MONTH_NAMES[vmo]} {vy}</span>
              <button onClick={nextMo} style={{ background: 'none', border: 'none', fontSize: 20, color: '#c4a882', cursor: 'pointer', lineHeight: 1 }}>›</button>
            </div>

            {/* DOW headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
              {DOW.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#c4a882' }}>{d}</div>)}
            </div>

            {/* Day grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {cells.map((d, i) => (
                <button key={i} onClick={() => d && (onChange(toISO(vy, vmo, d)), setOpen(false))} style={{
                  height: 30, border: 'none', borderRadius: 6,
                  background: isSel(d) ? '#b8860b' : isToday(d) ? '#fdf3e0' : 'transparent',
                  color: isSel(d) ? '#fff' : isToday(d) ? '#b8860b' : d ? '#3d2408' : 'transparent',
                  fontSize: 12, fontWeight: isSel(d) || isToday(d) ? 700 : 400,
                  cursor: d ? 'pointer' : 'default',
                  outline: isToday(d) && !isSel(d) ? '1px solid #e8d5a8' : 'none',
                }}>{d ?? ''}</button>
              ))}
            </div>

            {/* Year strip */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 10, paddingTop: 8, borderTop: '1px solid #f0e4cc' }}>
              {[-1, 0, 1, 2].map(off => {
                const y = now.getFullYear() + off;
                return (
                  <button key={y} onClick={() => setVy(y)} style={{
                    padding: '3px 8px', borderRadius: 6, border: 'none',
                    background: vy === y ? '#b8860b' : 'transparent',
                    color: vy === y ? '#fff' : '#8a6a45',
                    fontSize: 11, fontWeight: vy === y ? 700 : 400, cursor: 'pointer',
                  }}>{y}</button>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid #f0e4cc' }}>
              <button onClick={() => { onChange(''); setOpen(false); }} style={{ background: 'none', border: 'none', fontSize: 12, color: '#b0956e', cursor: 'pointer' }}>Clear</button>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: '#5c3d1e', cursor: 'pointer' }}>Done</button>
            </div>
          </div>
        </ClickAway>,
        document.body
      )}
    </>
  );
}