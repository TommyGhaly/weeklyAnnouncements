import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

const ITEM_H = 40;
const VISIBLE = 5;
const PAD = Math.floor(VISIBLE / 2);

function DrumColumn({ items, value, onChange, width = 64, label }) {
  const ref = useRef(null);
  const idx = Math.max(0, items.indexOf(value));
  const dragging = useRef(false);
  const startY = useRef(0);
  const startScroll = useRef(0);
  const snapTimer = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = idx * ITEM_H;
  }, []);

  const snap = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    el.scrollTop = clamped * ITEM_H;
    onChange(items[clamped]);
  }, [items, onChange]);

  const onScroll = () => {
    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(snap, 120);
  };

  const onMouseDown = e => {
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    startScroll.current = ref.current.scrollTop;
  };

  useEffect(() => {
    const move = e => {
      if (!dragging.current) return;
      ref.current.scrollTop = startScroll.current + (startY.current - e.clientY);
    };
    const up = () => { if (dragging.current) { dragging.current = false; snap(); } };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [snap]);

  const paddedItems = [...Array(PAD).fill(null), ...items, ...Array(PAD).fill(null)];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {label && <div style={{ fontSize: 10, color: '#b0956e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>{label}</div>}
      <div
        ref={ref}
        onMouseDown={onMouseDown}
        onScroll={onScroll}
        onTouchStart={e => { startY.current = e.touches[0].clientY; startScroll.current = ref.current.scrollTop; }}
        onTouchMove={e => { ref.current.scrollTop = startScroll.current + (startY.current - e.touches[0].clientY); }}
        onTouchEnd={snap}
        style={{
          width, height: ITEM_H * VISIBLE,
          overflowY: 'scroll', scrollbarWidth: 'none',
          msOverflowStyle: 'none', cursor: 'ns-resize',
          userSelect: 'none', position: 'relative',
        }}
      >
        <style>{`.drum-hide-scroll::-webkit-scrollbar{display:none}`}</style>
        {paddedItems.map((item, i) => {
          const realIdx = i - PAD;
          const dist = Math.abs(realIdx - idx);
          return (
            <div
              key={i}
              onClick={() => {
                if (!item) return;
                const ni = items.indexOf(item);
                ref.current.scrollTop = ni * ITEM_H;
                onChange(item);
              }}
              style={{
                height: ITEM_H,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: dist === 0 ? 16 : 14,
                fontWeight: dist === 0 ? 700 : 500,
                color: dist === 0 ? '#3d2408' : dist === 1 ? '#7a5230' : '#a07850',
                opacity: dist === 0 ? 1 : dist === 1 ? 0.85 : 0.5,
                transform: `scale(${dist === 0 ? 1 : dist === 1 ? 0.92 : 0.82})`,
                transition: 'all 0.1s',
                cursor: item ? 'pointer' : 'default',
              }}
            >
              {item ?? ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Popover({ anchor, children, onClose }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  useEffect(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const popW = 220;
    let left = r.left;
    if (left + popW > window.innerWidth - 12) left = window.innerWidth - popW - 12;
    setPos({ top: r.bottom + 6, left });
  }, [anchor]);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target) && !anchor?.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, [anchor, onClose]);

  return createPortal(
    <div ref={ref} style={{
      position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
      background: '#fff', borderRadius: 16,
      border: '1.5px solid #e0cba8',
      boxShadow: '0 12px 40px rgba(92,61,30,0.22)',
      overflow: 'hidden',
    }}>
      {children}
    </div>,
    document.body
  );
}

// ── Time Picker ──────────────────────────────────────────────
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ['00', '15', '30', '45'];
const AMPM = ['am', 'pm'];

function parseTime(val) {
  if (!val) return { h: '12', m: '00', ap: 'am' };
  const match = val.match(/(\d+):(\d+)(am|pm)/i);
  if (!match) return { h: '12', m: '00', ap: 'am' };
  const snapped = MINUTES.reduce((p, c) => Math.abs(+c - +match[2]) < Math.abs(+p - +match[2]) ? c : p);
  return { h: String(parseInt(match[1])), m: snapped, ap: match[3].toLowerCase() };
}

export function TimePicker({ value, onChange, placeholder = 'Time' }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const { h, m, ap } = parseTime(value);

  return (
    <div style={{ position: 'relative', width: 110 }}>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '8px 10px', textAlign: 'left',
          border: `1.5px solid ${value ? '#c9a96e' : '#e0cba8'}`,
          borderRadius: 8, background: value ? '#fff8ee' : '#fff',
          color: value ? '#5c3d1e' : '#b0956e',
          fontSize: 13, fontWeight: value ? 600 : 400,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span>{value || placeholder}</span>
        <span style={{ fontSize: 9, color: '#b0956e' }}>▾</span>
      </button>

      {open && (
        <Popover anchor={btnRef.current} onClose={() => setOpen(false)}>
          <div style={{ padding: '14px 16px 0' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', top: ITEM_H * PAD, left: 0, right: 0, height: ITEM_H,
                background: '#fff8ee', borderTop: '1.5px solid #e8d5a8', borderBottom: '1.5px solid #e8d5a8',
                borderRadius: 8, pointerEvents: 'none', zIndex: 1,
              }} />
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                <DrumColumn items={HOURS} value={h} onChange={nh => onChange(`${nh}:${m}${ap}`)} width={52} label="hr" />
                <div style={{ display: 'flex', alignItems: 'center', height: ITEM_H * VISIBLE + 24, paddingTop: 24 }}>
                  <span style={{ fontSize: 18, color: '#c9a96e', fontWeight: 700 }}>:</span>
                </div>
                <DrumColumn items={MINUTES} value={m} onChange={nm => onChange(`${h}:${nm}${ap}`)} width={52} label="min" />
                <DrumColumn items={AMPM} value={ap} onChange={nap => onChange(`${h}:${m}${nap}`)} width={44} label="" />
              </div>
            </div>
          </div>
          <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0e4cc', marginTop: 8 }}>
            <button onClick={() => { onChange(''); setOpen(false); }} style={{ fontSize: 12, color: '#b0956e', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
            <button onClick={() => setOpen(false)} style={{ fontSize: 13, color: '#5c3d1e', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Done</button>
          </div>
        </Popover>
      )}
    </div>
  );
}

// ── Date Picker ──────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEARS = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() + i - 1));

function daysInMonth(month, year) {
  return new Date(parseInt(year), MONTHS.indexOf(month) + 1, 0).getDate();
}

function parseDate(val) {
  const now = new Date();
  if (!val) return { day: String(now.getDate()), month: MONTHS[now.getMonth()], year: String(now.getFullYear()) };
  const d = new Date(val + 'T00:00:00');
  return { day: String(d.getDate()), month: MONTHS[d.getMonth()], year: String(d.getFullYear()) };
}

function toISODate(day, month, year) {
  const m = String(MONTHS.indexOf(month) + 1).padStart(2, '0');
  const d = String(parseInt(day)).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function displayDate(val) {
  if (!val) return null;
  return new Date(val + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const { day, month, year } = parseDate(value);
  const DAYS_LIST = Array.from({ length: daysInMonth(month, year) }, (_, i) => String(i + 1));

  const update = (d, mo, y) => {
    const safeDay = String(Math.min(parseInt(d), daysInMonth(mo, y)));
    onChange(toISODate(safeDay, mo, y));
  };

  return (
    <div>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '8px 12px',
          border: `1.5px solid ${value ? '#c9a96e' : '#e0cba8'}`,
          borderRadius: 8, background: value ? '#fff8ee' : '#fff',
          color: value ? '#5c3d1e' : '#b0956e',
          fontSize: 13, fontWeight: value ? 600 : 400,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <span>{value ? displayDate(value) : 'Pick date'}</span>
        <span style={{ fontSize: 9, color: '#b0956e' }}>▾</span>
      </button>

      {open && (
        <Popover anchor={btnRef.current} onClose={() => setOpen(false)}>
          <div style={{ padding: '14px 16px 0' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', top: ITEM_H * PAD, left: 0, right: 0, height: ITEM_H,
                background: '#fff8ee', borderTop: '1.5px solid #e8d5a8', borderBottom: '1.5px solid #e8d5a8',
                borderRadius: 8, pointerEvents: 'none', zIndex: 1,
              }} />
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                <DrumColumn items={MONTHS} value={month} onChange={mo => update(day, mo, year)} width={68} label="month" />
                <DrumColumn items={DAYS_LIST} value={day} onChange={d => update(d, month, year)} width={52} label="day" />
                <DrumColumn items={YEARS} value={year} onChange={y => update(day, month, y)} width={64} label="year" />
              </div>
            </div>
          </div>
          <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0e4cc', marginTop: 8 }}>
            <button onClick={() => { onChange(''); setOpen(false); }} style={{ fontSize: 12, color: '#b0956e', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
            <button onClick={() => setOpen(false)} style={{ fontSize: 13, color: '#5c3d1e', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Done</button>
          </div>
        </Popover>
      )}
    </div>
  );
}