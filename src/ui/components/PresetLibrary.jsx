import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { createPreset } from '../../core/domain/Bulletin';
import { TimePicker } from './DrumPicker';
import ImagePicker from './ImagePicker';
import { useDrag } from '../drag/useDrag.js';
import { useDragCtx } from '../drag/DragContext.jsx';

const COLORS = ['#b8860b','#7a5230','#4a7c59','#1a5276','#6d3b8e','#8b4513','#c0392b','#2c7a7b'];

// ── Hover tooltip showing the full preset name ────────────────
const TIP_DELAY = 220;
const TIP_MAX_W = 300;

function NameTooltip({ anchor, name, hint }) {
  const tipRef = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    const a = anchor?.getBoundingClientRect();
    const t = tipRef.current?.getBoundingClientRect();
    if (!a || !t) return;
    const gap = 8;
    let left = a.left;
    let top = a.bottom + gap;
    if (left + t.width > window.innerWidth - 8) left = window.innerWidth - 8 - t.width;
    if (left < 8) left = 8;
    if (top + t.height > window.innerHeight - 8) top = Math.max(8, a.top - gap - t.height);
    setPos({ left, top });
  }, [anchor, name, hint]);

  return createPortal(
    <div
      ref={tipRef}
      style={{
        position: 'fixed',
        left: pos?.left ?? 0, top: pos?.top ?? 0,
        maxWidth: TIP_MAX_W,
        background: '#3d2408', color: '#fdf6ec',
        border: '1px solid #5c3d1e', borderRadius: 8,
        padding: '7px 10px', zIndex: 9999, pointerEvents: 'none',
        boxShadow: '0 6px 20px rgba(61,36,8,0.28)',
        fontFamily: 'Inter, sans-serif',
        opacity: pos ? 1 : 0,
        transform: pos ? 'translateY(0)' : 'translateY(-3px)',
        transition: 'opacity 0.12s ease, transform 0.12s ease',
      }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{name}</div>
      {hint && <div style={{ fontSize: 10.5, color: '#c9a96e', marginTop: 3 }}>{hint}</div>}
    </div>,
    document.body,
  );
}

// ── Preset card ───────────────────────────────────────────────
function PresetCard({ preset, index, total, onEdit, onDelete }) {
  const { onMouseDown: onDayDrag, onTouchStart: onDayTouch, isDragging } = useDrag('preset', preset);
  const { onMouseDown: onSortDrag, onTouchStart: onSortTouch } = useDrag('sort', { preset, index });
  const { dragging, overSort, registerSortZone } = useDragCtx();
  const cardRef = useRef(null);
  const isSortDragging = dragging?.type === 'sort' && dragging?.data?.preset?.id === preset.id;
  const indicator = overSort?.id === `sort-${preset.id}` && dragging?.type === 'sort' && !isSortDragging
    ? overSort.position : null;

  const [tipAnchor, setTipAnchor] = useState(null);
  const tipTimer = useRef(null);
  const clearTip = () => { clearTimeout(tipTimer.current); setTipAnchor(null); };
  const scheduleTip = e => {
    const el = e.currentTarget;
    clearTimeout(tipTimer.current);
    tipTimer.current = setTimeout(() => setTipAnchor(el), TIP_DELAY);
  };
  useEffect(() => () => clearTimeout(tipTimer.current), []);
  // Never leave a tooltip hanging over a drag in progress.
  const showTip = tipAnchor && !dragging;

  useEffect(() => {
    registerSortZone(`sort-${preset.id}`, cardRef.current, { preset, index });
    return () => registerSortZone(`sort-${preset.id}`, null, null);
  }, [preset, index, registerSortZone]);

  return (
    <div style={{ position: 'relative' }}>
      {indicator === 'before' && <DropBar color={preset.color} />}
      <div
        ref={cardRef}
        style={{
          background: '#fff',
          border: `1.5px solid #e8d9c0`,
          borderLeft: `4px solid ${preset.color}`,
          borderRadius: 10, overflow: 'hidden',
          boxShadow: isDragging || isSortDragging ? '0 8px 24px rgba(92,61,30,0.15)' : '0 1px 4px rgba(92,61,30,0.07)',
          opacity: isDragging || isSortDragging ? 0.4 : 1,
          marginBottom: 8, userSelect: 'none',
        }}>
        {preset.image && (
          <div style={{ height: 56, position: 'relative', overflow: 'hidden' }}>
            <img src={preset.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.4))' }} />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px' }}>
          <div
            onMouseDown={onSortDrag}
            onTouchStart={onSortTouch}
            style={{ color: '#d0b88a', fontSize: 16, cursor: 'grab', flexShrink: 0, lineHeight: 1, touchAction: 'none', padding: '4px 6px' }}
            title="Drag to reorder"
          >⠿</div>
          <div
            onMouseDown={e => { clearTip(); onDayDrag(e); }}
            onTouchStart={onDayTouch}
            onMouseEnter={scheduleTip}
            onMouseLeave={clearTip}
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, cursor: 'grab', touchAction: 'none' }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: preset.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#3d2408', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preset.name}</div>
              {(preset.defaultTime || preset.defaultTimeTo) && (
                <div style={{ fontSize: 11, color: '#b0956e', marginTop: 1 }}>
                  {preset.defaultTime}{preset.defaultTimeTo ? ` → ${preset.defaultTimeTo}` : ''}
                </div>
              )}
            </div>
          </div>
          <button onClick={() => onEdit(preset)} style={iconBtn('#b0956e')}>✎</button>
          <button onClick={() => onDelete(preset.id)} style={iconBtn('#c0392b')}>✕</button>
        </div>
      </div>
      {indicator === 'after' && <DropBar color={preset.color} />}
      {showTip && (
        <NameTooltip anchor={tipAnchor} name={preset.name || 'Untitled preset'} hint="Drag to schedule on a day" />
      )}
    </div>
  );
}

// ── Preset form ───────────────────────────────────────────────
function PresetForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? {
    name: '', color: COLORS[0], defaultTime: '', defaultTimeTo: '', notes: '', contacts: [], image: '',
  });

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addContact = () => upd('contacts', [...(form.contacts ?? []), { name: '', phone: '' }]);
  const updContact = (i, k, v) => { const c = [...(form.contacts ?? [])]; c[i] = { ...c[i], [k]: v }; upd('contacts', c); };
  const remContact = i => upd('contacts', (form.contacts ?? []).filter((_, j) => j !== i));

  return (
    <div style={{ background: '#fffbf0', border: '1.5px solid #e0cba8', borderRadius: 12, padding: 16, marginBottom: 10 }}>
      <input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Preset name" style={{ ...field, fontWeight: 600, marginBottom: 12 }} autoFocus />

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {COLORS.map(c => (
          <button key={c} onClick={() => upd('color', c)} style={{
            width: 24, height: 24, borderRadius: '50%', background: c, border: 'none',
            outline: form.color === c ? `3px solid ${c}` : '3px solid transparent',
            outlineOffset: 2, cursor: 'pointer',
          }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <TimePicker value={form.defaultTime} onChange={v => upd('defaultTime', v)} placeholder="Default start" />
        <span style={{ color: '#c9a96e', fontSize: 13 }}>→</span>
        <TimePicker value={form.defaultTimeTo} onChange={v => upd('defaultTimeTo', v)} placeholder="Default end" />
      </div>

      <textarea value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Default notes" rows={2} style={{ ...field, marginBottom: 12, resize: 'vertical' }} />

      <div style={{ marginBottom: 12 }}>
        <Label>Image</Label>
        <ImagePicker value={form.image} onChange={v => upd('image', v)} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <Label>Contacts</Label>
        {(form.contacts ?? []).map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input value={c.name} onChange={e => updContact(i, 'name', e.target.value)} placeholder="Name" style={field} />
            <input value={c.phone} onChange={e => updContact(i, 'phone', e.target.value)} placeholder="Phone" style={{ ...field, width: 110, flex: 'none' }} />
            <button onClick={() => remContact(i)} style={iconBtn('#c0392b')}>✕</button>
          </div>
        ))}
        <button onClick={addContact} style={ghostBtn}>+ Add contact</button>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onSave(form)} style={primaryBtn}>Save preset</button>
        <button onClick={onCancel} style={secondaryBtn}>Cancel</button>
      </div>
    </div>
  );
}

// ── One-time draggable ────────────────────────────────────────
function OneTimeDraggable() {
  const { onMouseDown, onTouchStart, isDragging } = useDrag('one-time', { name: 'New Event', color: '#b8860b' });
  return (
    <div
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{
        padding: '9px 12px', background: isDragging ? '#fffbf0' : '#fff',
        border: '1.5px dashed #c9a96e', borderRadius: 8,
        color: '#7a5230', fontSize: 13, fontWeight: 500,
        cursor: 'grab', userSelect: 'none', opacity: isDragging ? 0.5 : 1,
        display: 'flex', alignItems: 'center', gap: 8, touchAction: 'none',
      }}
    >
      <span style={{ color: '#c9a96e', fontSize: 16 }}>＋</span>
      One-time event
    </div>
  );
}

// ── Drop indicator ────────────────────────────────────────────
function DropBar({ color = '#b8860b' }) {
  return (
    <div style={{
      height: 3, background: color, borderRadius: 2,
      margin: '0 0 4px', boxShadow: `0 0 8px ${color}88`,
    }} />
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function PresetLibrary({ presets, onAdd, onEdit, onDelete, onReorder }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        Preset Library
      </div>

      {presets.map((p, i) =>
        editingId === p.id
          ? <PresetForm key={p.id} initial={p} onSave={form => { onEdit({ ...p, ...form }); setEditingId(null); }} onCancel={() => setEditingId(null)} />
          : <PresetCard key={p.id} preset={p} index={i} total={presets.length} onEdit={p => setEditingId(p.id)} onDelete={onDelete} />
      )}

      {creating
        ? <PresetForm onSave={form => { onAdd(createPreset(form.name, form)); setCreating(false); }} onCancel={() => setCreating(false)} />
        : <button onClick={() => setCreating(true)} style={{ width: '100%', padding: '9px 0', background: '#fdf6ec', border: '1.5px dashed #c9a96e', borderRadius: 8, color: '#7a5230', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 12 }}>+ New preset</button>
      }

      <OneTimeDraggable />
    </div>
  );
}

const field = { padding: '8px 10px', fontSize: 13, border: '1.5px solid #e0cba8', borderRadius: 7, background: '#fff', color: '#3d2408', width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif' };
const iconBtn = color => ({ background: 'none', border: 'none', color, fontSize: 13, cursor: 'pointer', padding: '3px 5px', borderRadius: 4, lineHeight: 1, flexShrink: 0 });
const ghostBtn = { padding: '5px 12px', background: 'none', border: '1.5px dashed #c9a96e', borderRadius: 6, color: '#7a5230', fontSize: 12, cursor: 'pointer' };
const primaryBtn = { padding: '8px 20px', background: 'linear-gradient(135deg, #b8860b, #d4a017)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const secondaryBtn = { padding: '8px 16px', background: '#fff', border: '1.5px solid #e0cba8', borderRadius: 8, fontSize: 13, color: '#7a5230', cursor: 'pointer' };
const Label = ({ children }) => <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{children}</div>;