import { useState, useRef, useEffect } from 'react';
import { TimePicker, DatePicker } from './DrumPicker';
import ImageUpload from './ImageUpload';
import ImagePicker from './ImagePicker';
import { useDropZone } from '../drag/useDropZone.js';
import { useDrag } from '../drag/useDrag.js';
import { useDragCtx } from '../drag/DragContext.jsx';

const ALL_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const prevDayName = day => ALL_DAYS[(ALL_DAYS.indexOf(day) - 1 + 7) % 7];
const nextDayName = day => ALL_DAYS[(ALL_DAYS.indexOf(day) + 1) % 7];
const createDay = day => ({ day, date: '', events: [] });

// ── Event card ────────────────────────────────────────────────
function EventCard({ event, dayIdx, eventIdx, onUpdate, onRemove, presets }) {
  const [expanded, setExpanded] = useState(false);
  const original = presets?.find(p => p.id === event.presetId);
  const color = event.color ?? '#b8860b';
  const cardRef = useRef(null);
  const { onMouseDown: onSortDrag } = useDrag('event-sort', { event, dayIdx, eventIdx });
  const { registerSortZone } = useDragCtx();

  useEffect(() => {
    registerSortZone(`event-${dayIdx}-${eventIdx}`, cardRef.current, { event, dayIdx, eventIdx });
    return () => registerSortZone(`event-${dayIdx}-${eventIdx}`, null, null);
  }, [event, dayIdx, eventIdx, registerSortZone]);

  const upd = (k, v) => {
    const updated = { ...event, [k]: v };
    if (original) {
      updated.modified =
        updated.name !== original.name ||
        updated.time !== original.defaultTime ||
        updated.timeTo !== original.defaultTimeTo ||
        updated.notes !== original.notes;
    } else updated.modified = true;
    onUpdate(updated);
  };

  const addContact = () => upd('contacts', [...(event.contacts ?? []), { name: '', phone: '' }]);
  const updContact = (i, k, v) => { const c = [...(event.contacts ?? [])]; c[i] = { ...c[i], [k]: v }; upd('contacts', c); };
  const remContact = i => upd('contacts', (event.contacts ?? []).filter((_, j) => j !== i));

  return (
    <div
      ref={cardRef}
      style={{
      borderRadius: 10, overflow: 'hidden',
      border: `1.5px solid ${expanded ? color : '#e8d9c0'}`,
      borderLeft: `4px solid ${color}`,
      background: '#fff',
      boxShadow: '0 1px 4px rgba(92,61,30,0.06)',
      opacity: 1,
      marginBottom: 8, userSelect: 'none',
    }}>
      {event.image && !expanded && (
        <div style={{ width: '100%', background: '#fdf6ec', display: 'flex', justifyContent: 'center', borderBottom: '1px solid #f0e4cc' }}>
          <img src={event.image} alt="" style={{ maxWidth: '100%', maxHeight: 100, objectFit: 'contain', display: 'block' }} />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 10px' }}>
        <div onMouseDown={e => { e.stopPropagation(); onSortDrag(e); }} style={{ color: '#d0b88a', fontSize: 15, cursor: 'grab', flexShrink: 0, lineHeight: 1 }}>⠿</div>

        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: event.modified ? 700 : 600, color: '#3d2408' }}>{event.name}</span>
            {event.modified && (
              <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}18`, padding: '1px 5px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>modified</span>
            )}
          </div>
          {(event.time || event.timeTo) && (
            <div style={{ fontSize: 11, color: '#b0956e', marginTop: 1 }}>
              {event.time}{event.timeTo ? ` → ${event.timeTo}` : ''}
            </div>
          )}
        </div>

        <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', color: '#c4a882', fontSize: 12, cursor: 'pointer', padding: '2px 4px' }}>{expanded ? '▲' : '▼'}</button>
        <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 13, cursor: 'pointer', padding: '2px 4px' }}>✕</button>
      </div>

      {expanded && (
        <div style={{ padding: '0 12px 14px', borderTop: '1px solid #f5ede0' }}>
          <div style={{ paddingTop: 12, marginBottom: 10 }}>
            <Label>Name</Label>
            <input value={event.name} onChange={e => upd('name', e.target.value)} style={field} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Label>Time</Label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <TimePicker value={event.time} onChange={v => upd('time', v)} placeholder="Start" />
              <span style={{ color: '#c9a96e', fontSize: 13 }}>→</span>
              <TimePicker value={event.timeTo} onChange={v => upd('timeTo', v)} placeholder="End" />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Label>Image</Label>
            <ImagePicker value={event.image ?? ''} onChange={v => upd('image', v)} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Label>Notes</Label>
            <textarea value={event.notes} onChange={e => upd('notes', e.target.value)} rows={2} style={{ ...field, resize: 'vertical' }} placeholder="Add notes..." />
          </div>
          <div>
            <Label>Contacts</Label>
            {(event.contacts ?? []).map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input value={c.name} onChange={e => updContact(i, 'name', e.target.value)} placeholder="Name" style={field} />
                <input value={c.phone} onChange={e => updContact(i, 'phone', e.target.value)} placeholder="Phone" style={{ ...field, width: 120, flex: 'none' }} />
                <button onClick={() => remContact(i)} style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 13 }}>✕</button>
              </div>
            ))}
            <button onClick={addContact} style={ghostBtn}>+ Add contact</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Day drop zone ─────────────────────────────────────────────
function DayDropZone({ dayData, dayIdx, onUpdateDay, onRemoveDay, presets }) {
  const { ref, isOver } = useDropZone(`day-${dayIdx}`, { dayIdx });

  const updateEvent = (i, updated) => {
    const events = [...dayData.events]; events[i] = updated; onUpdateDay({ ...dayData, events });
  };
  const removeEvent = i => onUpdateDay({ ...dayData, events: dayData.events.filter((_, j) => j !== i) });

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#5c3d1e', minWidth: 80 }}>{dayData.day}</span>
        <DatePicker value={dayData.date ?? ''} onChange={v => onUpdateDay({ ...dayData, date: v })} />
        <div style={{ flex: 1, height: 1, background: '#e8d9c0' }} />
        <button onClick={onRemoveDay} title="Remove day" style={{ background: 'none', border: 'none', color: '#d0b88a', fontSize: 12, cursor: 'pointer', padding: '2px 4px' }}>✕</button>
      </div>

      <div
        ref={ref}
        style={{
          minHeight: 56, borderRadius: 10,
          border: `1.5px dashed ${isOver ? '#b8860b' : '#e8d9c0'}`,
          background: isOver ? '#fffbf0' : 'transparent',
          padding: dayData.events.length > 0 ? '8px 8px 2px' : 0,
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        {dayData.events.length === 0 && (
          <div style={{ padding: '14px 0', textAlign: 'center', color: isOver ? '#b8860b' : '#d0c4a8', fontSize: 12, fontWeight: isOver ? 600 : 400 }}>
            {isOver ? '↓ Drop here' : 'Drag events here'}
          </div>
        )}
        {dayData.events.map((event, i) => (
          <EventCard
            key={event.id}
            event={event}
            dayIdx={dayIdx}
            eventIdx={i}
            onUpdate={updated => updateEvent(i, updated)}
            onRemove={() => removeEvent(i)}
            presets={presets}
          />
        ))}
      </div>
    </div>
  );
}

// ── Insert button ─────────────────────────────────────────────
function InsertBtn({ label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0', cursor: 'pointer', opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
      <div style={{ flex: 1, height: 1, background: '#e0cba8' }} />
      <span style={{ fontSize: 11, color: '#b8860b', fontWeight: 600, whiteSpace: 'nowrap', padding: '2px 10px', background: '#fff8ee', borderRadius: 10, border: '1px solid #e8d5a8' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: '#e0cba8' }} />
    </div>
  );
}

// ── Weekly view ───────────────────────────────────────────────
export default function WeeklyView({ bulletin, onUpdateBulletin, presets }) {
  const insertDay = (atIdx, position) => {
    const refDay = bulletin.days[atIdx].day;
    const newDayName = position === 'before' ? prevDayName(refDay) : nextDayName(refDay);
    const days = [...bulletin.days];
    days.splice(position === 'before' ? atIdx : atIdx + 1, 0, createDay(newDayName));
    onUpdateBulletin({ ...bulletin, days });
  };

  const removeDay = i => onUpdateBulletin({ ...bulletin, days: bulletin.days.filter((_, j) => j !== i) });

  const updateDay = (i, updated) => {
    const days = [...bulletin.days]; days[i] = updated; onUpdateBulletin({ ...bulletin, days });
  };

  return (
    <div>
      {bulletin.days.length > 0 && (
        <InsertBtn label={`+ ${prevDayName(bulletin.days[0].day)}`} onClick={() => insertDay(0, 'before')} />
      )}
      {bulletin.days.map((day, i) => (
        <DayDropZone key={`${day.day}-${i}`} dayData={day} dayIdx={i}
          onUpdateDay={updated => updateDay(i, updated)}
          onRemoveDay={() => removeDay(i)}
          presets={presets}
        />
      ))}
      {bulletin.days.length > 0 && (
        <InsertBtn label={`+ ${nextDayName(bulletin.days[bulletin.days.length - 1].day)}`} onClick={() => insertDay(bulletin.days.length - 1, 'after')} />
      )}
    </div>
  );
}

const field = { padding: '7px 10px', fontSize: 13, border: '1.5px solid #e0cba8', borderRadius: 7, background: '#fff', color: '#3d2408', width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif' };
const ghostBtn = { padding: '5px 12px', background: 'none', border: '1.5px dashed #c9a96e', borderRadius: 6, color: '#7a5230', fontSize: 12, cursor: 'pointer' };
const Label = ({ children }) => <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>{children}</div>;