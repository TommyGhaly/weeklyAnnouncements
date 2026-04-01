import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { FirebaseBulletinRepo } from '../../adapters/firebase/FirebaseBulletinRepo';
import { ReactPDFExporter } from '../../adapters/export/ReactPDFExporter.jsx';
import { TelegramAdapter } from '../../adapters/telegram/TelegramAdapter';
import { createBulletin, updateBulletin, createEvent, DEFAULT_PRESETS, CHURCH_NAME } from '../../core/domain/Bulletin';
import PresetLibrary from './PresetLibrary';
import WeeklyView from './WeeklyView';

const repo = new FirebaseBulletinRepo();
const exporter = new ReactPDFExporter();
const telegram = new TelegramAdapter();
const PRESETS_KEY = 'wa_presets';

function loadPresets() {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY)) ?? DEFAULT_PRESETS; }
  catch { return DEFAULT_PRESETS; }
}

function toInputDate(weekLabel) {
  try {
    const d = new Date(weekLabel);
    if (isNaN(d)) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  } catch { return ''; }
}

export default function AdminPanel() {
  const [bulletin, setBulletin] = useState(createBulletin('Weekly Bulletin'));
  const [savedBulletins, setSavedBulletins] = useState([]);
  const [presets, setPresets] = useState(loadPresets);
  const [active, setActive] = useState(null);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info');
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => { repo.listPresets().then(setSavedBulletins); }, []);
  useEffect(() => { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)); }, [presets]);

  const setMsg = (msg, type = 'info') => {
    setStatus(msg); setStatusType(type);
    setTimeout(() => setStatus(''), 3500);
  };

  const handleDragStart = ({ active }) => setActive(active);

  const handleDragEnd = ({ active, over }) => {
    setActive(null);
    if (!over) return;

    const activeData = active.data.current;

    // Within-day reorder (sortable)
    if (activeData?.type === 'event') {
      const { dayIdx } = activeData;
      const days = [...bulletin.days];
      const day = days[dayIdx];
      const ids = day.events.map(e => e.id);
      const oldIdx = ids.indexOf(active.id);
      const newIdx = ids.indexOf(over.id);

      // Same day reorder
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        days[dayIdx] = { ...day, events: arrayMove(day.events, oldIdx, newIdx) };
        setBulletin(b => updateBulletin(b, { days }));
        return;
      }

      // Move to different day
      const overMatch = over.id.toString().match(/^day-(\d+)$/);
      if (overMatch) {
        const toDayIdx = parseInt(overMatch[1]);
        if (toDayIdx === dayIdx) return;
        const eventIdx = activeData.eventIdx;
        days[dayIdx] = { ...days[dayIdx], events: days[dayIdx].events.filter((_, i) => i !== eventIdx) };
        days[toDayIdx] = { ...days[toDayIdx], events: [...days[toDayIdx].events, activeData.event] };
        setBulletin(b => updateBulletin(b, { days }));
      }
      return;
    }

    // Drop preset or one-time onto a day
    const overMatch = over.id.toString().match(/^day-(\d+)$/);
    if (!overMatch) return;
    const dayIdx = parseInt(overMatch[1]);

    let newEvent;
    if (activeData?.type === 'preset') newEvent = createEvent(activeData.preset);
    else if (activeData?.type === 'one-time') newEvent = createEvent(null, { name: 'New Event' });
    if (!newEvent) return;

    const days = [...bulletin.days];
    days[dayIdx] = { ...days[dayIdx], events: [...days[dayIdx].events, newEvent] };
    setBulletin(b => updateBulletin(b, { days }));
  };

  const save = async () => {
    setSaving(true);
    await repo.save(bulletin);
    setSavedBulletins(await repo.listPresets());
    setMsg('Saved!', 'success');
    setSaving(false);
  };

  const load = b => { setBulletin(b); setMsg(`Loaded: ${b.presetName}`, 'info'); };

  const deleteSaved = async (e, id) => {
    e.stopPropagation();
    await repo.delete(id);
    setSavedBulletins(s => s.filter(x => x.id !== id));
  };

  const publish = async () => {
    setPublishing(true);
    try {
      setMsg('Generating PDF...', 'info');
      const blob = await exporter.export(bulletin);
      setMsg('Publishing to Telegram...', 'info');
      await telegram.publish(bulletin, blob);
      setMsg('Published!', 'success');
    } catch (e) { setMsg(`Error: ${e.message}`, 'error'); }
    setPublishing(false);
  };

  const statusColor = { success: '#27ae60', error: '#c0392b', info: '#7a6352' }[statusType];
  const activePreset = active?.data.current?.type === 'preset' ? active.data.current.preset : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ minHeight: '100vh', background: '#f4ece0', fontFamily: 'Inter, sans-serif' }}>

        {/* ── Header ── */}
        <div style={{ background: 'linear-gradient(135deg, #2e1a08 0%, #5c3d1e 100%)', boxShadow: '0 2px 24px rgba(46,26,8,0.3)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(212,160,23,0.15)', border: '1.5px solid rgba(212,160,23,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#d4a017', flexShrink: 0 }}>✝</div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>{CHURCH_NAME}</div>
              <div style={{ color: '#fff', fontSize: 16, fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>Weekly Announcements</div>
            </div>
            <div style={{ flex: 1 }} />
            {/* Saved bulletins */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {savedBulletins.slice(0, 4).map(b => (
                <div key={b.id} style={{ display: 'flex', background: 'rgba(255,255,255,0.07)', borderRadius: 7, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button onClick={() => load(b)} style={{ padding: '5px 10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer' }}>{b.presetName}</button>
                  <button onClick={e => deleteSaved(e, b.id)} style={{ padding: '5px 8px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
            <a href="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none', padding: '6px 12px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6 }}>Present →</a>
          </div>
        </div>

        {/* ── Meta bar ── */}
        <div style={{ background: '#fff', borderBottom: '1.5px solid #e8d9c0', boxShadow: '0 1px 6px rgba(92,61,30,0.07)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '10px 32px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={bulletin.presetName}
              onChange={e => setBulletin(b => updateBulletin(b, { presetName: e.target.value }))}
              style={{ fontSize: 16, fontFamily: 'Playfair Display, serif', fontWeight: 600, border: 'none', background: 'transparent', color: '#3d2408', outline: 'none', minWidth: 180 }}
            />
            <div style={{ width: 1, height: 20, background: '#e0cba8' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#b0956e', fontWeight: 600 }}>Week of</span>
              <input
                type="date"
                value={toInputDate(bulletin.weekLabel)}
                onChange={e => {
                  const d = new Date(e.target.value + 'T00:00:00');
                  setBulletin(b => updateBulletin(b, { weekLabel: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }));
                }}
                style={{ fontSize: 12, padding: '5px 8px', border: '1.5px solid #e0cba8', borderRadius: 7, background: '#fdf6ec', color: '#5c3d1e', outline: 'none' }}
              />
              {bulletin.weekLabel && <span style={{ fontSize: 12, color: '#b8860b', fontWeight: 500 }}>📅 {bulletin.weekLabel}</span>}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={save} disabled={saving} style={{
                padding: '8px 24px',
                background: saving ? '#ccc' : 'linear-gradient(135deg, #b8860b, #d4a017)',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
                boxShadow: saving ? 'none' : '0 2px 10px rgba(184,134,11,0.3)',
              }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={publish} disabled={publishing} style={{
                padding: '8px 24px',
                background: publishing ? '#ccc' : 'linear-gradient(135deg, #3d2408, #5c3d1e)',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: publishing ? 'default' : 'pointer',
                boxShadow: publishing ? 'none' : '0 2px 10px rgba(61,36,8,0.25)',
              }}>
                {publishing ? 'Publishing...' : '📤 Publish'}
              </button>
              {status && <span style={{ fontSize: 12, color: statusColor, fontWeight: 500 }}>{status}</span>}
            </div>
          </div>
        </div>

        {/* ── Main layout ── */}
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px', display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>

          {/* Left panel */}
          <div style={{ position: 'sticky', top: 24, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#e0cba8 transparent' }}>
            <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e8d9c0', padding: 16, boxShadow: '0 1px 8px rgba(92,61,30,0.07)' }}>
              <PresetLibrary
                presets={presets}
                onAdd={p => setPresets(ps => [...ps, p])}
                onEdit={p => setPresets(ps => ps.map(x => x.id === p.id ? p : x))}
                onDelete={id => setPresets(ps => ps.filter(p => p.id !== id))}
                onReorder={setPresets}
              />
            </div>
          </div>

          {/* Right panel */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e8d9c0', padding: '24px 28px', boxShadow: '0 1px 8px rgba(92,61,30,0.07)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>
              Weekly Schedule
            </div>
            <WeeklyView
              bulletin={bulletin}
              onUpdateBulletin={b => setBulletin(updateBulletin(b, {}))}
              presets={presets}
            />
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activePreset && (
          <div style={{
            padding: '9px 14px',
            background: '#fff8ee',
            border: `1.5px solid ${activePreset.color}`,
            borderLeft: `4px solid ${activePreset.color}`,
            borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#3d2408',
            boxShadow: '0 8px 24px rgba(92,61,30,0.2)', cursor: 'grabbing',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: activePreset.color }} />
            {activePreset.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}