import { useState, useEffect, useCallback, useRef } from 'react';
import { FirebaseBulletinRepo } from '../../adapters/firebase/FirebaseBulletinRepo';
import { ReactPDFExporter } from '../../adapters/export/ReactPDFExporter.jsx';
import { TelegramAdapter } from '../../adapters/telegram/TelegramAdapter';
import {
  createSession, updateSession, createEvent, createHeaderNote, createAnnouncement,
  createAnnouncementPreset, createTemplate, updateTemplate, sessionToTemplate, templateToSession,
  DEFAULT_PRESETS, DEFAULT_ANNOUNCEMENT_PRESETS, CHURCH_NAME,
} from '../../core/domain/Bulletin';
import { fetchPresets, savePreset, deletePreset as deletePresetFS, savePresetOrder } from '../../adapters/firebase/FirebasePresetRepo';
import { arrayMove } from '@dnd-kit/sortable';
import DragProvider from '../drag/DragContext.jsx';
import PresetLibrary from './PresetLibrary';
import AnnouncementPresetLibrary from './AnnouncementPresetLibrary';
import SlideImagesPanel from './SlideImagesPanel';
import SlideTimingsPanel from './SlideTimingsPanel';
import WeeklyView from './WeeklyView';
import ExtrasPanel from './ExtrasPanel';
import ImagePicker from './ImagePicker';
import ConfirmModal from './ConfirmModal';
import NewSessionWizard from './NewSessionWizard';
import SaveTemplateModal from './SaveTemplateModal';
import ConfigPanel from './ConfigPanel';
import { useAppConfig } from '../../hooks/useAppConfig';

const repo     = new FirebaseBulletinRepo();
const exporter = new ReactPDFExporter();

const HISTORY_LIMIT = 50;

function toInputDate(weekLabel) {
  try {
    const d = new Date(weekLabel);
    if (isNaN(d)) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  } catch { return ''; }
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Summary card ──────────────────────────────────────────────
function SummaryCard({ item, isActive, isTemplate, onEdit, onPresent, onDelete, onEndSession }) {
  const dayCount   = (item.days ?? []).filter(d => d.events?.length > 0).length;
  const eventCount = (item.days ?? []).reduce((s, d) => s + (d.events?.length ?? 0), 0);
  const name       = item.presetName ?? item.name ?? 'Untitled';
  return (
    <div style={{
      background: isActive ? '#f0faf3' : '#fff', borderRadius: 12,
      border: isActive ? '1.5px solid #27ae6044' : '1.5px solid #e8d9c0',
      padding: '14px 18px', marginBottom: 8, boxShadow: '0 1px 6px rgba(92,61,30,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isActive && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#27ae60', boxShadow: '0 0 6px #27ae6088' }} />}
          <span style={{ fontSize: 14, fontWeight: 700, color: '#3d2408', fontFamily: 'Playfair Display, serif' }}>{name}</span>
          {isTemplate && <span style={{ fontSize: 9, fontWeight: 700, color: '#b8860b', background: '#fdf6ec', padding: '1px 6px', borderRadius: 4, border: '1px solid #e8d9c0', textTransform: 'uppercase', letterSpacing: 0.5 }}>Template</span>}
        </div>
        {!isTemplate && item.weekLabel && <span style={{ fontSize: 11, color: '#b0956e' }}>{item.weekLabel}</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        {dayCount > 0 && <span style={{ fontSize: 10, color: '#5c3d1e', background: '#fdf6ec', padding: '2px 7px', borderRadius: 4, border: '1px solid #e8d9c0' }}>{dayCount} days · {eventCount} events</span>}
      </div>
      {(item.days ?? []).filter(d => d.events?.length > 0).slice(0, 4).map((day, i) => (
        <div key={i} style={{ fontSize: 11, color: '#5c3d1e', padding: '2px 0', display: 'flex', gap: 8 }}>
          <span style={{ fontWeight: 700, minWidth: 60, fontSize: 10 }}>{day.day}</span>
          <span style={{ color: '#b0956e', fontSize: 10 }}>{day.events.map(e => e.name).join(', ')}</span>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        <button onClick={onEdit} style={btn('#b8860b', '#d4a017')}>Edit</button>
        {!isTemplate && onPresent && (
          <button onClick={onPresent} style={{ padding: '6px 16px', background: isActive ? '#27ae60' : '#2c3e50', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {isActive ? '✓ Presenting' : '📺 Present'}
          </button>
        )}
        {!isTemplate && onEndSession && (
          <button onClick={onEndSession} style={{ padding: '6px 16px', background: 'none', border: '1.5px solid #e67e22', borderRadius: 7, fontSize: 12, color: '#e67e22', cursor: 'pointer', fontWeight: 600 }}>End</button>
        )}
        <button onClick={onDelete} style={{ padding: '6px 16px', background: 'none', border: '1.5px solid #e8d9c0', borderRadius: 7, fontSize: 12, color: '#c0392b', cursor: 'pointer' }}>Delete</button>
      </div>
    </div>
  );
}

// ── Telegram bar ──────────────────────────────────────────────
function TelegramBar({ session, publishing, devMode, onPublish, onRepublish, onUndo, onPublishAnnouncements, onUndoAnnouncements }) {
  const ids     = session?.telegramMessageIds ?? [];
  const annIds  = session?.telegramAnnouncementIds ?? [];
  const hasSent = ids.length > 0;
  const hasAnn  = annIds.length > 0;
  const lastPub = session?.lastPublished ?? session?.telegramLastSent;
  const lastAnn = session?.lastAnnouncementsSent;

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${devMode ? '#22c55e44' : '#e8d9c0'}`, padding: '14px 20px', boxShadow: '0 1px 6px rgba(92,61,30,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>📨</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#5c3d1e', textTransform: 'uppercase', letterSpacing: 1 }}>Telegram</span>
          {devMode && <span style={{ fontSize: 9, fontWeight: 700, color: '#22c55e', background: '#f0fdf4', padding: '2px 7px', borderRadius: 4, border: '1px solid #22c55e44', textTransform: 'uppercase', letterSpacing: 0.5 }}>TEST</span>}
        </div>
        {hasSent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#27ae60' }} />
            <span style={{ fontSize: 11, color: '#27ae60', fontWeight: 600 }}>Sent</span>
            {lastPub && <span style={{ fontSize: 10, color: '#b0956e' }}>· {timeAgo(lastPub)}</span>}
            <span style={{ fontSize: 10, color: '#b0956e' }}>· {ids.length} msg{ids.length !== 1 ? 's' : ''}</span>
          </div>
        ) : (
          <span style={{ fontSize: 11, color: '#b0956e' }}>Not yet published</span>
        )}
      </div>
      {lastAnn && <div style={{ fontSize: 10, color: '#2980b9', marginBottom: 8 }}>📢 Announcements sent {timeAgo(lastAnn)}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {!hasSent ? (
          <button onClick={onPublish} disabled={publishing} style={teleBtn(publishing, '#3d2408', '#5c3d1e')}>
            {publishing ? 'Publishing...' : '📤 Publish Full Bulletin'}
          </button>
        ) : (
          <>
            <button onClick={onRepublish} disabled={publishing} style={teleBtn(publishing, '#b8860b', '#d4a017')}>
              {publishing ? '...' : '🔄 Re-publish'}
            </button>
            <button onClick={onUndo} disabled={publishing} style={teleBtnOutline(publishing, '#c0392b')}>🗑 Undo</button>
          </>
        )}
        <button onClick={onPublishAnnouncements} disabled={publishing} style={teleBtn(publishing, '#1a5276', '#2980b9')}>
          📢 Announcements Only
        </button>
        {hasAnn && <button onClick={onUndoAnnouncements} disabled={publishing} style={teleBtnOutline(publishing, '#2980b9')}>🗑 Undo Ann.</button>}
      </div>
      {hasSent && <div style={{ fontSize: 10, color: '#b0956e', marginTop: 8, fontStyle: 'italic' }}>Undo available for 48 hours after sending.</div>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function AdminPanel() {
  const { config } = useAppConfig();

  const [sessions,            setSessions]            = useState([]);
  const [templates,           setTemplates]           = useState([]);
  const [presets,             setPresets]             = useState([]);
  const [announcementPresets, setAnnouncementPresets] = useState([]);
  const [activeBulletinId,    setActiveBulletinId]    = useState(null);
  const [logoUrl,             setLogoUrl]             = useState('');

  const [editing,     setEditing]     = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [dirty,       setDirty]       = useState(false);

  // ── Undo / redo stacks ────────────────────────────────────
  const [history, setHistory] = useState([]);
  const [future,  setFuture]  = useState([]);
  const editingRef = useRef(null);
  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  const [status,     setStatus]     = useState('');
  const [statusType, setStatusType] = useState('info');
  const [publishing, setPublishing] = useState(false);
  const [saving,     setSaving]     = useState(false);

  const [wizardOpen,       setWizardOpen]       = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [endSessionTarget, setEndSessionTarget] = useState(null);
  const [endSessionDate,   setEndSessionDate]   = useState('');
  const [endSessionMode,   setEndSessionMode]   = useState('restart');
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', warning: '', confirmLabel: 'Confirm', confirmColor: '#c0392b', onConfirm: () => {} });

  const showConfirm  = opts => setConfirm({ open: true, confirmColor: '#c0392b', confirmLabel: 'Confirm', warning: '', ...opts });
  const closeConfirm = () => setConfirm(c => ({ ...c, open: false }));
  const setMsg = (msg, type = 'info') => { setStatus(msg); setStatusType(type); setTimeout(() => setStatus(''), 3500); };

  useEffect(() => {
    repo.listSessions().then(setSessions);
    repo.listTemplates().then(setTemplates);
    repo.getLogo().then(setLogoUrl).catch(() => {});
    repo.getActive().then(setActiveBulletinId);
    fetchPresets().then(ps => {
      if (ps.length === 0) {
        Promise.all(DEFAULT_PRESETS.map((p, i) => savePreset({ ...p, order: i }))).then(() => setPresets(DEFAULT_PRESETS));
      } else setPresets(ps);
    });
    try {
      const saved = JSON.parse(localStorage.getItem('wa_ann_presets') ?? '[]');
      setAnnouncementPresets(saved.length > 0 ? saved : DEFAULT_ANNOUNCEMENT_PRESETS);
    } catch { setAnnouncementPresets(DEFAULT_ANNOUNCEMENT_PRESETS); }
  }, []);

  useEffect(() => {
    if (announcementPresets.length > 0) localStorage.setItem('wa_ann_presets', JSON.stringify(announcementPresets));
  }, [announcementPresets]);

  // Clear stacks when opening a different item
  useEffect(() => { setHistory([]); setFuture([]); }, [editing?.id]);

  const updater = useCallback(
    (current, changes) => (editingType === 'template' ? updateTemplate : updateSession)(current, changes),
    [editingType]
  );
  // ── updateEditing — pushes to undo stack ──────────────────
  const updateEditing = useCallback(changes => {
    setEditing(current => {
      if (!current) return current;
      setHistory(h => [...h.slice(-(HISTORY_LIMIT - 1)), current]);
      setFuture([]);
      setDirty(true);
      return updater(current, changes);
    });
  }, [updater]);

  // ── updateEditingDirect — for full object updates (also pushes to undo stack) ──────────────────
  const updateEditingDirect = useCallback(newEditing => {
    setHistory(h => [...h.slice(-(HISTORY_LIMIT - 1)), editingRef.current]);
    setFuture([]);
    setDirty(true);
    setEditing(newEditing);
  }, []);

  // ── Undo ──────────────────────────────────────────────────
  const undo = useCallback(() => {
    setHistory(h => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setEditing(prev);
      setFuture(f => [editingRef.current, ...f.slice(0, HISTORY_LIMIT - 1)]);
      setDirty(true);
      return h.slice(0, -1);
    });
  }, []);

  // ── Redo ──────────────────────────────────────────────────
  const redo = useCallback(() => {
    setFuture(f => {
      if (!f.length) return f;
      const next = f[0];
      setEditing(next);
      setHistory(h => [...h.slice(-(HISTORY_LIMIT - 1)), editingRef.current]);
      setDirty(true);
      return f.slice(1);
    });
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const handler = e => {
      if (!editing) return;
      // Don't intercept when typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (ctrl &&  e.shiftKey && e.key === 'z') { e.preventDefault(); redo(); }
      if (ctrl && e.key === 'y')                 { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editing, undo, redo]);

  const guardUnsaved = action => {
    if (dirty) showConfirm({ title: 'Unsaved changes', message: 'Discard unsaved changes?', confirmLabel: 'Discard', confirmColor: '#e67e22', onConfirm: () => { closeConfirm(); setDirty(false); action(); } });
    else action();
  };

  const addPreset      = async p  => { const o = { ...p, order: presets.length }; await savePreset(o); setPresets(ps => [...ps, o]); };
  const editPreset     = async p  => { await savePreset(p); setPresets(ps => ps.map(x => x.id === p.id ? p : x)); };
  const removePreset   = id => { showConfirm({ title: 'Delete event preset?', message: 'Permanently remove this preset?', confirmLabel: 'Delete', onConfirm: async () => { closeConfirm(); await deletePresetFS(id); setPresets(ps => ps.filter(p => p.id !== id)); } }); };
  const reorderPresets = async r => { setPresets(r); await savePresetOrder(r); };

  const addAnnPreset    = ()  => setAnnouncementPresets(ps => [...ps, createAnnouncementPreset()]);
  const editAnnPreset   = u   => setAnnouncementPresets(ps => ps.map(p => p.id === u.id ? u : p));
  const removeAnnPreset = id  => { showConfirm({ title: 'Delete announcement preset?', message: 'Permanently remove?', confirmLabel: 'Delete', onConfirm: () => { closeConfirm(); setAnnouncementPresets(ps => ps.filter(p => p.id !== id)); } }); };
  const addAnnFromPreset = preset => { if (!editing) return; updateEditing({ announcements: [...(editing.announcements ?? []), createAnnouncement(preset.text, preset.image)] }); };

  const handleLogoChange = async url => { setLogoUrl(url); await repo.setLogo(url); };

  // Drag handlers also push to history
  const pushHistory = useCallback(snapshot => {
    setHistory(h => [...h.slice(-(HISTORY_LIMIT - 1)), snapshot]);
    setFuture([]);
    setDirty(true);
  }, []);

  const handleDrop = useCallback((dragData, zoneData) => {
    const { dayIdx } = zoneData;
    setEditing(b => {
      const days = [...b.days];
      if (dragData.id && dragData.color) {
        pushHistory(b);
        days[dayIdx] = { ...days[dayIdx], events: [...days[dayIdx].events, createEvent(dragData)] };
        return updater(b, { days });
      }
      if (dragData.name === 'New Event') {
        pushHistory(b);
        days[dayIdx] = { ...days[dayIdx], events: [...days[dayIdx].events, createEvent(null, { name: 'New Event' })] };
        return updater(b, { days });
      }
      if (dragData.event) {
        const { event, dayIdx: fromDay, eventIdx } = dragData;
        if (fromDay === dayIdx) return b;
        pushHistory(b);
        days[fromDay] = { ...days[fromDay], events: days[fromDay].events.filter((_, i) => i !== eventIdx) };
        days[dayIdx]  = { ...days[dayIdx],  events: [...days[dayIdx].events, event] };
        return updater(b, { days });
      }
      return b;
    });
  }, [editingType, pushHistory]);

  const handleSort = useCallback((dragData, overData) => {
    const f = dragData.index, t = overData.index;
    if (f === undefined || t === undefined || f === t) return;
    reorderPresets(arrayMove(presets, f, t));
  }, [presets, reorderPresets]);

  const handleEventReorder = useCallback((dragData, overData) => {
    const { dayIdx: fromDay, eventIdx: fromIdx } = dragData;
    const { dayIdx: toDay,   eventIdx: toIdx   } = overData;
    if (fromDay !== toDay || fromIdx === toIdx) return;
    setEditing(b => {
      pushHistory(b);
      const days = [...b.days]; const events = [...days[fromDay].events];
      const [moved] = events.splice(fromIdx, 1); events.splice(toIdx, 0, moved);
      days[fromDay] = { ...days[fromDay], events };
      return updater(b, { days });
    });
  }, [editingType, pushHistory]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    if (editingType === 'template') { await repo.saveTemplate(editing); setTemplates(await repo.listTemplates()); }
    else { await repo.saveSession(editing); setSessions(await repo.listSessions()); }
    setDirty(false); setMsg('Saved!', 'success'); setSaving(false);
  };

  const openEditor = (item, type) => { guardUnsaved(() => { setEditing(item); setEditingType(type); setDirty(false); }); };
  const backToList = () => { guardUnsaved(() => { setEditing(null); setEditingType(null); setDirty(false); }); };

  const onSessionCreated = async session => {
    await repo.saveSession(session); setSessions(await repo.listSessions());
    setEditing(session); setEditingType('session'); setDirty(false);
    setMsg(`Session created: ${session.presetName}`, 'success');
  };

  const createNewTemplate = () => {
    guardUnsaved(() => { const t = createTemplate('New Template'); setEditing(t); setEditingType('template'); setDirty(true); });
  };

  const handleSaveAsTemplate = async (mode, overwriteId, name) => {
    if (!editing || editingType !== 'session') return;
    const tmpl = sessionToTemplate(editing, name);
    if (mode === 'overwrite' && overwriteId) tmpl.id = overwriteId;
    await repo.saveTemplate(tmpl);
    setTemplates(await repo.listTemplates());
    setEditing(e => updateSession(e, { templateId: tmpl.id }));
    setSaveTemplateOpen(false);
    setMsg(`Template saved: ${name}`, 'success');
  };

  const deleteItem = (item, type) => {
    const isPresenting = type === 'session' && activeBulletinId === item.id;
    const name = item.presetName ?? item.name;
    showConfirm({
      title: `Delete ${type}?`, message: `Permanently delete "${name}"?`,
      warning: isPresenting ? 'This is currently being presented!' : '',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        closeConfirm();
        if (type === 'template') { await repo.deleteTemplate(item.id); setTemplates(await repo.listTemplates()); }
        else { await repo.deleteSession(item.id); setSessions(await repo.listSessions()); }
        if (editing?.id === item.id) { setEditing(null); setEditingType(null); }
        if (isPresenting) { await repo.setActive(null); setActiveBulletinId(null); }
      },
    });
  };

  const setAsPresentation = id => {
    const targetId = id ?? editing?.id;
    if (!targetId || activeBulletinId === targetId) return;
    const target = sessions.find(s => s.id === targetId) ?? editing;
    showConfirm({
      title: 'Switch presentation?', message: `Set "${target?.presetName ?? 'this session'}" as the live presentation?`,
      confirmLabel: 'Set as presentation', confirmColor: '#27ae60',
      onConfirm: async () => { closeConfirm(); await repo.setActive(targetId); setActiveBulletinId(targetId); setMsg('Now presenting!', 'success'); },
    });
  };

  const handleEndSession  = session => { setEndSessionTarget(session); setEndSessionDate(''); setEndSessionMode('restart'); };
  const confirmEndSession = async () => {
    if (!endSessionTarget) return;
    const session   = endSessionTarget;
    const wasActive = activeBulletinId === session.id;
    if (endSessionMode === 'restart' && endSessionDate) {
      const tmpl = session.templateId ? templates.find(t => t.id === session.templateId) : null;
      let newSession;
      if (tmpl) { newSession = templateToSession(tmpl, endSessionDate); newSession.presetName = session.presetName; }
      else { const tmp = sessionToTemplate(session, session.presetName); newSession = templateToSession(tmp, endSessionDate); }
      await repo.saveSession(newSession);
      if (wasActive) { await repo.setActive(newSession.id); setActiveBulletinId(newSession.id); }
      setSessions(await repo.listSessions());
      openEditor(newSession, 'session');
      setMsg(`Restarted: ${newSession.presetName}`, 'success');
    } else {
      if (wasActive) { await repo.setActive(null); setActiveBulletinId(null); }
      setMsg(`Session ended: ${session.presetName}`, 'info');
    }
    setEndSessionTarget(null);
  };

  const publish = () => {
    if (!editing || editingType !== 'session') return;
    showConfirm({
      title: 'Publish to Telegram?',
      message: `Send the full bulletin to the ${config.devMode ? 'TEST' : 'live'} Telegram channel.`,
      confirmLabel: 'Publish', confirmColor: '#5c3d1e',
      onConfirm: async () => {
        closeConfirm(); setPublishing(true);
        try {
          setMsg('Generating PDF...', 'info');
          const blob    = await exporter.export(editing, logoUrl);
          setMsg('Sending to Telegram...', 'info');
          const adapter = await TelegramAdapter.create();
          const messageIds = await adapter.publish(editing, blob);
          const updated = updateSession(editing, { lastPublished: new Date().toISOString(), telegramMessageIds: messageIds, telegramLastSent: new Date().toISOString() });
          setEditing(updated); await repo.saveSession(updated); setSessions(await repo.listSessions());
          setDirty(false); setMsg('Published!', 'success');
        } catch (e) { setMsg(`Error: ${e.message}`, 'error'); }
        setPublishing(false);
      },
    });
  };

  const republish = () => {
    if (!editing || editingType !== 'session') return;
    const oldIds = editing.telegramMessageIds ?? [];
    showConfirm({
      title: 'Re-publish bulletin?',
      message: oldIds.length > 0 ? `Delete ${oldIds.length} previously sent message${oldIds.length > 1 ? 's' : ''} and send an updated bulletin.` : 'Send an updated bulletin to Telegram.',
      confirmLabel: 'Re-publish', confirmColor: '#b8860b',
      onConfirm: async () => {
        closeConfirm(); setPublishing(true);
        try {
          if (oldIds.length) {
            setMsg('Removing old messages...', 'info');
            const adapter = await TelegramAdapter.create();
            await adapter.deleteMessages(oldIds);
          }
          setMsg('Generating PDF...', 'info');
          const blob    = await exporter.export(editing, logoUrl);
          setMsg('Sending updated bulletin...', 'info');
          const adapter = await TelegramAdapter.create();
          const messageIds = await adapter.publish(editing, blob);
          const updated = updateSession(editing, { lastPublished: new Date().toISOString(), telegramMessageIds: messageIds, telegramLastSent: new Date().toISOString() });
          setEditing(updated); await repo.saveSession(updated); setSessions(await repo.listSessions());
          setDirty(false); setMsg('Re-published!', 'success');
        } catch (e) { setMsg(`Error: ${e.message}`, 'error'); }
        setPublishing(false);
      },
    });
  };

  const undoSend = () => {
    if (!editing || editingType !== 'session') return;
    const ids = editing.telegramMessageIds ?? [];
    if (!ids.length) { setMsg('Nothing to undo', 'info'); return; }
    showConfirm({
      title: 'Undo Telegram send?', message: `Delete ${ids.length} message${ids.length > 1 ? 's' : ''} from the Telegram channel?`,
      warning: 'Messages older than 48 hours cannot be deleted by the bot.',
      confirmLabel: 'Delete Messages', confirmColor: '#c0392b',
      onConfirm: async () => {
        closeConfirm(); setPublishing(true);
        try {
          const adapter = await TelegramAdapter.create();
          const results = await adapter.deleteMessages(ids);
          const deleted = results.filter(r => r.deleted).length;
          const failed  = results.filter(r => !r.deleted).length;
          const updated = updateSession(editing, { telegramMessageIds: [], telegramLastSent: null });
          setEditing(updated); await repo.saveSession(updated); setSessions(await repo.listSessions());
          setDirty(false);
          setMsg(failed > 0 ? `Deleted ${deleted}, failed ${failed}` : `Deleted ${deleted} message${deleted > 1 ? 's' : ''}`, failed > 0 ? 'error' : 'success');
        } catch (e) { setMsg(`Error: ${e.message}`, 'error'); }
        setPublishing(false);
      },
    });
  };

  const publishAnnouncements = async () => {
    if (!editing || editingType !== 'session') return;
    const ann = editing.announcements ?? [];
    if (!ann.length) { setMsg('No announcements', 'info'); return; }
    setPublishing(true);
    try {
      const adapter = await TelegramAdapter.create();
      const ids = await adapter.publishAnnouncements(editing);
      const updated = updateSession(editing, { lastAnnouncementsSent: new Date().toISOString(), telegramAnnouncementIds: ids });
      setEditing(updated); await repo.saveSession(updated);
      setMsg('Announcements sent!', 'success');
    } catch (e) { setMsg(`Error: ${e.message}`, 'error'); }
    setPublishing(false);
  };

  const undoAnnouncements = () => {
    if (!editing || editingType !== 'session') return;
    const ids = editing.telegramAnnouncementIds ?? [];
    if (!ids.length) { setMsg('Nothing to undo', 'info'); return; }
    showConfirm({
      title: 'Undo announcements?', message: `Delete ${ids.length} announcement message${ids.length > 1 ? 's' : ''} from Telegram?`,
      warning: 'Messages older than 48 hours cannot be deleted by the bot.',
      confirmLabel: 'Delete Messages', confirmColor: '#c0392b',
      onConfirm: async () => {
        closeConfirm(); setPublishing(true);
        try {
          const adapter = await TelegramAdapter.create();
          const results = await adapter.deleteMessages(ids);
          const deleted = results.filter(r => r.deleted).length;
          const failed  = results.filter(r => !r.deleted).length;
          const updated = updateSession(editing, { telegramAnnouncementIds: [], lastAnnouncementsSent: null });
          setEditing(updated); await repo.saveSession(updated);
          setMsg(failed > 0 ? `Deleted ${deleted}, failed ${failed}` : `Deleted ${deleted} message${deleted > 1 ? 's' : ''}`, failed > 0 ? 'error' : 'success');
        } catch (e) { setMsg(`Error: ${e.message}`, 'error'); }
        setPublishing(false);
      },
    });
  };

  const statusColor = { success: '#27ae60', error: '#c0392b', info: '#7a6352' }[statusType];
  const isSession   = editingType === 'session';
  const canUndo     = history.length > 0;
  const canRedo     = future.length > 0;

  // ── LIST VIEW ─────────────────────────────────────────────
  if (!editing) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4ece0', fontFamily: 'Inter, sans-serif' }}>
        {config.devMode && <div style={{ position: 'fixed', inset: 0, border: '4px solid #22c55e', pointerEvents: 'none', zIndex: 99999 }} />}
        <ConfirmModal {...confirm} onCancel={closeConfirm} />
        <NewSessionWizard open={wizardOpen} templates={templates} onClose={() => setWizardOpen(false)} onCreate={onSessionCreated} />

        {endSessionTarget && (
          <div onClick={() => setEndSessionTarget(null)} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <style>{`@keyframes slideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '90%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '1.5px solid #e8d9c0', animation: 'slideUp 0.2s ease', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #2e1a08, #5c3d1e)', padding: '20px 28px' }}>
                <div style={{ color: '#e67e22', fontSize: 14, fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>End Session</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>{endSessionTarget.presetName}</div>
              </div>
              <div style={{ padding: '20px 28px' }}>
                <div style={{ fontSize: 13, color: '#5c3d1e', marginBottom: 16, lineHeight: 1.6 }}>What would you like to do with this session?</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <button onClick={() => setEndSessionMode('restart')} style={{ flex: 1, padding: '14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', background: endSessionMode === 'restart' ? '#fdf6ec' : '#fff', border: endSessionMode === 'restart' ? '1.5px solid #b8860b' : '1.5px solid #e8d9c0' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: endSessionMode === 'restart' ? '#b8860b' : '#3d2408' }}>🔄 Restart with new date</div>
                    <div style={{ fontSize: 11, color: '#b0956e', marginTop: 3 }}>Create a new session using the same template with a new week date</div>
                  </button>
                  <button onClick={() => setEndSessionMode('archive')} style={{ flex: 1, padding: '14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', background: endSessionMode === 'archive' ? '#fdf6ec' : '#fff', border: endSessionMode === 'archive' ? '1.5px solid #b8860b' : '1.5px solid #e8d9c0' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: endSessionMode === 'archive' ? '#b8860b' : '#3d2408' }}>✓ Just end it</div>
                    <div style={{ fontSize: 11, color: '#b0956e', marginTop: 3 }}>Stop presenting{activeBulletinId === endSessionTarget.id ? ' (currently live)' : ''}</div>
                  </button>
                </div>
                {endSessionMode === 'restart' && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: '#b0956e', fontWeight: 600, marginBottom: 6 }}>New week date</div>
                    <input type="date" value={endSessionDate} onChange={e => setEndSessionDate(e.target.value)} autoFocus style={{ width: '100%', fontSize: 14, padding: '10px 12px', border: '1.5px solid #e0cba8', borderRadius: 8, background: '#fdf6ec', color: '#5c3d1e', outline: 'none', boxSizing: 'border-box' }} />
                    {endSessionTarget.templateId
                      ? <div style={{ fontSize: 10, color: '#27ae60', marginTop: 6 }}>✓ Will use the original template</div>
                      : <div style={{ fontSize: 10, color: '#b0956e', marginTop: 6 }}>No linked template — will recreate from current session</div>}
                  </div>
                )}
                {endSessionMode === 'archive' && activeBulletinId === endSessionTarget.id && (
                  <div style={{ fontSize: 11, color: '#c0392b', background: '#fdf0ed', padding: '10px 14px', borderRadius: 8, border: '1px solid #f5c6cb', marginBottom: 16 }}>⚠️ This session is currently being presented. Ending it will clear the screen.</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button onClick={() => setEndSessionTarget(null)} style={{ padding: '8px 18px', background: '#f4ece0', border: '1px solid #e0cba8', borderRadius: 8, fontSize: 13, color: '#5c3d1e', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={confirmEndSession} disabled={endSessionMode === 'restart' && !endSessionDate} style={{ padding: '8px 22px', background: (endSessionMode === 'archive' || endSessionDate) ? '#e67e22' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: (endSessionMode === 'archive' || endSessionDate) ? 'pointer' : 'default' }}>
                    {endSessionMode === 'restart' ? 'Restart Session' : 'End Session'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ background: 'linear-gradient(135deg, #2e1a08 0%, #5c3d1e 100%)', boxShadow: '0 2px 24px rgba(46,26,8,0.3)' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(212,160,23,0.15)', border: '1.5px solid rgba(212,160,23,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#d4a017' }}>✝</div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>{CHURCH_NAME}</div>
                <div style={{ color: '#fff', fontSize: 16, fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>Weekly Announcements</div>
              </div>
              {config.devMode && <span style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '3px 10px', borderRadius: 4, border: '1px solid rgba(34,197,94,0.3)', letterSpacing: 1, textTransform: 'uppercase' }}>Dev Mode</span>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setWizardOpen(true)} style={btn('#b8860b', '#d4a017')}>+ New Session</button>
              <button onClick={createNewTemplate} style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>+ New Template</button>
              <a href="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none', padding: '8px 12px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, display: 'flex', alignItems: 'center' }}>Present →</a>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
          <div>
            <SectionTitle>Sessions ({sessions.length})</SectionTitle>
            {sessions.length === 0 && <EmptyMsg>No sessions yet.</EmptyMsg>}
            {sessions.map(s => (
              <SummaryCard key={s.id} item={s} isActive={activeBulletinId === s.id}
                onEdit={() => openEditor(s, 'session')} onPresent={() => setAsPresentation(s.id)}
                onDelete={() => deleteItem(s, 'session')} onEndSession={() => handleEndSession(s)} />
            ))}
          </div>
          <div>
            <SectionTitle>Templates ({templates.length})</SectionTitle>
            {templates.length === 0 && <EmptyMsg>No templates yet.</EmptyMsg>}
            {templates.map(t => (
              <SummaryCard key={t.id} item={t} isTemplate onEdit={() => openEditor(t, 'template')} onDelete={() => deleteItem(t, 'template')} />
            ))}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Card style={{ border: `1.5px solid ${config.devMode ? '#22c55e55' : '#e8d9c0'}` }}>
              <ConfigPanel />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ── EDIT VIEW ─────────────────────────────────────────────
  const editorName    = editing.presetName ?? editing.name ?? 'Untitled';
  const setEditorName = v => { if (isSession) updateEditing({ presetName: v }); else updateEditing({ name: v }); };

  return (
    <DragProvider onDrop={handleDrop} onSort={handleSort} onEventReorder={handleEventReorder}>
      {/* Full-viewport shell — nothing scrolls except the content column */}
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f4ece0', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
        {config.devMode && <div style={{ position: 'fixed', inset: 0, border: '4px solid #22c55e', pointerEvents: 'none', zIndex: 99999 }} />}
        <ConfirmModal {...confirm} onCancel={closeConfirm} />
        <SaveTemplateModal open={saveTemplateOpen} defaultName={editorName} sourceTemplateId={editing.templateId} templates={templates} onSave={handleSaveAsTemplate} onClose={() => setSaveTemplateOpen(false)} />

        {/* Bar 1 — dark, never scrolls */}
        <div style={{ background: 'linear-gradient(135deg, #2e1a08 0%, #5c3d1e 100%)', boxShadow: '0 2px 24px rgba(46,26,8,0.3)', flexShrink: 0, zIndex: 51 }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={backToList} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', padding: '6px 12px', borderRadius: 6, flexShrink: 0 }}>← Back</button>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(212,160,23,0.15)', border: '1.5px solid rgba(212,160,23,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#d4a017', flexShrink: 0 }}>✝</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#fff', fontSize: 15, fontFamily: 'Playfair Display, serif', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editorName}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: isSession ? '#2ecc71' : '#d4a017', background: isSession ? 'rgba(46,204,113,0.15)' : 'rgba(212,160,23,0.15)', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>{editingType}</span>
                {dirty && <span style={{ fontSize: 10, color: '#e67e22', flexShrink: 0 }}>• unsaved</span>}
              </div>
              {isSession && editing.weekLabel && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Week of {editing.weekLabel}</div>}
            </div>
            {config.devMode && <span style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '3px 10px', borderRadius: 4, border: '1px solid rgba(34,197,94,0.3)', letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0 }}>Dev Mode</span>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: '#b0956e', fontWeight: 600 }}>Logo</span>
              <ImagePicker value={logoUrl} onChange={handleLogoChange} />
            </div>
            <a href="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none', padding: '6px 12px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, flexShrink: 0 }}>Present →</a>
          </div>
        </div>

        {/* Bar 2 — white, never scrolls */}
        <div style={{ background: '#fff', borderBottom: '1.5px solid #e8d9c0', boxShadow: '0 1px 6px rgba(92,61,30,0.07)', flexShrink: 0, zIndex: 50 }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '8px 32px', display: 'flex', gap: 8, alignItems: 'center' }}>

            {/* Undo / Redo */}
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              <button onClick={undo} disabled={!canUndo}
                title={`Undo (${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Z) · ${history.length} step${history.length !== 1 ? 's' : ''}`}
                style={{ padding: '5px 9px', fontSize: 13, fontWeight: 700, lineHeight: 1, background: canUndo ? '#fdf6ec' : 'transparent', border: '1.5px solid #e0cba8', borderRadius: '6px 0 0 6px', color: canUndo ? '#5c3d1e' : '#d0b88a', cursor: canUndo ? 'pointer' : 'default', transition: 'all 0.15s' }}
              >←</button>
              <button onClick={redo} disabled={!canRedo}
                title={`Redo (${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Shift+Z) · ${future.length} step${future.length !== 1 ? 's' : ''}`}
                style={{ padding: '5px 9px', fontSize: 13, fontWeight: 700, lineHeight: 1, background: canRedo ? '#fdf6ec' : 'transparent', border: '1.5px solid #e0cba8', borderLeft: 'none', borderRadius: '0 6px 6px 0', color: canRedo ? '#5c3d1e' : '#d0b88a', cursor: canRedo ? 'pointer' : 'default', transition: 'all 0.15s' }}
              >→</button>
            </div>

            <div style={{ width: 1, height: 16, background: '#e0cba8', flexShrink: 0 }} />

            <input value={editorName} onChange={e => setEditorName(e.target.value)}
              style={{ fontSize: 14, fontFamily: 'Playfair Display, serif', fontWeight: 600, border: 'none', background: 'transparent', color: '#3d2408', outline: 'none', minWidth: 80, maxWidth: 220, flexShrink: 1 }} />

            {isSession && <>
              <div style={{ width: 1, height: 16, background: '#e0cba8', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#b0956e', fontWeight: 600, flexShrink: 0 }}>Week of</span>
              <input type="date" value={toInputDate(editing.weekLabel)}
                onChange={e => {
                  const d = new Date(e.target.value + 'T00:00:00');
                  if (isNaN(d)) return;
                  const label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                  const ALL_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                  const toISO = dt => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
                  const pickedDow = d.getDay();
                  setEditing(b => {
                    if (!b.days.length) return updateSession(b, { weekLabel: label });
                    let anchorIdx = b.days.findIndex(day => ALL_DAYS.indexOf(day.day) === pickedDow);
                    if (anchorIdx === -1) anchorIdx = 0;
                    const anchorDow = ALL_DAYS.indexOf(b.days[anchorIdx].day);
                    let anchorOffset = anchorDow - pickedDow;
                    if (anchorOffset > 3) anchorOffset -= 7;
                    if (anchorOffset < -3) anchorOffset += 7;
                    const anchorDate = new Date(d); anchorDate.setDate(anchorDate.getDate() + anchorOffset);
                    const updatedDays = [];
                    for (let i = 0; i < b.days.length; i++) {
                      const day = b.days[i];
                      if (i === anchorIdx) { updatedDays.push({ ...day, date: toISO(anchorDate) }); continue; }
                      const dayDow = ALL_DAYS.indexOf(day.day);
                      let offset = dayDow - anchorDow;
                      if (i < anchorIdx && offset > 0) offset -= 7;
                      if (i > anchorIdx && offset < 0) offset += 7;
                      const dayDate = new Date(anchorDate); dayDate.setDate(dayDate.getDate() + offset);
                      updatedDays.push({ ...day, date: toISO(dayDate) });
                    }
                    setDirty(true);
                    return updateSession(b, { weekLabel: label, days: updatedDays });
                  });
                }}
                style={{ fontSize: 10, padding: '2px 4px', border: '1.5px solid #e0cba8', borderRadius: 5, background: '#fdf6ec', color: '#5c3d1e', outline: 'none', flexShrink: 0, width: 112 }} />
            </>}

            <div style={{ flex: 1 }} />

            <button onClick={save} disabled={saving} style={teleBtn(saving, '#b8860b', '#d4a017')}>
              {saving ? 'Saving...' : dirty ? 'Save *' : 'Save'}
            </button>
            {isSession && <button onClick={() => setSaveTemplateOpen(true)} style={{ padding: '7px 14px', background: '#f4ece0', border: '1px solid #e0cba8', borderRadius: 8, fontSize: 12, color: '#5c3d1e', cursor: 'pointer', whiteSpace: 'nowrap' }}>Save as Template</button>}
            {isSession && (
              <button onClick={() => setAsPresentation()} style={{ padding: '7px 14px', background: activeBulletinId === editing.id ? '#27ae60' : '#2c3e50', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                {activeBulletinId === editing.id && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', boxShadow: '0 0 5px #fff8' }} />}
                {activeBulletinId === editing.id ? 'Presenting' : '📺 Present'}
              </button>
            )}
            {status && <span style={{ fontSize: 12, color: statusColor, fontWeight: 500, whiteSpace: 'nowrap' }}>{status}</span>}
          </div>
        </div>

        {/* Body — fills remaining height, never itself scrolls */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', maxWidth: 1400, width: '100%', margin: '0 auto', padding: '0 32px', boxSizing: 'border-box', gap: 24 }}>

          {/* Sidebar — fixed in place, scrolls internally */}
          <div style={{ width: 280, flexShrink: 0, overflowY: 'auto', scrollbarWidth: 'thin', display: 'flex', flexDirection: 'column', gap: 14, padding: '24px 0' }}>
            <Card><PresetLibrary presets={presets} onAdd={addPreset} onEdit={editPreset} onDelete={removePreset} onReorder={reorderPresets} /></Card>
            <Card><AnnouncementPresetLibrary presets={announcementPresets} onAdd={addAnnFromPreset} onEdit={editAnnPreset} onDelete={removeAnnPreset} onAddNew={addAnnPreset} /></Card>
            <Card style={{ border: `1.5px solid ${config.devMode ? '#22c55e55' : '#e8d9c0'}` }}><ConfigPanel /></Card>
          </div>

          {/* Content — only this scrolls */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18, padding: '24px 0' }}>
            {isSession && (
              <TelegramBar session={editing} publishing={publishing} devMode={config.devMode}
                onPublish={publish} onRepublish={republish} onUndo={undoSend}
                onPublishAnnouncements={publishAnnouncements} onUndoAnnouncements={undoAnnouncements} />
            )}

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <SectionTitle>Header Notes</SectionTitle>
                <button onClick={() => updateEditing({ headerNotes: [...(editing.headerNotes ?? []), createHeaderNote()] })}
                  style={{ padding: '3px 10px', background: 'none', border: '1.5px dashed #c9a96e', borderRadius: 6, color: '#7a5230', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>+ Add</button>
              </div>
              {(editing.headerNotes ?? []).length === 0 && <div style={{ fontSize: 11, color: '#c4a882' }}>Shown at top of presentation &amp; Telegram.</div>}
              {(editing.headerNotes ?? []).map((note, i) => (
                <div key={note.id} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                  <div style={{ width: 3, alignSelf: 'stretch', background: '#d4a017', borderRadius: 2 }} />
                  <input value={note.text} onChange={e => { const n = [...(editing.headerNotes ?? [])]; n[i] = { ...n[i], text: e.target.value }; updateEditing({ headerNotes: n }); }}
                    placeholder="Note..." style={{ flex: 1, padding: '7px 10px', fontSize: 12, border: '1.5px solid #e0cba8', borderRadius: 7, background: '#fff', color: '#3d2408', outline: 'none' }} />
                  <button onClick={() => updateEditing({ headerNotes: (editing.headerNotes ?? []).filter((_, j) => j !== i) })}
                    style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 13, cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </Card>

            <Card>
              <SectionTitle style={{ marginBottom: 16 }}>Weekly Schedule</SectionTitle>
              <WeeklyView bulletin={editing} onUpdateBulletin={updateEditingDirect} presets={presets} />
            </Card>

            <Card>
              <ExtrasPanel bulletin={editing} onChange={updateEditingDirect} />
            </Card>

            <Card>
              <SlideImagesPanel slideImages={editing.slideImages ?? []} onChange={imgs => updateEditing({ slideImages: imgs })} />
            </Card>

            <Card style={{ marginBottom: 24 }}>
              <SlideTimingsPanel bulletin={editing} onChange={changes => updateEditing(changes)} />
            </Card>
          </div>
        </div>
      </div>
    </DragProvider>
  );
}

// ── Shared mini-components ────────────────────────────────────
const Card = ({ children, style }) => (
  <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e8d9c0', padding: '20px 24px', boxShadow: '0 1px 8px rgba(92,61,30,0.07)', ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ children, style }) => (
  <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 1, ...style }}>{children}</div>
);

const EmptyMsg = ({ children }) => (
  <div style={{ color: '#c4a882', fontSize: 14, padding: '20px 0' }}>{children}</div>
);

const btn = (from, to) => ({
  padding: '8px 20px', background: `linear-gradient(135deg, ${from}, ${to})`,
  color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
});

const teleBtn = (disabled, from, to) => ({
  padding: '8px 16px', background: disabled ? '#ccc' : `linear-gradient(135deg, ${from}, ${to})`,
  color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600,
  cursor: disabled ? 'default' : 'pointer',
});

const teleBtnOutline = (disabled, color) => ({
  padding: '8px 16px', background: 'none', border: `1.5px solid ${color}`,
  borderRadius: 8, fontSize: 12, fontWeight: 600, color,
  cursor: disabled ? 'default' : 'pointer',
});