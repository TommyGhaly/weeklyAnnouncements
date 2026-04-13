import { useState } from 'react';
import AdminPanel from '../components/AdminPanel';

const PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE;

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(
    sessionStorage.getItem('admin_unlocked') === 'true'
  );
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

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
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f4ece0',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: '#fff',
        border: '1.5px solid #e8d9c0',
        borderRadius: 20,
        padding: '52px 44px',
        width: 380,
        boxShadow: '0 8px 40px rgba(92,61,30,0.12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
      }}>
        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(212,160,23,0.12)',
          border: '1.5px solid rgba(212,160,23,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, color: '#b8860b', marginBottom: 20,
        }}>✝</div>

        <div style={{ fontSize: 20, fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 700, color: '#3d2408', marginBottom: 6, textAlign: 'center' }}>
          Weekly Announcements
        </div>
        <div style={{ fontSize: 13, color: '#b0956e', marginBottom: 28, textAlign: 'center' }}>
          Admin access
        </div>

        {/* Password input — no letterSpacing, no autoComplete, plain type=password */}
        <input
          type="password"
          value={input}
          onChange={e => { setInput(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Enter passcode"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus
          style={{
            width: '100%',
            padding: '11px 14px',
            fontSize: 15,
            border: error ? '1.5px solid #c0392b' : '1.5px solid #e0cba8',
            borderRadius: 10,
            background: '#fdf6ec',
            color: '#3d2408',
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'Inter, sans-serif',
            transition: 'border-color 0.15s',
            marginBottom: 10,
          }}
        />

        {error && (
          <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 10, alignSelf: 'flex-start' }}>
            Incorrect passcode
          </div>
        )}

        <button
          onClick={submit}
          style={{
            width: '100%',
            padding: '11px 0',
            background: 'linear-gradient(135deg, #b8860b, #d4a017)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: 4,
            fontFamily: 'Inter, sans-serif',
          }}
          onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
        >
          Enter
        </button>
      </div>
    </div>
  );
}