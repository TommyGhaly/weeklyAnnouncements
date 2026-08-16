import { useState, useEffect } from 'react';

// ── Checkbox ──────────────────────────────────────────────────
// Presentational only — the surrounding row owns the click, so clicking the
// box itself toggles once instead of firing here and again on the way up.
function Checkbox({ checked }) {
  return (
    <div
      style={{
        width: 17, height: 17, borderRadius: 4, flexShrink: 0,
        border: checked ? '2px solid #b8860b' : '2px solid #c9a96e',
        background: checked ? '#b8860b' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.1s',
      }}
    >
      {checked && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>}
    </div>
  );
}

// ── Section header with select-all toggle ────────────────────
function SectionHeader({ label, allChecked, onToggleAll }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 0 4px', borderBottom: '1px solid #e8d9c0', marginBottom: 4,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</span>
      <button
        onClick={onToggleAll}
        style={{
          fontSize: 10, color: '#b8860b', background: 'none', border: 'none',
          cursor: 'pointer', fontWeight: 600, padding: '2px 6px',
          borderRadius: 4, textDecoration: 'underline',
        }}
      >
        {allChecked ? 'Deselect all' : 'Select all'}
      </button>
    </div>
  );
}

// ── Item row ──────────────────────────────────────────────────
function ItemRow({ checked, onToggle, children }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '6px 8px', borderRadius: 7, cursor: 'pointer',
        background: checked ? '#fdf9f3' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <div style={{ paddingTop: 1 }}>
        <Checkbox checked={checked} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

// ── Build initial selection state from bulletin ───────────────
function buildInitialState(bulletin) {
  const headerNotes = (bulletin.headerNotes ?? [])
    .filter(n => n.text?.trim())
    .map(n => ({ ...n, _checked: false }));

  const multiDayEvents = (bulletin.multiDayEvents ?? [])
    .filter(e => e.name?.trim())
    .map(e => ({ ...e, _checked: false }));

  const announcements = (bulletin.announcements ?? [])
    .filter(a => a.text?.trim())
    .map(a => ({ ...a, _checked: false }));

  const days = (bulletin.days ?? [])
    .map(day => ({
      ...day,
      events: (day.events ?? []).map(ev => ({ ...ev, _checked: false })),
    }))
    .filter(day => day.events.length > 0);

  return { headerNotes, multiDayEvents, announcements, days };
}

// ── Build filtered bulletin from selection state ──────────────
function buildFilteredBulletin(bulletin, state) {
  const dayMap = {};
  for (const day of state.days) {
    dayMap[day.day] = day.events.filter(e => e._checked).map(({ _checked, ...e }) => e);
  }
  return {
    ...bulletin,
    headerNotes:    state.headerNotes.filter(n => n._checked).map(({ _checked, ...n }) => n),
    multiDayEvents: state.multiDayEvents.filter(e => e._checked).map(({ _checked, ...e }) => e),
    announcements:  state.announcements.filter(a => a._checked).map(({ _checked, ...a }) => a),
    days: (bulletin.days ?? []).map(day => ({
      ...day,
      events: dayMap[day.day] ?? [],
    })),
  };
}

// ── Main modal ────────────────────────────────────────────────
export default function HomilyExportModal({ open, bulletin, initialMode, onClose, onSendTelegram, onPrint, publishing, pdfBusy }) {
  const [mode,  setMode]  = useState(null);
  const [state, setState] = useState(null);

  useEffect(() => {
    if (open && bulletin) {
      setState(buildInitialState(bulletin));
      setMode(initialMode ?? null);
    }
  }, [open]);

  if (!open || !state) return null;

  const busy = publishing || pdfBusy;

  // ── Toggle helpers ──────────────────────────────────────────
  const toggleNote  = id => setState(s => ({ ...s, headerNotes:    s.headerNotes.map(n    => n.id === id ? { ...n, _checked: !n._checked } : n) }));
  const toggleMd    = id => setState(s => ({ ...s, multiDayEvents: s.multiDayEvents.map(e => e.id === id ? { ...e, _checked: !e._checked } : e) }));
  const toggleAnn   = id => setState(s => ({ ...s, announcements:  s.announcements.map(a  => a.id === id ? { ...a, _checked: !a._checked } : a) }));
  const toggleEvent = (dayName, eventId) => setState(s => ({
    ...s,
    days: s.days.map(d => d.day !== dayName ? d : {
      ...d, events: d.events.map(ev => ev.id === eventId ? { ...ev, _checked: !ev._checked } : ev),
    }),
  }));

  const toggleAllNotes  = () => { const all = state.headerNotes.every(n => n._checked);    setState(s => ({ ...s, headerNotes:    s.headerNotes.map(n    => ({ ...n, _checked: !all })) })); };
  const toggleAllMd     = () => { const all = state.multiDayEvents.every(e => e._checked); setState(s => ({ ...s, multiDayEvents: s.multiDayEvents.map(e => ({ ...e, _checked: !all })) })); };
  const toggleAllAnns   = () => { const all = state.announcements.every(a => a._checked);  setState(s => ({ ...s, announcements:  s.announcements.map(a  => ({ ...a, _checked: !all })) })); };
  const toggleAllEvents = dayName => {
    const day = state.days.find(d => d.day === dayName);
    const all = day?.events.every(e => e._checked);
    setState(s => ({
      ...s,
      days: s.days.map(d => d.day !== dayName ? d : {
        ...d, events: d.events.map(ev => ({ ...ev, _checked: !all })),
      }),
    }));
  };

  const anyChecked =
    state.headerNotes.some(n => n._checked) ||
    state.multiDayEvents.some(e => e._checked) ||
    state.announcements.some(a => a._checked) ||
    state.days.some(d => d.events.some(ev => ev._checked));

  const handleConfirm = () => {
    if (!anyChecked || !mode) return;
    const filtered = buildFilteredBulletin(bulletin, state);
    if (mode === 'print') onPrint(filtered);
    else onSendTelegram(filtered);
  };

  const fmtD = iso => {
    if (!iso) return '';
    try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return ''; }
  };

  // Summary counts
  const nNotes    = state.headerNotes.filter(n => n._checked).length;
  const nMd       = state.multiDayEvents.filter(e => e._checked).length;
  const nAnns     = state.announcements.filter(a => a._checked).length;
  const nServices = state.days.reduce((s, d) => s + d.events.filter(e => e._checked).length, 0);
  const summaryParts = [
    nNotes    > 0 && `${nNotes} note${nNotes > 1 ? 's' : ''}`,
    nMd       > 0 && `${nMd} upcoming`,
    nAnns     > 0 && `${nAnns} announcement${nAnns > 1 ? 's' : ''}`,
    nServices > 0 && `${nServices} service${nServices > 1 ? 's' : ''}`,
  ].filter(Boolean);

  const confirmLabel = !mode
    ? 'Select an action'
    : !anyChecked
      ? 'Nothing selected'
      : mode === 'print' ? 'Print PDF' : 'Send to Homily Channel';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <style>{`@keyframes slideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, width: '92%', maxWidth: 520,
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '1.5px solid #e8d9c0',
          animation: 'slideUp 0.2s ease', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #2e1a08, #5c3d1e)', padding: '18px 24px', flexShrink: 0 }}>
          <div style={{ color: '#d4a017', fontSize: 14, fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>
            Homily Export — {mode === 'print' ? 'Print PDF' : mode === 'send' ? 'Send to Homily Channel' : 'Select action'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
            Deselect anything you don't want to include
          </div>
        </div>

        {/* Action selector — only shown if mode wasn't pre-set */}
        {!initialMode && (
          <div style={{ padding: '12px 24px', borderBottom: '1.5px solid #e8d9c0', flexShrink: 0, display: 'flex', gap: 8 }}>
            <button
              onClick={() => setMode('print')}
              style={{
                flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
                background: mode === 'print' ? '#fdf6ec' : '#fff',
                border: mode === 'print' ? '1.5px solid #b8860b' : '1.5px solid #e8d9c0',
                fontSize: 12, fontWeight: 600,
                color: mode === 'print' ? '#b8860b' : '#5c3d1e',
              }}
            >
              Print PDF
            </button>
            <button
              onClick={() => setMode('send')}
              style={{
                flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
                background: mode === 'send' ? '#fdf6ec' : '#fff',
                border: mode === 'send' ? '1.5px solid #b8860b' : '1.5px solid #e8d9c0',
                fontSize: 12, fontWeight: 600,
                color: mode === 'send' ? '#b8860b' : '#5c3d1e',
              }}
            >
              Send to Homily Channel
            </button>
          </div>
        )}

        {/* Scrollable item picker */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Header Notes */}
          {state.headerNotes.length > 0 && (
            <div>
              <SectionHeader label="Header Notes" allChecked={state.headerNotes.every(n => n._checked)} onToggleAll={toggleAllNotes} />
              {state.headerNotes.map(n => (
                <ItemRow key={n.id} checked={n._checked} onToggle={() => toggleNote(n.id)}>
                  <span style={{ fontSize: 12, color: '#3d2408', fontStyle: 'italic' }}>{n.text}</span>
                </ItemRow>
              ))}
            </div>
          )}

          {/* Multi-day events */}
          {state.multiDayEvents.length > 0 && (
            <div>
              <SectionHeader label="Upcoming Events" allChecked={state.multiDayEvents.every(e => e._checked)} onToggleAll={toggleAllMd} />
              {state.multiDayEvents.map(e => {
                const sf = fmtD(e.startDate);
                const ef = e.endDate && e.endDate !== e.startDate ? fmtD(e.endDate) : null;
                return (
                  <ItemRow key={e.id} checked={e._checked} onToggle={() => toggleMd(e.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#3d2408' }}>{e.name}</span>
                      {sf && <span style={{ fontSize: 11, color: '#b8860b', flexShrink: 0 }}>{sf}{ef ? ` – ${ef}` : ''}</span>}
                    </div>
                    {e.notes && <div style={{ fontSize: 11, color: '#7a6352', marginTop: 2 }}>{e.notes}</div>}
                  </ItemRow>
                );
              })}
            </div>
          )}

          {/* Announcements */}
          {state.announcements.length > 0 && (
            <div>
              <SectionHeader label="Announcements" allChecked={state.announcements.every(a => a._checked)} onToggleAll={toggleAllAnns} />
              {state.announcements.map(a => (
                <ItemRow key={a.id} checked={a._checked} onToggle={() => toggleAnn(a.id)}>
                  <span style={{ fontSize: 12, color: '#3d2408' }}>{a.text}</span>
                </ItemRow>
              ))}
            </div>
          )}

          {/* Daily schedule */}
          {state.days.length > 0 && (
            <div>
              <SectionHeader
                label="Weekly Schedule"
                allChecked={state.days.every(d => d.events.every(e => e._checked))}
                onToggleAll={() => {
                  const allOn = state.days.every(d => d.events.every(e => e._checked));
                  setState(s => ({
                    ...s,
                    days: s.days.map(d => ({ ...d, events: d.events.map(ev => ({ ...ev, _checked: !allOn })) })),
                  }));
                }}
              />
              {state.days.map(day => {
                const allDayOn = day.events.every(e => e._checked);
                const dl = day.date ? fmtD(day.date) : '';
                return (
                  <div key={day.day} style={{ marginBottom: 4 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '4px 8px', background: '#f6f2ec',
                      borderLeft: '2px solid #b8860b', borderRadius: '0 6px 6px 0', marginBottom: 2,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#3d2408' }}>{day.day}</span>
                        {dl && <span style={{ fontSize: 10, color: '#b0956e' }}>{dl}</span>}
                      </div>
                      <button
                        onClick={() => toggleAllEvents(day.day)}
                        style={{ fontSize: 10, color: '#b8860b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '1px 4px' }}
                      >
                        {allDayOn ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    {day.events.map(ev => {
                      const time = [ev.time, ev.timeTo].filter(Boolean).join(' – ');
                      return (
                        <ItemRow key={ev.id} checked={ev._checked} onToggle={() => toggleEvent(day.day, ev.id)}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#3d2408' }}>{ev.name}</span>
                            {time && <span style={{ fontSize: 11, color: '#b8860b', flexShrink: 0 }}>{time}</span>}
                          </div>
                          {ev.notes && <div style={{ fontSize: 11, color: '#7a6352', marginTop: 1 }}>{ev.notes}</div>}
                        </ItemRow>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1.5px solid #e8d9c0',
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#faf7f2',
        }}>
          <span style={{ fontSize: 11, color: '#b0956e' }}>
            {summaryParts.length > 0 ? summaryParts.join(' · ') : 'Nothing selected'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{ padding: '8px 16px', background: '#f4ece0', border: '1px solid #e0cba8', borderRadius: 8, fontSize: 13, color: '#5c3d1e', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!mode || !anyChecked || busy}
              style={{
                padding: '8px 20px',
                background: mode && anyChecked && !busy ? 'linear-gradient(135deg, #b8860b, #d4a017)' : '#ccc',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600,
                cursor: mode && anyChecked && !busy ? 'pointer' : 'default',
                whiteSpace: 'nowrap',
              }}
            >
              {busy ? '...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}