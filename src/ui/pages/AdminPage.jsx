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
      background: 'var(--cream)',
    }}>
      <div style={{
        background: 'var(--white)',
        border: '1.5px solid var(--border)',
        borderRadius: 16,
        padding: '48px 40px',
        width: 360,
        boxShadow: 'var(--shadow)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>✝</div>
        <h1 style={{ fontSize: 24, color: 'var(--brown)', marginBottom: 4 }}>Weekly Announcements</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>Admin access</p>
        <input
          type="password"
          value={input}
          onChange={e => { setInput(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Enter passcode"
          style={{ textAlign: 'center', letterSpacing: 4, fontSize: 16 }}
          autoFocus
        />
        {error && (
          <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>Incorrect passcode</p>
        )}
        <button onClick={submit} style={{
          width: '100%',
          padding: '10px 0',
          background: 'var(--gold)',
          color: 'var(--white)',
          border: 'none',
          borderRadius: 'var(--radius)',
          fontSize: 15,
          fontWeight: 600,
          marginTop: 4,
          transition: 'background 0.2s',
        }}
          onMouseOver={e => e.target.style.background = 'var(--gold-hover)'}
          onMouseOut={e => e.target.style.background = 'var(--gold)'}
        >
          Enter
        </button>
      </div>
    </div>
  );
}