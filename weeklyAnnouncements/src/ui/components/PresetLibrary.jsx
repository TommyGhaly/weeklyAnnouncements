import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { createPreset } from '../../core/domain/Bulletin';
import { TimePicker } from './DrumPicker';
import ImageUpload from './ImageUpload';

const COLORS = ['#b8860b','#7a5230','#4a7c59','#1a5276','#6d3b8e','#8b4513','#c0392b','#2c7a7b'];

function SortablePreset({ preset, onEdit, onDelete, isEditing }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: preset.id });

  // Separate draggable for dropping onto days
  const { attributes: dAttr, listeners: dList, setNodeRef: dRef } = useDraggable({
    id: `preset-${preset.id}`,
    data: { type: 'preset', preset },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: isEditing ? '#fffbf0' : '#fff',
        border: `1.5px solid ${isEditing ? preset.color : '#e8d9c0'}`,
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: isDragging ? '0 8px 24px rgba(92,61,30,0.2)' : '0 1px 4px rgba(92,61,30,0.07)',
        opacity: isDragging ? 0.5 : 1,
        marginBottom: 8,
      }}
    >
      {preset.image && (
        <div style={{ height: 60, background: `url(${preset.image}) center/cover`, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.5))' }} />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' }}>
        {/* Sort handle */}
        <div
          {...attributes}
          {...listeners}
          style={{ color: '#d0b88a', fontSize: 16, cursor: 'grab', flexShrink: 0, lineHeight: 1, touchAction: 'none' }}
          title="Reorder"
        >⠿</div>

        {/* Drag-to-day handle */}
        <div
          ref={dRef}
          {...dAttr}
          {...dList}
          style={{ width: 10, height: 10, borderRadius: '50%', background: preset.color, flexShrink: 0, cursor: 'grab' }}
          title="Drag to day"
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#3d2408', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {preset.name}
          </div>
          {(preset.defaultTime || preset.defaultTimeTo) && (
            <div style={{ fontSize: 11, color: '#b0956e', marginTop: 1 }}>
              {preset.defaultTime}{preset.defaultTimeTo ? ` → ${preset.defaultTimeTo}` : ''}
            </div>
          )}
        </div>

        <button onClick={() => onEdit(preset)} style={iconBtn('#b0956e')}>✎</button>
        <button onClick={() => onDelete(preset.id)} style={iconBtn('#c0392b')}>✕</button>
      </div>
    </div>
  );
}

function PresetForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? {
    name: '', color: COLORS[0], defaultTime: '', defaultTimeTo: '', notes: '', contacts: [], image: '',
  });

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addContact = () => upd('contacts', [...(form.contacts ?? []), { name: '', phone: '' }]);
  const updContact = (i, k, v) => {
    const c = [...(form.contacts ?? [])];
    c[i] = { ...c[i], [k]: v };
    upd('contacts', c);
  };
  const remContact = i => upd('contacts', (form.contacts ?? []).filter((_, j) => j !== i));

  return (
    <div style={{ background: '#fffbf0', border: '1.5px solid #e0cba8', borderRadius: 12, padding: 16, marginBottom: 10 }}>
      {/* Name */}
      <input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Preset name" style={{ ...field, fontWeight: 600, marginBottom: 12 }} autoFocus />

      {/* Color swatches */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {COLORS.map(c => (
          <button key={c} onClick={() => upd('color', c)} style={{
            width: 24, height: 24, borderRadius: '50%', background: c, border: 'none',
            outline: form.color === c ? `3px solid ${c}` : '3px solid transparent',
            outlineOffset: 2, cursor: 'pointer',
          }} />
        ))}
      </div>

      {/* Time range */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <TimePicker value={form.defaultTime} onChange={v => upd('defaultTime', v)} placeholder="Default start" />
        <span style={{ color: '#c9a96e', fontSize: 13 }}>→</span>
        <TimePicker value={form.defaultTimeTo} onChange={v => upd('defaultTimeTo', v)} placeholder="Default end" />
      </div>

      {/* Notes */}
      <textarea value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Default notes" rows={2}
        style={{ ...field, marginBottom: 12, resize: 'vertical' }} />

      {/* Image upload */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Image</div>
        <ImageUpload value={form.image} onChange={v => upd('image', v)} height={80} />
      </div>

      {/* Contacts */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Contacts</div>
        {(form.contacts ?? []).map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input value={c.name} onChange={e => updContact(i, 'name', e.target.value)} placeholder="Name" style={field} />
            <input value={c.phone} onChange={e => updContact(i, 'phone', e.target.value)} placeholder="Phone" style={{ ...field, width: 110, flex: 'none' }} />
            <button onClick={() => remContact(i)} style={iconBtn('#c0392b')}>✕</button>
          </div>
        ))}
        <button onClick={addContact} style={ghostBtn}>+ Add contact</button>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onSave(form)} style={primaryBtn}>Save preset</button>
        <button onClick={onCancel} style={secondaryBtn}>Cancel</button>
      </div>
    </div>
  );
}

export default function PresetLibrary({ presets, onAdd, onEdit, onDelete }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        Preset Library
      </div>

      {presets.map(p =>
        editingId === p.id
          ? <PresetForm key={p.id} initial={p} onSave={form => { onEdit({ ...p, ...form }); setEditingId(null); }} onCancel={() => setEditingId(null)} />
          : <DraggablePreset key={p.id} preset={p} onEdit={p => setEditingId(p.id)} onDelete={onDelete} isEditing={editingId === p.id} />
      )}

      {creating
        ? <PresetForm onSave={form => { onAdd(createPreset(form.name, form)); setCreating(false); }} onCancel={() => setCreating(false)} />
        : (
          <button onClick={() => setCreating(true)} style={{
            width: '100%', padding: '9px 0',
            background: '#fdf6ec', border: '1.5px dashed #c9a96e',
            borderRadius: 8, color: '#7a5230', fontSize: 13,
            fontWeight: 500, cursor: 'pointer', marginBottom: 12,
          }}>+ New preset</button>
        )
      }

      {/* One-time event draggable */}
      <OneTimeDraggable />
    </div>
  );
}

function OneTimeDraggable() {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: 'one-time-event',
    data: { type: 'one-time' },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        padding: '9px 12px',
        background: isDragging ? '#fffbf0' : '#fff',
        border: '1.5px dashed #c9a96e',
        borderRadius: 8, color: '#7a5230',
        fontSize: 13, fontWeight: 500,
        cursor: 'grab', userSelect: 'none',
        opacity: isDragging ? 0.5 : 1,
        display: 'flex', alignItems: 'center', gap: 8,
      }}
    >
      <span style={{ color: '#c9a96e', fontSize: 16 }}>＋</span>
      One-time event
    </div>
  );
}

const field = { padding: '8px 10px', fontSize: 13, border: '1.5px solid #e0cba8', borderRadius: 7, background: '#fff', color: '#3d2408', width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif' };
const iconBtn = color => ({ background: 'none', border: 'none', color, fontSize: 13, cursor: 'pointer', padding: '3px 5px', borderRadius: 4, lineHeight: 1, flexShrink: 0 });
const ghostBtn = { padding: '5px 12px', background: 'none', border: '1.5px dashed #c9a96e', borderRadius: 6, color: '#7a5230', fontSize: 12, cursor: 'pointer' };
const primaryBtn = { padding: '8px 20px', background: 'linear-gradient(135deg, #b8860b, #d4a017)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const secondaryBtn = { padding: '8px 16px', background: '#fff', border: '1.5px solid #e0cba8', borderRadius: 8, fontSize: 13, color: '#7a5230', cursor: 'pointer' };