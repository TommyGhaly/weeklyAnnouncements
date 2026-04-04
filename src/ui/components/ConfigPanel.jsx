import { useAppConfig } from '../../hooks/useAppConfig';

export default function ConfigPanel() {
  const { config, updateConfig } = useAppConfig();

  const toggle = key => updateConfig({ [key]: !config[key] });

  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #e0cba8',
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#5c3d1e', fontFamily: 'Playfair Display, serif', letterSpacing: 0.5 }}>
        APP CONFIG
      </div>

      <ConfigRow
        label="Dev Mode"
        description="Green border indicator · exports go to test Telegram channel"
        active={config.devMode}
        onToggle={() => toggle('devMode')}
        activeColor="#22c55e"
      />

      <ConfigRow
        label="Light Mode"
        description="High-contrast light theme for the presentation display"
        active={config.lightMode}
        onToggle={() => toggle('lightMode')}
        activeColor="#b8860b"
      />
    </div>
  );
}

function ConfigRow({ label, description, active, onToggle, activeColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#3d2408' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#b0956e', marginTop: 2 }}>{description}</div>
      </div>
      <button
        onClick={onToggle}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          border: 'none',
          background: active ? activeColor : '#e0cba8',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute',
          top: 3,
          left: active ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}