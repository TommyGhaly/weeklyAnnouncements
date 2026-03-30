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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
      <h2>Admin Access</h2>
      <input
        type="password"
        value={input}
        onChange={e => { setInput(e.target.value); setError(false); }}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Enter passcode"
        style={{ padding: '8px 12px', fontSize: 16, borderRadius: 6, border: '1px solid #ccc' }}
      />
      {error && <p style={{ color: 'red', margin: 0 }}>Incorrect passcode</p>}
      <button onClick={submit} style={{ padding: '8px 24px', fontSize: 16, borderRadius: 6, cursor: 'pointer' }}>
        Enter
      </button>
    </div>
  );
}
