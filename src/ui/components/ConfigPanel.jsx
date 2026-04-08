import { useAppConfig } from '../../hooks/useAppConfig';
import { autoSec, fmtSec } from '../../utils/slideUtils';

const PREVIEW_ROWS = [
  { label: 'Image slide',        type: 'img',   items: 0 },
  { label: '1-event day',        type: 'day',   items: 1 },
  { label: '3-event day',        type: 'day',   items: 3 },
  { label: '5-event day',        type: 'day',   items: 5 },
  { label: '3 announcements',    type: 'ann',   items: 3 },
  { label: '4 multi-day events', type: 'multi', items: 4 },
];

export default function ConfigPanel() {
  const { config, updateConfig } = useAppConfig();
  const toggle      = key => updateConfig({ [key]: !config[key] });
  const baseline    = config.slideBaseline    ?? 10;
  const multiplier  = config.slideMultiplier  ?? 0.4;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 1.5 }}>
        App Config
      </div>

      <Toggle label="Dev Mode" activeColor="#22c55e" active={config.devMode} onToggle={() => toggle('devMode')}
        description="Green border · sends to test Telegram channel" />
      <Toggle label="Light Mode" activeColor="#b8860b" active={config.lightMode} onToggle={() => toggle('lightMode')}
        description="High-contrast light theme on the display" />

      <div style={{ borderTop: '1px solid #f0e4d0', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Baseline */}
        <SliderRow
          label="Baseline"
          description="Minimum seconds per slide before content scaling."
          min={1} max={30} step={1}
          value={baseline}
          display={`${baseline}s`}
          accentColor="#b8860b"
          onChange={v => updateConfig({ slideBaseline: v })}
          tickMin="1s" tickMax="30s"
        />

        {/* Multiplier */}
        <SliderRow
          label="Per-item multiplier"
          description="Extra seconds added per content item (event, announcement…)."
          min={0} max={2} step={0.05}
          value={multiplier}
          display={`×${multiplier.toFixed(2)}`}
          accentColor="#2980b9"
          onChange={v => updateConfig({ slideMultiplier: Math.round(v * 100) / 100 })}
          tickMin="×0" tickMax="×2"
        />

        {/* Formula callout */}
        <div style={{ background: '#f4ece0', borderRadius: 8, padding: '8px 12px', fontSize: 10, color: '#7a5c30', lineHeight: 1.6 }}>
          <strong>Formula:</strong> baseline + items × (baseline × multiplier), capped at 2 min
          <br />
          <span style={{ color: '#b8860b' }}>
            e.g. 3 events → {baseline}s + 3 × ({baseline}s × {multiplier.toFixed(2)}) = {Math.min(120, baseline + 3 * Math.round(baseline * multiplier))}s
          </span>
        </div>

        {/* Scaling preview */}
        <div style={{ background: '#fdf6ec', border: '1px solid #e8d9c0', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Auto-duration preview
          </div>
          {PREVIEW_ROWS.map(({ label, type, items }) => {
            const sec = autoSec(type, items, baseline, multiplier);
            const pct = Math.min(100, (sec / 120) * 100);
            return (
              <div key={label} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 10, color: '#5c3d1e' }}>{label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#b8860b', fontFamily: 'Georgia, serif' }}>{fmtSec(sec)}</span>
                </div>
                <div style={{ height: 3, background: '#e8d9c0', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: '#d4a017', borderRadius: 2, transition: 'width 0.2s' }} />
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 9, color: '#c4a882', marginTop: 6, fontStyle: 'italic' }}>All slides cap at 2 min · per-slide overrides available in Slide Timings</div>
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, description, min, max, step, value, display, accentColor, onChange, tickMin, tickMax }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#3d2408' }}>{label}</div>
          <div style={{ fontSize: 10, color: '#b0956e', marginTop: 2 }}>{description}</div>
        </div>
        <div style={{ flexShrink: 0, marginLeft: 12, background: '#fdf6ec', border: '1.5px solid #e8d9c0', borderRadius: 8, padding: '5px 10px', textAlign: 'center', minWidth: 52 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: accentColor, fontFamily: 'Georgia, serif', lineHeight: 1 }}>{display}</span>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor, cursor: 'pointer', margin: 0 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#c4a882', marginTop: 2 }}>
        <span>{tickMin}</span><span>{tickMax}</span>
      </div>
    </div>
  );
}

function Toggle({ label, description, active, onToggle, activeColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#3d2408' }}>{label}</div>
        <div style={{ fontSize: 10, color: '#b0956e', marginTop: 2 }}>{description}</div>
      </div>
      <button onClick={onToggle} style={{
        width: 40, height: 22, borderRadius: 11, border: 'none', flexShrink: 0,
        background: active ? activeColor : '#e0cba8',
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: active ? 21 : 3,
          width: 16, height: 16, borderRadius: '50%',
          background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}