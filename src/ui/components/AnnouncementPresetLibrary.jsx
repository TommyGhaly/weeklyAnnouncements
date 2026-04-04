import { useState } from 'react';
import { createAnnouncementPreset } from '../../core/domain/Bulletin';
import ImagePicker from './ImagePicker';

const field = { padding: '7px 10px', fontSize: 13, border: '1.5px solid #e0cba8', borderRadius: 7, background: '#fff', color: '#3d2408', width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif' };

function PresetCard({ preset, onAdd, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(preset.text);
  const [image, setImage] = useState(preset.image ?? '');

  const save = () => {
    onEdit({ ...preset, text, image });
    setEditing(false);
  };

  return (
    <div style={{
      background: '#fdf6ec', border: '1.5px solid #e8d9c0', borderRadius: 10,
      padding: '10px 12px', marginBottom: 8,
    }}>
      {!editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {preset.image && (
            <img src={preset.image} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div
            onClick={() => onAdd(preset)}
            style={{ flex: 1, fontSize: 12, color: '#3d2408', cursor: 'pointer', lineHeight: 1.4 }}
            title="Click to add to announcements"
          >
            {preset.text || <span style={{ color: '#c4a882', fontStyle: 'italic' }}>Empty preset</span>}
          </div>
          <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', color: '#b0956e', fontSize: 11, cursor: 'pointer' }}>✏️</button>
          <button onClick={() => onDelete(preset.id)} style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 11, cursor: 'pointer' }}>✕</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={2} style={{ ...field, resize: 'vertical' }} placeholder="Announcement text..." />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#b0956e', fontWeight: 700 }}>Image</span>
            <ImagePicker value={image} onChange={setImage} />
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button onClick={() => setEditing(false)} style={{ padding: '4px 12px', background: '#f4ece0', border: '1px solid #e0cba8', borderRadius: 6, fontSize: 11, color: '#5c3d1e', cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} style={{ padding: '4px 12px', background: '#b8860b', border: 'none', borderRadius: 6, fontSize: 11, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnnouncementPresetLibrary({ presets, onAdd, onEdit, onDelete, onAddNew }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 1 }}>Announcement Presets</div>
        <button onClick={onAddNew} style={{ padding: '3px 10px', background: 'none', border: '1.5px dashed #c9a96e', borderRadius: 6, color: '#7a5230', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>+ New</button>
      </div>
      {presets.length === 0 && (
        <div style={{ fontSize: 11, color: '#c4a882', padding: '6px 0' }}>No announcement presets yet.</div>
      )}
      {presets.map(p => (
        <PresetCard key={p.id} preset={p} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}