import { useState } from 'react';
import { TimePicker, DatePicker } from './DrumPicker';

const typeLabels = {
  day: '📅 Day',
  announcement: '📢 Announcement',
  contact: '📞 Contacts',
  event: '🗓 Event',
};

const typeColors = {
  day: '#4a7c59',
  announcement: '#7a5230',
  contact: '#1a5276',
  event: '#6d3b8e',
};

export default function SlideEditor({ slide, index, total, onUpdate, onRemove, onMove }) {
  const color = typeColors[slide.type] ?? '#5c3d1e';
  return (
    <div style={{
      border: '1.5px solid #e8d9c0',
      borderRadius: 10,
      marginBottom: 10,
      overflow: 'hidden',
      background: '#fff',
      boxShadow: '0 1px 4px rgba(92,61,30,0.06)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '9px 14px',
        background: `linear-gradient(to right, ${color}12, transparent)`,
        borderBottom: '1.5px solid #f0e4cc',
        borderLeft: `3px solid ${color}`,
      }}>
        <span style={{ fontWeight: 600, fontSize: 13, color }}>
          {typeLabels[slide.type]}{slide.type === 'day' ? ` — ${slide.data.day}` : ''}
        </span>
        <div style={{ display: 'flex', gap: 5 }}>
          <Btn onClick={() => onMove(-1)} disabled={index === 0}>↑</Btn>
          <Btn onClick={() => onMove(1)} disabled={index === total - 1}>↓</Btn>
          <Btn onClick={onRemove} danger>✕</Btn>
        </div>
      </div>
      <div style={{ padding: 14 }}>
        {slide.type === 'day' && <DayEditor data={slide.data} onUpdate={onUpdate} />}
        {slide.type === 'announcement' && <AnnouncementEditor data={slide.data} onUpdate={onUpdate} />}
        {slide.type === 'contact' && <ContactEditor data={slide.data} onUpdate={onUpdate} />}
        {slide.type === 'event' && <EventEditor data={slide.data} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}

function Btn({ onClick, disabled, danger, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: danger ? '#fff5f5' : '#fdf6ec',
      border: `1.5px solid ${danger ? '#f5c6c6' : '#e0cba8'}`,
      borderRadius: 5, fontSize: 12,
      color: disabled ? '#ccc' : danger ? '#c0392b' : '#7a5230',
      cursor: disabled ? 'default' : 'pointer',
    }}>{children}</button>
  );
}

function AddBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      marginTop: 8, padding: '6px 14px',
      background: '#fdf6ec', border: '1.5px dashed #c9a96e',
      borderRadius: 7, color: '#7a5230', fontSize: 12, cursor: 'pointer',
    }}>{children}</button>
  );
}

function Row({ children }) {
  return <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>{children}</div>;
}

function toInput(t) {
  if (!t) return '';
  const match = t.match(/(\d+):(\d+)\s*(am|pm)/i);
  if (!match) return '';
  let h = parseInt(match[1]);
  const m = match[2];
  const ampm = match[3].toLowerCase();
  if (ampm === 'pm' && h !== 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${m}`;
}

function fromInput(v) {
  if (!v) return '';
  const [h, m] = v.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,'0')}${ampm}`;
}

const TIME_SLOTS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    TIME_SLOTS.push(`${h12}:${String(m).padStart(2,'0')}${ampm}`);
  }
}

function TimeDropdown({ value, onChange, placeholder = 'Time' }) {
  const [custom, setCustom] = useState(false);
  const isPreset = TIME_SLOTS.includes(value);
  const isEmpty = !value;

  return (
    <div style={{ position: 'relative' }}>
      {!custom ? (
        <div style={{ position: 'relative' }}>
          <select
            value={isPreset ? value : (isEmpty ? '' : '__custom__')}
            onChange={e => {
              if (e.target.value === '__custom__') setCustom(true);
              else onChange(e.target.value);
            }}
            style={{
              appearance: 'none', WebkitAppearance: 'none',
              padding: '7px 28px 7px 10px',
              fontSize: 12, width: 110,
              background: value ? '#fff8ee' : '#fff',
              border: `1.5px solid ${value ? '#c9a96e' : '#e0cba8'}`,
              borderRadius: 8,
              color: value ? '#5c3d1e' : '#b0956e',
              fontWeight: value ? 600 : 400,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">{placeholder}</option>
            {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
            <option value="__custom__">Custom…</option>
          </select>
          <span style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            fontSize: 9, color: '#b0956e', pointerEvents: 'none',
          }}>▾</span>
        </div>
      ) : (
        <input
          type="time"
          value={toInput(value)}
          onChange={e => onChange(fromInput(e.target.value))}
          onBlur={() => setCustom(false)}
          autoFocus
          style={{
            padding: '7px 10px', fontSize: 12, width: 110,
            border: '1.5px solid #c9a96e', borderRadius: 8,
            background: '#fff8ee', color: '#5c3d1e', fontWeight: 600,
          }}
        />
      )}
    </div>
  );
}

function DayEditor({ data, onUpdate }) {
  const upd = (i, f, v) => { const items = [...data.items]; items[i] = { ...items[i], [f]: v }; onUpdate({ ...data, items }); };
  const add = () => onUpdate({ ...data, items: [...data.items, { time: '', timeTo: '', label: '', note: '' }] });
  const rem = i => onUpdate({ ...data, items: data.items.filter((_, j) => j !== i) });

  return (
    <div>
      {/* Optional date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: '#b0956e', fontWeight: 600, whiteSpace: 'nowrap' }}>Date</span>
        <DatePicker value={data.date ?? ''} onChange={v => onUpdate({ ...data, date: v })} />
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '110px 14px 110px 1fr 1fr 28px', gap: 8, marginBottom: 6, padding: '0 2px' }}>
        {['Start', '', 'End', 'Event', 'Note', ''].map((h, i) => (
          <span key={i} style={{ fontSize: 10, color: '#b0956e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2, scrollbarWidth: 'thin', scrollbarColor: '#e0cba8 transparent' }}>
        {data.items.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 14px 110px 1fr 1fr 28px', gap: 8, alignItems: 'center' }}>
            <TimePicker value={item.time} onChange={v => upd(i, 'time', v)} placeholder="Start" />
            <span style={{ color: '#c9a96e', textAlign: 'center', fontSize: 12 }}>→</span>
            <TimePicker value={item.timeTo ?? ''} onChange={v => upd(i, 'timeTo', v)} placeholder="End" />
            <input value={item.label} onChange={e => upd(i, 'label', e.target.value)} placeholder="Event name" style={{ fontSize: 13 }} />
            <input value={item.note ?? ''} onChange={e => upd(i, 'note', e.target.value)} placeholder="Note" style={{ fontSize: 13, color: '#7a6352' }} />
            <Btn onClick={() => rem(i)} danger>✕</Btn>
          </div>
        ))}
      </div>
      <AddBtn onClick={add}>+ Add event</AddBtn>
    </div>
  );
}

function AnnouncementEditor({ data, onUpdate }) {
  const upd = (i, v) => { const items = [...data.items]; items[i] = v; onUpdate({ ...data, items }); };
  const add = () => onUpdate({ ...data, items: [...data.items, ''] });
  const rem = i => onUpdate({ ...data, items: data.items.filter((_, j) => j !== i) });

  return (
    <div>
      <input value={data.title} onChange={e => onUpdate({ ...data, title: e.target.value })} placeholder="Section title" style={{ marginBottom: 10, fontWeight: 600 }} />
      {data.items.map((item, i) => (
        <Row key={i}>
          <span style={{ color: '#b8860b', fontSize: 14 }}>•</span>
          <input value={item} onChange={e => upd(i, e.target.value)} placeholder="Announcement" />
          <Btn onClick={() => rem(i)} danger>✕</Btn>
        </Row>
      ))}
      <AddBtn onClick={add}>+ Add announcement</AddBtn>
    </div>
  );
}

function ContactEditor({ data, onUpdate }) {
  const upd = (i, f, v) => { const entries = [...data.entries]; entries[i] = { ...entries[i], [f]: v }; onUpdate({ ...data, entries }); };
  const add = () => onUpdate({ ...data, entries: [...data.entries, { name: '', role: '', phone: '' }] });
  const rem = i => onUpdate({ ...data, entries: data.entries.filter((_, j) => j !== i) });

  return (
    <div>
      <input value={data.title} onChange={e => onUpdate({ ...data, title: e.target.value })} placeholder="Section title" style={{ marginBottom: 10, fontWeight: 600 }} />
      {data.entries.map((entry, i) => (
        <Row key={i}>
          <input value={entry.role} onChange={e => upd(i, 'role', e.target.value)} placeholder="Role" style={{ width: 110, flex: 'none' }} />
          <input value={entry.name} onChange={e => upd(i, 'name', e.target.value)} placeholder="Name" />
          <input value={entry.phone} onChange={e => upd(i, 'phone', e.target.value)} placeholder="Phone" style={{ width: 130, flex: 'none' }} />
          <Btn onClick={() => rem(i)} danger>✕</Btn>
        </Row>
      ))}
      <AddBtn onClick={add}>+ Add contact</AddBtn>
    </div>
  );
}

function EventEditor({ data, onUpdate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input value={data.title} onChange={e => onUpdate({ ...data, title: e.target.value })} placeholder="Event title" style={{ fontWeight: 600 }} />
      <input value={data.subtitle} onChange={e => onUpdate({ ...data, subtitle: e.target.value })} placeholder="Subtitle (optional)" />
      <TimePicker value={data.time} onChange={v => onUpdate({ ...data, time: v })} placeholder="Time" />
      <input value={data.note} onChange={e => onUpdate({ ...data, note: e.target.value })} placeholder="Note (optional)" />
    </div>
  );
}