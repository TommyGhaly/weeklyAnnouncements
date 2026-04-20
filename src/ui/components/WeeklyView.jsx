import { useState, useRef, useEffect } from 'react';
import { TimePicker, DatePicker } from './DrumPicker';
import ImagePicker from './ImagePicker';
import { useDropZone } from '../drag/useDropZone.js';
import { useDrag } from '../drag/useDrag.js';
import { useDragCtx } from '../drag/DragContext.jsx';

const ALL_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const prevDayName = day => ALL_DAYS[(ALL_DAYS.indexOf(day) - 1 + 7) % 7];
const nextDayName = day => ALL_DAYS[(ALL_DAYS.indexOf(day) + 1) % 7];

function computeInsertDate(refDay, position) {
  if (!refDay.date) return '';
  try {
    const d = new Date(refDay.date + 'T00:00:00');
    d.setDate(d.getDate() + (position === 'before' ? -1 : 1));
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  } catch { return ''; }
}

const createDay = (day, date = '') => ({ day, date, events: [] });

// ── Event card ─────────────────────────────────────────────────
function EventCard({ event, dayIdx, eventIdx, onUpdate, onRemove, presets }) {
  const [expanded, setExpanded] = useState(false);
  const original = presets?.find(p => p.id === event.presetId);
  const color = event.color ?? '#b8860b';
  const cardRef = useRef(null);
  const { onMouseDown: onSortDrag } = useDrag('event-sort', { event, dayIdx, eventIdx });
  const { dragging, overSort, registerSortZone } = useDragCtx();
  const sortId = `event-${dayIdx}-${eventIdx}`;
  const isBeingDragged = dragging?.type === 'event-sort'
    && dragging?.data?.dayIdx === dayIdx
    && dragging?.data?.eventIdx === eventIdx;
  const indicator = overSort?.id === sortId && dragging?.type === 'event-sort' && !isBeingDragged
    ? overSort.position : null;

  useEffect(() => {
    registerSortZone(sortId, cardRef.current, { event, dayIdx, eventIdx });
    return () => registerSortZone(sortId, null, null);
  }, [event, dayIdx, eventIdx, registerSortZone, sortId]);

  const upd = (k, v) => {
    const updated = { ...event, [k]: v };
    if (original) {
      updated.modified =
        updated.name !== original.name ||
        updated.time !== original.defaultTime ||
        updated.timeTo !== original.defaultTimeTo ||
        updated.notes !== original.notes;
    } else {
      updated.modified = true;
    }
    onUpdate(updated);
  };

  const addContact = () => upd('contacts', [...(event.contacts ?? []), { name: '', phone: '' }]);
  const updContact = (i, k, v) => { const c = [...(event.contacts ?? [])]; c[i] = { ...c[i], [k]: v }; upd('contacts', c); };
  const remContact = i => upd('contacts', (event.contacts ?? []).filter((_, j) => j !== i));

  return (
    <div style={{ position: 'relative' }}>
      {indicator === 'before' && <DropBar color={color} />}
      <div ref={cardRef} style={{
        borderRadius: 10, overflow: 'hidden',
        border: `1.5px solid ${expanded ? color : '#e8d9c0'}`,
        borderLeft: `4px solid ${color}`,
        background: '#fff',
        boxShadow: '0 1px 4px rgba(92,61,30,0.06)',
        marginBottom: 8,
        opacity: isBeingDragged ? 0.4 : 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer' }}
          onClick={() => setExpanded(e => !e)}>
          <div onMouseDown={onSortDrag} style={{ cursor: 'grab', color: '#d0b88a', fontSize: 12, padding: '0 2px', userSelect: 'none' }}>⠿</div>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#3d2408' }}>{event.name || 'Unnamed event'}</span>
          {event.modified && <span style={{ fontSize: 9, color: '#b8860b', background: '#fdf6ec', padding: '1px 5px', borderRadius: 3, border: '1px solid #e8d9c0' }}>edited</span>}
          {event.time && <span style={{ fontSize: 11, color: '#b0956e' }}>{event.time}{event.timeTo ? ` → ${event.timeTo}` : ''}</span>}
          <button onClick={e => { e.stopPropagation(); onRemove(); }}
            style={{ background: 'none', border: 'none', color: '#d0b88a', fontSize: 14, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>✕</button>
          <span style={{ fontSize: 10, color: '#d0b88a' }}>{expanded ? '▲' : '▼'}</span>
        </div>

        {expanded && (
          <div style={{ padding: '0 12px 12px', borderTop: '1px solid #f0e4cc' }}>
            <div style={{ marginTop: 10 }}>
              <Label>Name</Label>
              <input value={event.name} onChange={e => upd('name', e.target.value)} style={fieldStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              <div>
                <Label>Start time</Label>
                <TimePicker value={event.time ?? ''} onChange={v => upd('time', v)} />
              </div>
              <div>
                <Label>End time</Label>
                <TimePicker value={event.timeTo ?? ''} onChange={v => upd('timeTo', v)} />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <Label>Notes</Label>
              <input value={event.notes ?? ''} onChange={e => upd('notes', e.target.value)} style={fieldStyle} placeholder="Optional subtitle..." />
            </div>
            <div style={{ marginTop: 10 }}>
              <Label>Image</Label>
              <ImagePicker value={event.image ?? ''} onChange={v => upd('image', v)} />
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Label>Contacts</Label>
                <button onClick={addContact} style={ghostBtn}>+ Add</button>
              </div>
              {(event.contacts ?? []).map((ct, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <input value={ct.name} onChange={e => updContact(i, 'name', e.target.value)} placeholder="Name" style={{ ...fieldStyle, flex: 1.5 }} />
                  <input value={ct.phone ?? ''} onChange={e => updContact(i, 'phone', e.target.value)} placeholder="Phone" style={{ ...fieldStyle, flex: 1 }} />
                  <button onClick={() => remContact(i)} style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 13, cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {indicator === 'after' && <DropBar color={color} />}
    </div>
  );
}

// ── Remove day warning modal ───────────────────────────────────
function RemoveDayModal({ day, onConfirm, onCancel }) {
  const hasEvents = (day.events ?? []).length > 0;
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 360, padding: '28px 28px 24px', boxShadow: '0 16px 48px rgba(0,0,0,0.25)', border: '1.5px solid #e8d9c0' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#3d2408', marginBottom: 8, fontFamily: 'Playfair Display, serif' }}>
          Remove {day.day}?
        </div>
        {hasEvents ? (
          <div style={{ fontSize: 13, color: '#c0392b', background: '#fdf0ed', padding: '10px 14px', borderRadius: 8, border: '1px solid #f5c6cb', marginBottom: 16, lineHeight: 1.5 }}>
            ⚠️ This day has {day.events.length} event{day.events.length > 1 ? 's' : ''} — they will be permanently deleted.
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#7a5230', marginBottom: 16, lineHeight: 1.5 }}>
            This day has no events. It will be removed from the schedule.
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onCancel} style={{ padding: '8px 18px', background: '#f4ece0', border: '1px solid #e0cba8', borderRadius: 8, fontSize: 13, color: '#5c3d1e', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ padding: '8px 22px', background: hasEvents ? '#c0392b' : '#b8860b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Day drop zone ─────────────────────────────────────────────
function DayDropZone({ dayData, dayIdx, onUpdateDay, onRemoveDay, presets }) {
  const { ref: dropRef, isOver } = useDropZone(`day-${dayIdx}`, { dayIdx });

  const updateEvent = (i, updated) => {
    const events = [...dayData.events]; events[i] = updated; onUpdateDay({ ...dayData, events });
  };
  const removeEvent = i => onUpdateDay({ ...dayData, events: dayData.events.filter((_, j) => j !== i) });
  const addEvent    = () => onUpdateDay({ ...dayData, events: [...dayData.events, { id: crypto.randomUUID(), name: 'New Event', time: '', timeTo: '', notes: '', contacts: [], color: '#b8860b', modified: true }] });

  return (
    <div style={{ marginBottom: 8, borderRadius: 12, border: '1.5px solid #e8d9c0', background: '#fdf6ec', overflow: 'hidden' }}>
      {/* Day header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#fff8ee', borderBottom: '1px solid #f0e4cc' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#5c3d1e' }}>{dayData.day}</span>
          {dayData.date && (
            <span style={{ fontSize: 11, color: '#b0956e', fontWeight: 500 }}>
              {new Date(dayData.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        <DatePicker value={dayData.date ?? ''} onChange={v => onUpdateDay({ ...dayData, date: v })} />
        <div style={{ flex: 1, height: 1, background: '#e8d9c0' }} />
        {onRemoveDay && (
          <button onClick={onRemoveDay} style={{ background: 'none', border: 'none', color: '#d0b88a', fontSize: 12, cursor: 'pointer', padding: '2px 4px', borderRadius: 4, lineHeight: 1 }} title={`Remove ${dayData.day}`}>
            ✕ Remove day
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div ref={dropRef} style={{
        padding: dayData.events.length > 0 ? '8px 8px 2px' : '0',
        minHeight: 0,
        background: isOver ? '#fff8ee' : 'transparent',
        transition: 'background 0.15s',
      }}>
        {dayData.events.length === 0 && (
          <div style={{ padding: '14px 0', textAlign: 'center', color: isOver ? '#b8860b' : '#d0b88a', fontSize: 12, fontWeight: isOver ? 600 : 400 }}>
            {isOver ? 'Drop here' : 'Drag events here or add manually'}
          </div>
        )}
        {dayData.events.map((event, i) => (
          <EventCard
            key={event.id ?? i}
            event={event}
            dayIdx={dayIdx}
            eventIdx={i}
            onUpdate={updated => updateEvent(i, updated)}
            onRemove={() => removeEvent(i)}
            presets={presets}
          />
        ))}
      </div>

      {/* Add event manually */}
      <div style={{ padding: '6px 8px 8px' }}>
        <button onClick={addEvent} style={{ ...ghostBtn, width: '100%', textAlign: 'center' }}>+ Add event manually</button>
      </div>
    </div>
  );
}

// ── Insert button ─────────────────────────────────────────────
function InsertBtn({ label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        margin: '4px 0', cursor: 'pointer',
        opacity: hovered ? 1 : 0.4,
        transition: 'opacity 0.15s',
      }}
    >
      <div style={{ flex: 1, height: 1, background: '#e0cba8' }} />
      <span style={{ fontSize: 11, color: '#b8860b', fontWeight: 600, whiteSpace: 'nowrap', padding: '2px 8px', background: '#fff8ee', borderRadius: 10, border: '1px solid #e0cba8' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: '#e0cba8' }} />
    </div>
  );
}

function DropBar({ color = '#b8860b' }) {
  return (
    <div style={{
      height: 3, background: color, borderRadius: 2,
      margin: '0 0 4px', boxShadow: `0 0 8px ${color}88`,
    }} />
  );
}

// ── Main export ───────────────────────────────────────────────
export default function WeeklyView({ bulletin, onUpdateBulletin, presets }) {
  // Track which day index is pending removal (for the confirm modal)
  const [pendingRemove, setPendingRemove] = useState(null);

  const insertDay = (atIdx, position) => {
    const refDay = bulletin.days[atIdx];
    const newDayName = position === 'before' ? prevDayName(refDay.day) : nextDayName(refDay.day);
    const newDate = computeInsertDate(refDay, position);
    const days = [...bulletin.days];
    days.splice(position === 'before' ? atIdx : atIdx + 1, 0, createDay(newDayName, newDate));
    onUpdateBulletin({ ...bulletin, days });
  };

  // Only allow removing first or last day — show confirm modal
  const requestRemoveDay = i => {
    const isEndpoint = i === 0 || i === bulletin.days.length - 1;
    if (!isEndpoint) return; // shouldn't be callable anyway
    setPendingRemove(i);
  };

  const confirmRemoveDay = () => {
    if (pendingRemove === null) return;
    onUpdateBulletin({ ...bulletin, days: bulletin.days.filter((_, j) => j !== pendingRemove) });
    setPendingRemove(null);
  };

  const updateDay = (i, updated) => {
    const days = [...bulletin.days]; days[i] = updated; onUpdateBulletin({ ...bulletin, days });
  };

  return (
    <div>
      {/* Confirm modal */}
      {pendingRemove !== null && (
        <RemoveDayModal
          day={bulletin.days[pendingRemove]}
          onConfirm={confirmRemoveDay}
          onCancel={() => setPendingRemove(null)}
        />
      )}

      {/* Add before first */}
      {bulletin.days.length > 0 && (
        <InsertBtn
          label={`+ ${prevDayName(bulletin.days[0].day)}`}
          onClick={() => insertDay(0, 'before')}
        />
      )}

      {bulletin.days.map((day, i) => (
        <DayDropZone
          key={`${day.day}-${i}`}
          dayData={day}
          dayIdx={i}
          onUpdateDay={updated => updateDay(i, updated)}
          // Only pass remove handler for first and last day
          onRemoveDay={
            (i === 0 || i === bulletin.days.length - 1)
              ? () => requestRemoveDay(i)
              : null
          }
          presets={presets}
        />
      ))}

      {/* Add after last */}
      {bulletin.days.length > 0 && (
        <InsertBtn
          label={`+ ${nextDayName(bulletin.days[bulletin.days.length - 1].day)}`}
          onClick={() => insertDay(bulletin.days.length - 1, 'after')}
        />
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────
const fieldStyle = { padding: '7px 10px', fontSize: 13, border: '1.5px solid #e0cba8', borderRadius: 7, background: '#fff', color: '#3d2408', width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif' };
const ghostBtn   = { padding: '5px 12px', background: 'none', border: '1.5px dashed #c9a96e', borderRadius: 6, color: '#7a5230', fontSize: 12, cursor: 'pointer' };
const Label = ({ children }) => <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>{children}</div>;