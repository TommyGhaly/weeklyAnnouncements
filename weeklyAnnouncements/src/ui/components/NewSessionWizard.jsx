import { useState } from 'react';
import { templateToSession, createSession } from '../../core/domain/Bulletin';

export default function NewSessionWizard({ open, templates, onClose, onCreate }) {
  const [step, setStep] = useState(1); // 1=pick template, 2=pick date
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [dateValue, setDateValue] = useState('');

  if (!open) return null;

  const reset = () => { setStep(1); setSelectedTemplate(null); setDateValue(''); };
  const close = () => { reset(); onClose(); };

  const handleCreate = () => {
    if (!dateValue) return;
    let session;
    if (selectedTemplate) {
      session = templateToSession(selectedTemplate, dateValue);
    } else {
      session = createSession('Weekly Bulletin');
      // Set the date on the blank session
      const d = new Date(dateValue + 'T00:00:00');
      session.weekLabel = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    onCreate(session);
    close();
  };

  const pickBlank = () => {
    setSelectedTemplate(null);
    setStep(2);
  };

  const pickTemplate = t => {
    setSelectedTemplate(t);
    setStep(2);
  };

  return (
    <div onClick={close} style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <style>{`@keyframes slideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 20, padding: 0, width: '90%', maxWidth: 520,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '1.5px solid #e8d9c0',
        animation: 'slideUp 0.2s ease', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #2e1a08, #5c3d1e)', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#d4a017', fontSize: 14, fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>
              {step === 1 ? 'New Session' : 'Set Week Date'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
              {step === 1 ? 'Choose a template or start blank' : `Template: ${selectedTemplate?.name ?? 'Blank'}`}
            </div>
          </div>
          <button onClick={close} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '20px 28px' }}>
          {step === 1 && (
            <div>
              {/* Blank option */}
              <div
                onClick={pickBlank}
                style={{
                  padding: '14px 18px', borderRadius: 10,
                  border: '1.5px dashed #c9a96e', background: '#fdf6ec',
                  cursor: 'pointer', marginBottom: 12,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f4ece0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#b8860b' }}>+</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#3d2408' }}>Blank Session</div>
                  <div style={{ fontSize: 11, color: '#b0956e' }}>Start from scratch</div>
                </div>
              </div>

              {templates.length > 0 && (
                <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 1, margin: '16px 0 10px' }}>From Template</div>
              )}

              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {templates.map(t => {
                  const dayCount = (t.days ?? []).filter(d => d.events?.length > 0).length;
                  const eventCount = (t.days ?? []).reduce((s, d) => s + (d.events?.length ?? 0), 0);
                  return (
                    <div
                      key={t.id}
                      onClick={() => pickTemplate(t)}
                      style={{
                        padding: '12px 16px', borderRadius: 10,
                        border: '1.5px solid #e8d9c0', background: '#fff',
                        cursor: 'pointer', marginBottom: 8,
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#b8860b'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#e8d9c0'}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#3d2408' }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: '#b0956e', marginTop: 3 }}>
                        {dayCount} days · {eventCount} events
                        {(t.multiDayEvents ?? []).length > 0 && ` · ${t.multiDayEvents.length} multi-day`}
                        {(t.announcements ?? []).filter(a => a.text?.trim()).length > 0 && ` · ${t.announcements.filter(a => a.text?.trim()).length} announcements`}
                      </div>
                      {/* Show day names with events */}
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        {(t.days ?? []).filter(d => d.events?.length > 0).map((d, i) => (
                          <span key={i} style={{ fontSize: 10, color: '#5c3d1e', background: '#fdf6ec', padding: '1px 6px', borderRadius: 4, border: '1px solid #e8d9c0' }}>
                            {d.day}: {d.events.map(e => e.name).join(', ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ fontSize: 13, color: '#5c3d1e', marginBottom: 16, lineHeight: 1.6 }}>
                Pick the start date for this week. All day dates and multi-day events will be calculated automatically.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 12, color: '#b0956e', fontWeight: 600 }}>Week of</span>
                <input
                  type="date"
                  value={dateValue}
                  onChange={e => setDateValue(e.target.value)}
                  autoFocus
                  style={{ fontSize: 14, padding: '8px 12px', border: '1.5px solid #e0cba8', borderRadius: 8, background: '#fdf6ec', color: '#5c3d1e', outline: 'none', flex: 1 }}
                />
              </div>

              {selectedTemplate && (selectedTemplate.multiDayEvents ?? []).length > 0 && (
                <div style={{ background: '#f5eefb', border: '1px solid #e0d0f0', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6d3b8e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Multi-day events will auto-shift</div>
                  {selectedTemplate.multiDayEvents.map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#5c3d1e', marginBottom: 2 }}>
                      {e.name}
                      {e.startOffset != null && (
                        <span style={{ color: '#6d3b8e', marginLeft: 6 }}>
                          (day {e.startOffset >= 0 ? '+' : ''}{e.startOffset}
                          {e.endOffset != null ? ` → ${e.endOffset >= 0 ? '+' : ''}${e.endOffset}` : ''})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(1)} style={{ padding: '8px 18px', background: '#f4ece0', border: '1px solid #e0cba8', borderRadius: 8, fontSize: 13, color: '#5c3d1e', cursor: 'pointer' }}>← Back</button>
                <button onClick={handleCreate} disabled={!dateValue} style={{
                  padding: '8px 24px', background: dateValue ? 'linear-gradient(135deg, #b8860b, #d4a017)' : '#ccc',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: dateValue ? 'pointer' : 'default',
                }}>Create Session</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}