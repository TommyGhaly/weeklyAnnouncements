import { useState, useEffect } from 'react';
import { FirebaseBulletinRepo } from '../../adapters/firebase/FirebaseBulletinRepo';
import { ReactPDFExporter } from '../../adapters/export/ReactPDFExporter.jsx';
import { TelegramAdapter } from '../../adapters/telegram/TelegramAdapter';
import { createBulletin, updateBulletin, CHURCH_NAME } from '../../core/domain/Bulletin';
import { createSlide, SlideType, DAYS, defaultSlideData } from '../../core/domain/Slide';
import SlideEditor from './SlideEditor';

const repo = new FirebaseBulletinRepo();
const exporter = new ReactPDFExporter();
const telegram = new TelegramAdapter();

const slideTypeLabels = {
  [SlideType.DAY]: '📅 Day',
  [SlideType.ANNOUNCEMENT]: '📢 Announcement',
  [SlideType.CONTACT]: '📞 Contacts',
  [SlideType.EVENT]: '🗓 Event',
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Inter:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', sans-serif;
    background: #f7f0e6;
    color: #2c1a0e;
    min-height: 100vh;
  }

  input, textarea, select {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    padding: 9px 13px;
    border: 1.5px solid #e0cba8;
    border-radius: 8px;
    background: #fff;
    color: #2c1a0e;
    outline: none;
    width: 100%;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  input:focus, textarea:focus, select:focus {
    border-color: #b8860b;
    box-shadow: 0 0 0 3px rgba(184,134,11,0.12);
  }
  textarea { resize: vertical; }
  button { font-family: 'Inter', sans-serif; cursor: pointer; }
`;

function toInputDate(weekLabel) {
  try {
    const d = new Date(weekLabel);
    if (isNaN(d)) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  } catch { return ''; }
}

export default function AdminPanel() {
  const [bulletin, setBulletin] = useState(createBulletin('Weekly Bulletin'));
  const [presets, setPresets] = useState([]);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info');
  const [publishing, setPublishing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);

  useEffect(() => { repo.listPresets().then(setPresets); }, []);

  const setMsg = (msg, type = 'info') => {
    setStatus(msg); setStatusType(type);
    setTimeout(() => setStatus(''), 3500);
  };

  const addSlide = type => {
    const data = type === SlideType.DAY ? defaultSlideData[type](selectedDay) : defaultSlideData[type]();
    setBulletin(b => updateBulletin(b, { slides: [...b.slides, createSlide(type, data)] }));
  };

  const updateSlide = (id, data) =>
    setBulletin(b => updateBulletin(b, { slides: b.slides.map(s => s.id === id ? { ...s, data } : s) }));
  const removeSlide = id =>
    setBulletin(b => updateBulletin(b, { slides: b.slides.filter(s => s.id !== id) }));
  const moveSlide = (i, dir) => {
    const slides = [...bulletin.slides];
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    [slides[i], slides[j]] = [slides[j], slides[i]];
    setBulletin(b => updateBulletin(b, { slides }));
  };

  const addImage = () =>
    setBulletin(b => updateBulletin(b, { images: [...(b.images ?? []), { url: '', caption: '' }] }));
  const updateImage = (i, field, val) => {
    const images = [...(bulletin.images ?? [])];
    images[i] = { ...images[i], [field]: val };
    setBulletin(b => updateBulletin(b, { images }));
  };
  const removeImage = i =>
    setBulletin(b => updateBulletin(b, { images: (b.images ?? []).filter((_, j) => j !== i) }));

  const save = async () => {
    await repo.save(bulletin);
    setPresets(await repo.listPresets());
    setMsg('Preset saved!', 'success');
  };

  const loadPreset = p => { setBulletin(p); setMsg(`Loaded: ${p.presetName}`, 'info'); };
  const deletePreset = async (e, id) => {
    e.stopPropagation();
    await repo.delete(id);
    setPresets(p => p.filter(x => x.id !== id));
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

  const statusColor = { success: '#27ae60', error: '#c0392b', info: '#7a6352' }[statusType];

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: '100vh', background: '#f7f0e6' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #3d2408 0%, #5c3d1e 100%)',
          padding: '0 0 0 0',
          boxShadow: '0 2px 20px rgba(92,61,30,0.25)',
        }}>
          <div style={{ maxWidth: 860, margin: '0 auto', padding: '22px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(212,160,23,0.15)',
                border: '1.5px solid rgba(212,160,23,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, color: '#d4a017',
              }}>✝</div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>{CHURCH_NAME}</div>
                <div style={{ color: '#fff', fontSize: 18, fontFamily: 'Playfair Display, serif', fontWeight: 600 }}>Weekly Announcements</div>
              </div>
            </div>
            <a href="/" style={{
              color: 'rgba(255,255,255,0.5)', fontSize: 12, textDecoration: 'none',
              padding: '6px 14px', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6, transition: 'all 0.2s',
            }}>Present mode →</a>
          </div>
        </div>

        <div style={{ maxWidth: 860, margin: '0 auto', padding: '36px 32px' }}>

          {/* Two-column top row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>

            {/* Bulletin name card */}
            <Card title="Bulletin Name">
              <input
                value={bulletin.presetName}
                onChange={e => setBulletin(b => updateBulletin(b, { presetName: e.target.value }))}
                style={{ fontSize: 17, fontFamily: 'Playfair Display, serif', fontWeight: 600, marginBottom: 12 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 12, color: '#7a6352', whiteSpace: 'nowrap' }}>Week of</label>
                <input
                  type="date"
                  value={toInputDate(bulletin.weekLabel)}
                  onChange={e => {
                    const d = new Date(e.target.value + 'T00:00:00');
                    const label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    setBulletin(b => updateBulletin(b, { weekLabel: label }));
                  }}
                  style={{ fontSize: 13 }}
                />
              </div>
              {bulletin.weekLabel && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#b8860b', fontWeight: 500 }}>📅 {bulletin.weekLabel}</div>
              )}
            </Card>

            {/* Presets card */}
            <Card title="Saved Presets">
              {presets.length === 0
                ? <div style={{ color: '#b0956e', fontSize: 13, padding: '12px 0' }}>No presets yet — save one below.</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {presets.map(p => (
                      <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', background: '#fdf6ec',
                        border: '1.5px solid #e0cba8', borderRadius: 8,
                      }}>
                        <button onClick={() => loadPreset(p)} style={{
                          background: 'none', border: 'none', color: '#5c3d1e',
                          fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
                        }}>{p.presetName}</button>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: '#b0956e' }}>{p.weekLabel}</span>
                          <button onClick={e => deletePreset(e, p.id)} style={{
                            background: 'none', border: 'none', color: '#c0392b',
                            fontSize: 12, cursor: 'pointer', padding: '2px 6px',
                          }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </Card>
          </div>

          {/* Slides */}
          {bulletin.slides.length > 0 && (
            <Card title="Slides" style={{ marginBottom: 20 }}>
              {bulletin.slides.map((slide, i) => (
                <SlideEditor
                  key={slide.id}
                  slide={slide}
                  index={i}
                  total={bulletin.slides.length}
                  onUpdate={data => updateSlide(slide.id, data)}
                  onRemove={() => removeSlide(slide.id)}
                  onMove={dir => moveSlide(i, dir)}
                />
              ))}
            </Card>
          )}

          {/* Add slide */}
          <Card title="Add Slide" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1.5px solid #e0cba8' }}>
                <select
                  value={selectedDay}
                  onChange={e => setSelectedDay(e.target.value)}
                  style={{ borderRadius: 0, border: 'none', borderRight: '1.5px solid #e0cba8', width: 'auto', fontSize: 13, background: '#fdf6ec', color: '#5c3d1e' }}
                >
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
                <button onClick={() => addSlide(SlideType.DAY)} style={addSlideBtn}>📅 Day</button>
              </div>
              {[SlideType.ANNOUNCEMENT, SlideType.CONTACT, SlideType.EVENT].map(type => (
                <button key={type} onClick={() => addSlide(type)} style={{
                  ...addSlideBtn,
                  border: '1.5px solid #e0cba8',
                  borderRadius: 8,
                }}>
                  {slideTypeLabels[type]}
                </button>
              ))}
            </div>
          </Card>

          {/* Images */}
          <Card title="Images for Telegram" subtitle="Sent before the PDF" style={{ marginBottom: 28 }}>
            {(bulletin.images ?? []).map((img, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input value={img.url} onChange={e => updateImage(i, 'url', e.target.value)} placeholder="Image URL" />
                  <input value={img.caption} onChange={e => updateImage(i, 'caption', e.target.value)} placeholder="Caption (optional)" />
                  {img.url && <img src={img.url} alt="" style={{ maxHeight: 100, borderRadius: 6, objectFit: 'cover' }} />}
                </div>
                <button onClick={() => removeImage(i)} style={{ padding: '8px 10px', background: 'none', border: '1.5px solid #e0cba8', borderRadius: 7, color: '#c0392b', fontSize: 13, cursor: 'pointer' }}>✕</button>
              </div>
            ))}
            <button onClick={addImage} style={{ padding: '7px 16px', background: '#fdf6ec', border: '1.5px dashed #c9a96e', borderRadius: 8, color: '#7a5230', fontSize: 13, cursor: 'pointer' }}>
              + Add image
            </button>
          </Card>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={save} style={{
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #b8860b, #d4a017)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 600,
              boxShadow: '0 2px 12px rgba(184,134,11,0.3)',
            }}>
              Save Preset
            </button>
            <button onClick={publish} disabled={publishing} style={{
              padding: '12px 32px',
              background: publishing ? '#ccc' : 'linear-gradient(135deg, #3d2408, #5c3d1e)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 600,
              boxShadow: publishing ? 'none' : '0 2px 12px rgba(92,61,30,0.3)',
              cursor: publishing ? 'default' : 'pointer',
            }}>
              {publishing ? 'Publishing...' : '📤 Publish to Telegram'}
            </button>
            {status && <span style={{ fontSize: 13, color: statusColor, fontWeight: 500 }}>{status}</span>}
          </div>

        </div>
      </div>
    </>
  );
}

const addSlideBtn = {
  padding: '8px 16px', background: '#fff',
  border: 'none', color: '#5c3d1e',
  fontSize: 13, fontWeight: 500, cursor: 'pointer',
};

function Card({ title, subtitle, children, style }) {
  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #e8d9c0',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 1px 8px rgba(92,61,30,0.07)',
      marginBottom: 20,
      ...style,
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1.5px solid #f0e4cc',
        background: 'linear-gradient(to right, #fdf6ec, #faf0e0)',
        display: 'flex', alignItems: 'baseline', gap: 10,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5c3d1e', letterSpacing: 0.3 }}>{title}</span>
        {subtitle && <span style={{ fontSize: 11, color: '#b0956e' }}>{subtitle}</span>}
      </div>
      <div style={{ padding: '18px 20px' }}>{children}</div>
    </div>
  );
}