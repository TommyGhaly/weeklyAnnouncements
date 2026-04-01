import { useState, useEffect } from 'react';
import { createAnnouncement, createMultiDayEvent } from '../../core/domain/Bulletin';
import { TimePicker, DatePicker } from './DrumPicker';
import ImagePicker from './ImagePicker';
import { db } from '../../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

const COLORS = ['#b8860b','#7a5230','#4a7c59','#1a5276','#6d3b8e','#8b4513','#c0392b','#2c7a7b'];
const mdPresetCol = () => collection(db, 'multiday_presets');

async function fetchMDPresets() {
  const snap = await getDocs(mdPresetCol());
  return snap.docs.map(d => d.data()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
async function saveMDPreset(p) { await setDoc(doc(mdPresetCol(), p.id), p); }
async function deleteMDPreset(id) { await deleteDoc(doc(mdPresetCol(), id)); }

function createMDPreset(opts = {}) {
  return {
    id: crypto.randomUUID(),
    name: opts.name ?? '',
    color: opts.color ?? '#b8860b',
    time: opts.time ?? '',
    timeTo: opts.timeTo ?? '',
    notes: opts.notes ?? '',
    image: opts.image ?? '',
    contacts: opts.contacts ?? [],
  };
}

// ── Multi-day event form ──────────────────────────────────────
function MultiDayEventForm({ initial, presets, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? createMultiDayEvent());
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addContact = () => upd('contacts', [...(form.contacts ?? []), { name: '', phone: '' }]);
  const updContact = (i, k, v) => { const c = [...(form.contacts ?? [])]; c[i] = { ...c[i], [k]: v }; upd('contacts', c); };
  const remContact = i => upd('contacts', (form.contacts ?? []).filter((_, j) => j !== i));

  const loadPreset = p => setForm(f => ({
    ...f,
    name: p.name, color: p.color, time: p.time,
    timeTo: p.timeTo, notes: p.notes, image: p.image,
    contacts: [...(p.contacts ?? [])],
  }));

  return (
    <div style={{ background: '#fffbf0', border: '1.5px solid #e0cba8', borderRadius: 10, padding: 14, marginBottom: 10 }}>
      {/* Load preset */}
      {presets.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <Label>Load from preset</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {presets.map(p => (
              <button key={p.id} onClick={() => loadPreset(p)} style={{
                padding: '4px 10px', background: '#fff', border: `1.5px solid ${p.color}`,
                borderRadius: 6, fontSize: 12, color: p.color, fontWeight: 600, cursor: 'pointer',
              }}>{p.name}</button>
            ))}
          </div>
        </div>
      )}

      <input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Event name" style={{ ...field, fontWeight: 600, marginBottom: 10 }} autoFocus />

      {/* Color */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {COLORS.map(c => (
          <button key={c} onClick={() => upd('color', c)} style={{
            width: 20, height: 20, borderRadius: '50%', background: c, border: 'none',
            outline: form.color === c ? `3px solid ${c}` : '3px solid transparent',
            outlineOffset: 2, cursor: 'pointer',
          }} />
        ))}
      </div>

      {/* Date range */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <Label>From</Label>
        <DatePicker value={form.startDate} onChange={v => upd('startDate', v)} />
        <Label>To</Label>
        <DatePicker value={form.endDate} onChange={v => upd('endDate', v)} />
      </div>

      {/* Time */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <TimePicker value={form.time} onChange={v => upd('time', v)} placeholder="Daily start" />
        <span style={{ color: '#c9a96e' }}>→</span>
        <TimePicker value={form.timeTo} onChange={v => upd('timeTo', v)} placeholder="Daily end" />
      </div>

      {/* Notes */}
      <textarea value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Notes" rows={2} style={{ ...field, marginBottom: 10, resize: 'vertical' }} />

      {/* Image */}
      <div style={{ marginBottom: 10 }}>
        <Label>Image</Label>
        <ImagePicker value={form.image} onChange={v => upd('image', v)} />
      </div>

      {/* Contacts */}
      <div style={{ marginBottom: 10 }}>
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
        <button onClick={() => onSave(form)} style={primaryBtn}>Save</button>
        <button onClick={onCancel} style={secondaryBtn}>Cancel</button>
      </div>
    </div>
  );
}

// ── Multi-day preset form ─────────────────────────────────────
function MDPresetForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? createMDPreset());
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addContact = () => upd('contacts', [...(form.contacts ?? []), { name: '', phone: '' }]);
  const updContact = (i, k, v) => { const c = [...(form.contacts ?? [])]; c[i] = { ...c[i], [k]: v }; upd('contacts', c); };
  const remContact = i => upd('contacts', (form.contacts ?? []).filter((_, j) => j !== i));

  return (
    <div style={{ background: '#f0f8ff', border: '1.5px solid #b8d4e8', borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Preset name" style={{ ...field, fontWeight: 600, marginBottom: 10 }} autoFocus />

      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {COLORS.map(c => (
          <button key={c} onClick={() => upd('color', c)} style={{
            width: 20, height: 20, borderRadius: '50%', background: c, border: 'none',
            outline: form.color === c ? `3px solid ${c}` : '3px solid transparent',
            outlineOffset: 2, cursor: 'pointer',
          }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <TimePicker value={form.time} onChange={v => upd('time', v)} placeholder="Default start" />
        <span style={{ color: '#c9a96e' }}>→</span>
        <TimePicker value={form.timeTo} onChange={v => upd('timeTo', v)} placeholder="Default end" />
      </div>

      <textarea value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Default notes" rows={2} style={{ ...field, marginBottom: 10, resize: 'vertical' }} />

      <div style={{ marginBottom: 10 }}>
        <Label>Image</Label>
        <ImagePicker value={form.image} onChange={v => upd('image', v)} />
      </div>

      <div style={{ marginBottom: 10 }}>
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

// ── Multi-day events section ──────────────────────────────────
function MultiDaySection({ events, onChange }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [presets, setPresets] = useState([]);
  const [creatingPreset, setCreatingPreset] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState(null);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => { fetchMDPresets().then(setPresets); }, []);

  const addPreset = async p => { await saveMDPreset(p); setPresets(ps => [...ps, p]); setCreatingPreset(false); };
  const editPresetFn = async p => { await saveMDPreset(p); setPresets(ps => ps.map(x => x.id === p.id ? p : x)); setEditingPresetId(null); };
  const removePreset = async id => { await deleteMDPreset(id); setPresets(ps => ps.filter(p => p.id !== id)); };

  const add = e => { onChange([...events, { ...createMultiDayEvent(), ...e }]); setCreating(false); };
  const upd = e => { onChange(events.map(x => x.id === e.id ? e : x)); setEditingId(null); };
  const rem = id => onChange(events.filter(e => e.id !== id));

  function fmtDate(val) {
    if (!val) return '';
    return new Date(val + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SectionLabel>🗓 Multi-Day Events</SectionLabel>
        <button onClick={() => setShowPresets(s => !s)} style={{ fontSize: 11, color: '#1a5276', background: 'none', border: '1px solid #b8d4e8', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
          {showPresets ? 'Hide presets' : 'Manage presets'}
        </button>
      </div>

      {/* Preset manager */}
      {showPresets && (
        <div style={{ background: '#f0f8ff', border: '1px solid #b8d4e8', borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#1a5276', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Saved Presets</div>
          {presets.map(p =>
            editingPresetId === p.id
              ? <MDPresetForm key={p.id} initial={p} onSave={editPresetFn} onCancel={() => setEditingPresetId(null)} />
              : (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#fff', border: `1.5px solid #e0eef6`, borderLeft: `3px solid ${p.color}`, borderRadius: 8, marginBottom: 6 }}>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#3d2408' }}>{p.name}</div>
                  {p.time && <div style={{ fontSize: 11, color: '#b0956e' }}>{p.time}{p.timeTo ? ` → ${p.timeTo}` : ''}</div>}
                  <button onClick={() => setEditingPresetId(p.id)} style={iconBtn('#b0956e')}>✎</button>
                  <button onClick={() => removePreset(p.id)} style={iconBtn('#c0392b')}>✕</button>
                </div>
              )
          )}
          {creatingPreset
            ? <MDPresetForm onSave={p => addPreset({ ...createMDPreset(), ...p })} onCancel={() => setCreatingPreset(false)} />
            : <button onClick={() => setCreatingPreset(true)} style={{ ...ghostBtn, marginTop: 4 }}>+ New preset</button>
          }
        </div>
      )}

      {/* Events list */}
      {events.map(e =>
        editingId === e.id
          ? <MultiDayEventForm key={e.id} initial={e} presets={presets} onSave={upd} onCancel={() => setEditingId(null)} />
          : (
            <div key={e.id} style={{
              background: '#fff', border: `1.5px solid #e8d9c0`,
              borderLeft: `4px solid ${e.color}`,
              borderRadius: 10, padding: '10px 12px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              {e.image && <img src={e.image} alt="" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6, background: '#fdf6ec', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#3d2408' }}>{e.name}</div>
                <div style={{ fontSize: 11, color: '#b0956e', marginTop: 2 }}>
                  {fmtDate(e.startDate)}{e.endDate && e.endDate !== e.startDate ? ` → ${fmtDate(e.endDate)}` : ''}
                  {e.time ? ` · ${e.time}${e.timeTo ? ` → ${e.timeTo}` : ''}` : ''}
                </div>
                {(e.contacts ?? []).length > 0 && (
                  <div style={{ fontSize: 11, color: '#7a6352', marginTop: 2 }}>
                    {e.contacts.map(c => c.name).filter(Boolean).join(' · ')}
                  </div>
                )}
                {e.notes && <div style={{ fontSize: 11, color: '#b0956e', marginTop: 2, fontStyle: 'italic' }}>{e.notes}</div>}
              </div>
              <button onClick={() => setEditingId(e.id)} style={iconBtn('#b0956e')}>✎</button>
              <button onClick={() => rem(e.id)} style={iconBtn('#c0392b')}>✕</button>
            </div>
          )
      )}

      {creating
        ? <MultiDayEventForm presets={presets} onSave={add} onCancel={() => setCreating(false)} />
        : <button onClick={() => setCreating(true)} style={ghostBtn}>+ Add multi-day event</button>
      }
    </div>
  );
}

// ── Announcements ─────────────────────────────────────────────
function AnnouncementsSection({ announcements, onChange }) {
  const add = () => onChange([...announcements, createAnnouncement('')]);
  const upd = (i, text) => { const a = [...announcements]; a[i] = { ...a[i], text }; onChange(a); };
  const rem = i => onChange(announcements.filter((_, j) => j !== i));

  return (
    <div>
      <SectionLabel>📢 Announcements</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {announcements.map((a, i) => (
          <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: '#b8860b', marginTop: 10, flexShrink: 0 }}>•</span>
            <textarea
              value={a.text}
              onChange={e => upd(i, e.target.value)}
              placeholder="Announcement text..."
              rows={2}
              style={{ ...field, resize: 'vertical', flex: 1 }}
            />
            <button onClick={() => rem(i)} style={iconBtn('#c0392b')}>✕</button>
          </div>
        ))}
      </div>
      <button onClick={add} style={ghostBtn}>+ Add announcement</button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
export default function ExtrasPanel({ bulletin, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <AnnouncementsSection
        announcements={bulletin.announcements ?? []}
        onChange={a => onChange({ ...bulletin, announcements: a })}
      />
      <div style={{ height: 1, background: '#f0e4cc' }} />
      <MultiDaySection
        events={bulletin.multiDayEvents ?? []}
        onChange={e => onChange({ ...bulletin, multiDayEvents: e })}
      />
    </div>
  );
}

const field = { padding: '8px 10px', fontSize: 13, border: '1.5px solid #e0cba8', borderRadius: 7, background: '#fff', color: '#3d2408', width: '100%', outline: 'none', fontFamily: 'Inter, sans-serif' };
const iconBtn = color => ({ background: 'none', border: 'none', color, fontSize: 13, cursor: 'pointer', padding: '3px 5px', borderRadius: 4, lineHeight: 1, flexShrink: 0 });
const ghostBtn = { padding: '6px 14px', background: 'none', border: '1.5px dashed #c9a96e', borderRadius: 6, color: '#7a5230', fontSize: 12, cursor: 'pointer' };
const primaryBtn = { padding: '7px 18px', background: 'linear-gradient(135deg, #b8860b, #d4a017)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const secondaryBtn = { padding: '7px 14px', background: '#fff', border: '1.5px solid #e0cba8', borderRadius: 8, fontSize: 13, color: '#7a5230', cursor: 'pointer' };
const SectionLabel = ({ children }) => <div style={{ fontSize: 12, fontWeight: 700, color: '#5c3d1e', fontFamily: 'Playfair Display, serif' }}>{children}</div>;
const Label = ({ children }) => <span style={{ fontSize: 11, color: '#b0956e', fontWeight: 600 }}>{children}</span>;