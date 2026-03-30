import { useState, useEffect } from 'react';
import { FirebaseBulletinRepo } from '../../adapters/firebase/FirebaseBulletinRepo';
import { ReactPDFExporter } from '../../adapters/export/ReactPDFExporter';
import { TelegramAdapter } from '../../adapters/telegram/TelegramAdapter';
import { createBulletin, updateBulletin } from '../../core/domain/Bulletin';
import { createSlide, SlideType } from '../../core/domain/Slide';
import SlideEditor from './SlideEditor';

const repo = new FirebaseBulletinRepo();
const exporter = new ReactPDFExporter();
const telegram = new TelegramAdapter();

export default function AdminPanel() {
  const [bulletin, setBulletin] = useState(createBulletin('Sunday Bulletin'));
  const [presets, setPresets] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    repo.listPresets().then(setPresets);
  }, []);

  const addSlide = type => {
    const defaults = {
      [SlideType.SCHEDULE]: { items: [{ time: '', label: '' }] },
      [SlideType.ANNOUNCEMENT]: { items: [''] },
      [SlideType.IMAGE]: { url: '' },
      [SlideType.CUSTOM]: { title: '', body: '' },
    };
    const slide = createSlide(type, defaults[type]);
    setBulletin(b => updateBulletin(b, { slides: [...b.slides, slide] }));
  };

  const updateSlide = (id, data) => {
    setBulletin(b => updateBulletin(b, {
      slides: b.slides.map(s => s.id === id ? { ...s, data } : s)
    }));
  };

  const removeSlide = id => {
    setBulletin(b => updateBulletin(b, {
      slides: b.slides.filter(s => s.id !== id)
    }));
  };

  const moveSlide = (index, dir) => {
    const slides = [...bulletin.slides];
    const swap = index + dir;
    if (swap < 0 || swap >= slides.length) return;
    [slides[index], slides[swap]] = [slides[swap], slides[index]];
    setBulletin(b => updateBulletin(b, { slides }));
  };

  const save = async () => {
    setStatus('Saving...');
    await repo.save(bulletin);
    const updated = await repo.listPresets();
    setPresets(updated);
    setStatus('Saved!');
  };

  const loadPreset = async preset => {
    setBulletin(preset);
    setStatus(`Loaded: ${preset.presetName}`);
  };

  const publish = async () => {
    setStatus('Generating PDF...');
    const blob = await exporter.export(bulletin);
    setStatus('Publishing to Telegram...');
    await telegram.publish(bulletin, blob);
    setStatus('Published!');
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h1>Weekly Announcements</h1>

      {/* Preset name */}
      <input
        value={bulletin.presetName}
        onChange={e => setBulletin(b => updateBulletin(b, { presetName: e.target.value }))}
        style={{ fontSize: 18, padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', marginBottom: 16, width: '100%' }}
      />

      {/* Presets */}
      {presets.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <strong>Load preset: </strong>
          {presets.map(p => (
            <button key={p.id} onClick={() => loadPreset(p)} style={{ marginRight: 8, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>
              {p.presetName}
            </button>
          ))}
        </div>
      )}

      {/* Slides */}
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

      {/* Add slide buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        {Object.values(SlideType).map(type => (
          <button key={type} onClick={() => addSlide(type)} style={{ padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>
            + {type}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button onClick={save} style={{ padding: '10px 24px', borderRadius: 6, cursor: 'pointer', background: '#4a90d9', color: '#fff', border: 'none' }}>
          Save Preset
        </button>
        <button onClick={publish} style={{ padding: '10px 24px', borderRadius: 6, cursor: 'pointer', background: '#27ae60', color: '#fff', border: 'none' }}>
          Publish to Telegram
        </button>
      </div>

      {status && <p style={{ marginTop: 12, color: '#555' }}>{status}</p>}
    </div>
  );
}