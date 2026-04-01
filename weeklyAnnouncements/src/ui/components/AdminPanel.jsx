import { useState, useEffect, useCallback } from 'react';
import { FirebaseBulletinRepo } from '../../adapters/firebase/FirebaseBulletinRepo';
import { ReactPDFExporter } from '../../adapters/export/ReactPDFExporter.jsx';
import { TelegramAdapter } from '../../adapters/telegram/TelegramAdapter';
import { createBulletin, updateBulletin, createEvent, DEFAULT_PRESETS, CHURCH_NAME, getDatesForWeek } from '../../core/domain/Bulletin';
import { fetchPresets, savePreset, deletePreset as deletePresetFS, savePresetOrder } from '../../adapters/firebase/FirebasePresetRepo';
import { arrayMove } from '@dnd-kit/sortable';
import DragProvider from '../drag/DragContext.jsx';
import PresetLibrary from './PresetLibrary';
import WeeklyView from './WeeklyView';
import ExtrasPanel from './ExtrasPanel';

const repo = new FirebaseBulletinRepo();
const exporter = new ReactPDFExporter();
const telegram = new TelegramAdapter();

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
  const [presets, setPresets] = useState([]);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info');
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    repo.listPresets().then(setSavedBulletins);
    fetchPresets().then(ps => {
      if (ps.length === 0) {
        Promise.all(DEFAULT_PRESETS.map((p, i) => savePreset({ ...p, order: i })))
          .then(() => setPresets(DEFAULT_PRESETS));
      } else {
        setPresets(ps);
      }
    });
  }, []);

  const setMsg = (msg, type = 'info') => {
    setStatus(msg);
    setStatusType(type);
    setTimeout(() => setStatus(''), 3500);
  };

  const addPreset = async p => {
    const ordered = { ...p, order: presets.length };
    await savePreset(ordered);
    setPresets(ps => [...ps, ordered]);
  };

  const editPreset = async p => {
    await savePreset(p);
    setPresets(ps => ps.map(x => x.id === p.id ? p : x));
  };

  const removePreset = async id => {
    await deletePresetFS(id);
    setPresets(ps => ps.filter(p => p.id !== id));
  };

  const reorderPresets = async reordered => {
    setPresets(reordered);
    await savePresetOrder(reordered);
  };

  const handleDrop = useCallback((dragData, zoneData) => {
    const { dayIdx } = zoneData;
    const days = [...bulletin.days];

    if (dragData.id && dragData.color) {
      // Preset drop
      const newEvent = createEvent(dragData);
      days[dayIdx] = { ...days[dayIdx], events: [...days[dayIdx].events, newEvent] };
      setBulletin(b => updateBulletin(b, { days }));
      return;
    }

    if (dragData.name === 'New Event') {
      // One-time event
      const newEvent = createEvent(null, { name: 'New Event' });
      days[dayIdx] = { ...days[dayIdx], events: [...days[dayIdx].events, newEvent] };
      setBulletin(b => updateBulletin(b, { days }));
      return;
    }

    if (dragData.event) {
      // Move event between days
      const { event, dayIdx: fromDay, eventIdx } = dragData;
      if (fromDay === dayIdx) return;
      days[fromDay] = { ...days[fromDay], events: days[fromDay].events.filter((_, i) => i !== eventIdx) };
      days[dayIdx] = { ...days[dayIdx], events: [...days[dayIdx].events, event] };
      setBulletin(b => updateBulletin(b, { days }));
    }
  }, [bulletin]);

  const handleSort = useCallback((dragData, overData) => {
    const fromIdx = dragData.index;
    const toIdx = overData.index;
    if (fromIdx === undefined || toIdx === undefined || fromIdx === toIdx) return;
    reorderPresets(arrayMove(presets, fromIdx, toIdx));
  }, [presets, reorderPresets]);

  const handleEventReorder = useCallback((dragData, overData) => {
    const { dayIdx: fromDay, eventIdx: fromIdx } = dragData;
    const { dayIdx: toDay, eventIdx: toIdx } = overData;
    if (fromDay !== toDay) return;
    if (fromIdx === toIdx) return;
    const days = [...bulletin.days];
    const events = [...days[fromDay].events];
    const [moved] = events.splice(fromIdx, 1);
    events.splice(toIdx, 0, moved);
    days[fromDay] = { ...days[fromDay], events };
    setBulletin(b => updateBulletin(b, { days }));
  }, [bulletin]);

  const save = async () => {
    setSaving(true);
    await repo.save(bulletin);
    setSavedBulletins(await repo.listPresets());
    setMsg('Saved!', 'success');
    setSaving(false);
  };

  const load = b => {
    setBulletin(b);
    setMsg(`Loaded: ${b.presetName}`, 'info');
  };

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
    } catch (e) {
      setMsg(`Error: ${e.message}`, 'error');
    }
    setPublishing(false);
  };

  const publishAnnouncementsOnly = async () => {
    setPublishing(true);
    try {
      const announcements = bulletin.announcements ?? [];
      if (!announcements.length) {
        setMsg('No announcements to send', 'info');
        setPublishing(false);
        return;
      }
      const text = [
        `✝ *${CHURCH_NAME}*`,
        `📢 *Announcements* — ${bulletin.weekLabel}`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        ...announcements.map(a => `• ${a.text}`),
      ].join('\n');
      await telegram._sendLongMessage(text);
      const updated = updateBulletin(bulletin, { lastAnnouncementsSent: new Date().toISOString() });
      setBulletin(updated);
      await repo.save(updated);
      setMsg('Announcements sent!', 'success');
    } catch (e) {
      setMsg(`Error: ${e.message}`, 'error');
    }
    setPublishing(false);
  };

  const statusColor = { success: '#27ae60', error: '#c0392b', info: '#7a6352' }[statusType];

  return (
    <DragProvider onDrop={handleDrop} onSort={handleSort} onEventReorder={handleEventReorder}>
      <div style={{ minHeight: '100vh', background: '#f4ece0', fontFamily: 'Inter, sans-serif' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #2e1a08 0%, #5c3d1e 100%)', boxShadow: '0 2px 24px rgba(46,26,8,0.3)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(212,160,23,0.15)', border: '1.5px solid rgba(212,160,23,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#d4a017', flexShrink: 0 }}>✝</div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>{CHURCH_NAME}</div>
              <div style={{ color: '#fff', fontSize: 16, fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>Weekly Announcements</div>
            </div>
            <div style={{ flex: 1 }} />
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

        {/* Meta bar */}
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
                  const label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                  const datesForWeek = getDatesForWeek(d);
                  setBulletin(b => updateBulletin(b, {
                    weekLabel: label,
                    days: b.days.map(day => {
                      const match = datesForWeek.find(dw => dw.day === day.day);
                      return match ? { ...day, date: match.date } : day;
                    }),
                  }));
                }}
                style={{ fontSize: 12, padding: '5px 8px', border: '1.5px solid #e0cba8', borderRadius: 7, background: '#fdf6ec', color: '#5c3d1e', outline: 'none' }}
              />
              {bulletin.weekLabel && (
                <span style={{ fontSize: 12, color: '#b8860b', fontWeight: 500 }}>📅 {bulletin.weekLabel}</span>
              )}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={save} disabled={saving} style={{ padding: '8px 24px', background: saving ? '#ccc' : 'linear-gradient(135deg, #b8860b, #d4a017)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', boxShadow: saving ? 'none' : '0 2px 10px rgba(184,134,11,0.3)' }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={publishAnnouncementsOnly} disabled={publishing} style={{ padding: '8px 20px', background: publishing ? '#ccc' : 'linear-gradient(135deg, #1a5276, #2980b9)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: publishing ? 'default' : 'pointer' }}>
                📢 Announcements
              </button>
              <button onClick={publish} disabled={publishing} style={{ padding: '8px 24px', background: publishing ? '#ccc' : 'linear-gradient(135deg, #3d2408, #5c3d1e)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: publishing ? 'default' : 'pointer', boxShadow: publishing ? 'none' : '0 2px 10px rgba(61,36,8,0.25)' }}>
                {publishing ? 'Publishing...' : '📤 Publish'}
              </button>
              {status && <span style={{ fontSize: 12, color: statusColor, fontWeight: 500 }}>{status}</span>}
            </div>
          </div>
        </div>

        {/* Main layout */}
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px', display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
          <div style={{ position: 'sticky', top: 24, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#e0cba8 transparent' }}>
            <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e8d9c0', padding: 16, boxShadow: '0 1px 8px rgba(92,61,30,0.07)' }}>
              <PresetLibrary presets={presets} onAdd={addPreset} onEdit={editPreset} onDelete={removePreset} onReorder={reorderPresets} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e8d9c0', padding: '24px 28px', boxShadow: '0 1px 8px rgba(92,61,30,0.07)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>Weekly Schedule</div>
              <WeeklyView bulletin={bulletin} onUpdateBulletin={b => setBulletin(updateBulletin(b, {}))} presets={presets} />
            </div>
            <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e8d9c0', padding: '24px 28px', boxShadow: '0 1px 8px rgba(92,61,30,0.07)' }}>
              <ExtrasPanel bulletin={bulletin} onChange={b => setBulletin(updateBulletin(b, {}))} />
            </div>
          </div>
        </div>
      </div>
    </DragProvider>
  );
}