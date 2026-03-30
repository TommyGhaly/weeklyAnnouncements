export default function SlideEditor({ slide, index, total, onUpdate, onRemove, onMove }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12, background: '#fafafa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <strong style={{ textTransform: 'capitalize' }}>{slide.type}</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onMove(-1)} disabled={index === 0}>↑</button>
          <button onClick={() => onMove(1)} disabled={index === total - 1}>↓</button>
          <button onClick={onRemove} style={{ color: 'red' }}>✕</button>
        </div>
      </div>

      {slide.type === 'schedule' && (
        <ScheduleEditor data={slide.data} onUpdate={onUpdate} />
      )}
      {slide.type === 'announcement' && (
        <AnnouncementEditor data={slide.data} onUpdate={onUpdate} />
      )}
      {slide.type === 'image' && (
        <ImageEditor data={slide.data} onUpdate={onUpdate} />
      )}
      {slide.type === 'custom' && (
        <CustomEditor data={slide.data} onUpdate={onUpdate} />
      )}
    </div>
  );
}

function ScheduleEditor({ data, onUpdate }) {
  const updateItem = (i, field, val) => {
    const items = [...data.items];
    items[i] = { ...items[i], [field]: val };
    onUpdate({ ...data, items });
  };
  const addItem = () => onUpdate({ ...data, items: [...data.items, { time: '', label: '' }] });
  const removeItem = i => onUpdate({ ...data, items: data.items.filter((_, j) => j !== i) });

  return (
    <div>
      {data.items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={item.time}
            onChange={e => updateItem(i, 'time', e.target.value)}
            placeholder="Time"
            style={inputStyle}
          />
          <input
            value={item.label}
            onChange={e => updateItem(i, 'label', e.target.value)}
            placeholder="Event"
            style={{ ...inputStyle, flex: 2 }}
          />
          <button onClick={() => removeItem(i)} style={{ color: 'red' }}>✕</button>
        </div>
      ))}
      <button onClick={addItem} style={addBtnStyle}>+ Add item</button>
    </div>
  );
}

function AnnouncementEditor({ data, onUpdate }) {
  const updateItem = (i, val) => {
    const items = [...data.items];
    items[i] = val;
    onUpdate({ ...data, items });
  };
  const addItem = () => onUpdate({ ...data, items: [...data.items, ''] });
  const removeItem = i => onUpdate({ ...data, items: data.items.filter((_, j) => j !== i) });

  return (
    <div>
      {data.items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={item}
            onChange={e => updateItem(i, e.target.value)}
            placeholder="Announcement"
            style={inputStyle}
          />
          <button onClick={() => removeItem(i)} style={{ color: 'red' }}>✕</button>
        </div>
      ))}
      <button onClick={addItem} style={addBtnStyle}>+ Add announcement</button>
    </div>
  );
}

function ImageEditor({ data, onUpdate }) {
  return (
    <input
      value={data.url}
      onChange={e => onUpdate({ ...data, url: e.target.value })}
      placeholder="Image URL"
      style={inputStyle}
    />
  );
}

function CustomEditor({ data, onUpdate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        value={data.title}
        onChange={e => onUpdate({ ...data, title: e.target.value })}
        placeholder="Title"
        style={inputStyle}
      />
      <textarea
        value={data.body}
        onChange={e => onUpdate({ ...data, body: e.target.value })}
        placeholder="Body"
        rows={4}
        style={{ ...inputStyle, resize: 'vertical' }}
      />
    </div>
  );
}

const inputStyle = {
  flex: 1,
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #ccc',
  fontSize: 14,
};

const addBtnStyle = {
  padding: '6px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  marginTop: 4,
};