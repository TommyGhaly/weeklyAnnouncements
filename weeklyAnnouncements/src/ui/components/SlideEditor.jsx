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

function DayEditor({ data, onUpdate }) {
  const upd = (i, f, v) => { const items = [...data.items]; items[i] = { ...items[i], [f]: v }; onUpdate({ ...data, items }); };
  const add = () => onUpdate({ ...data, items: [...data.items, { time: '', label: '', note: '' }] });
  const rem = i => onUpdate({ ...data, items: data.items.filter((_, j) => j !== i) });

  return (
    <div>
      {data.items.map((item, i) => (
        <div key={i} style={{ marginBottom: 10, padding: '10px 12px', background: '#faf6f0', borderRadius: 8, border: '1px solid #eedfc4' }}>
          <Row>
            <input value={item.time} onChange={e => upd(i, 'time', e.target.value)} placeholder="Time" style={{ width: 130, flex: 'none' }} />
            <input value={item.label} onChange={e => upd(i, 'label', e.target.value)} placeholder="Event name" />
            <Btn onClick={() => rem(i)} danger>✕</Btn>
          </Row>
          <input value={item.note ?? ''} onChange={e => upd(i, 'note', e.target.value)} placeholder="Note (e.g. See Holy Week Schedule)" style={{ fontSize: 12, color: '#7a6352' }} />
        </div>
      ))}
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
      <input value={data.time} onChange={e => onUpdate({ ...data, time: e.target.value })} placeholder="Time (optional)" />
      <input value={data.note} onChange={e => onUpdate({ ...data, note: e.target.value })} placeholder="Note (optional)" />
    </div>
  );
}