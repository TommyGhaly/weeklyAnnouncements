import { useState } from 'react';
import AdminPanel from '../components/AdminPanel';

const PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE;

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(
    sessionStorage.getItem('admin_unlocked') === 'true'
  );
  const [input,   setInput]   = useState('');
  const [error,   setError]   = useState(false);
  const [visible, setVisible] = useState(false);

  const submit = () => {
    if (input === PASSCODE) {
      sessionStorage.setItem('admin_unlocked', 'true');
      setUnlocked(true);
    } else {
      setError(true);
      setInput('');
    }
  };

  if (unlocked) return <AdminPanel />;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f4ece0', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: '#fff', border: '1.5px solid #e8d9c0', borderRadius: 16,
        padding: '48px 40px', width: 360, boxShadow: '0 4px 24px rgba(92,61,30,0.1)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      }}>
        <div style={{ fontSize: 36, color: '#c9a050' }}>✝</div>
        <h1 style={{ fontSize: 22, color: '#3d2408', margin: 0, fontFamily: 'Playfair Display, serif' }}>
          Weekly Announcements
        </h1>
        <p style={{ color: '#b0956e', fontSize: 14, margin: 0 }}>Admin access</p>

        {/* Input + show/hide toggle */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type={visible ? 'text' : 'password'}
            value={input}
            onChange={e => { setInput(e.target.value); setError(false); }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Enter passcode"
            autoFocus
            style={{
              width: '100%', padding: '10px 40px 10px 14px', fontSize: 15,
              border: `1.5px solid ${error ? '#c0392b' : '#e0cba8'}`,
              borderRadius: 8, outline: 'none', boxSizing: 'border-box',
              background: '#fdf6ec', color: '#3d2408',
              fontFamily: 'Inter, sans-serif',
            }}
          />
          <button
            onClick={() => setVisible(v => !v)}
            tabIndex={-1}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#b0956e', fontSize: 16, padding: 0, lineHeight: 1,
            }}
          >
            {visible ? '🙈' : '👁'}
          </button>
        </div>

        {error && <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>Incorrect passcode</p>}

        <button
          onClick={submit}
          style={{
            width: '100%', padding: '11px 0',
            background: 'linear-gradient(135deg, #b8860b, #d4a017)',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Enter
        </button>
      </div>
    </div>
  );
}