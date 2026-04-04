import { useEffect, useRef } from 'react';

export default function ConfirmModal({ open, title, message, warning, confirmLabel = 'Confirm', confirmColor = '#c0392b', onConfirm, onCancel }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.15s ease',
    }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <div ref={ref} onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 420, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        border: '1.5px solid #e8d9c0',
        animation: 'slideUp 0.2s ease',
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#3d2408', fontFamily: 'Playfair Display, serif', marginBottom: 10 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: '#5c3d1e', lineHeight: 1.6, marginBottom: warning ? 12 : 20 }}>
          {message}
        </div>
        {warning && (
          <div style={{
            fontSize: 12, color: '#c0392b', background: '#fdf0ed',
            border: '1px solid #f5c6cb', borderRadius: 8,
            padding: '10px 14px', marginBottom: 20, lineHeight: 1.5,
          }}>
            ⚠️ {warning}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onCancel} style={{
            padding: '8px 20px', background: '#f4ece0', border: '1px solid #e0cba8',
            borderRadius: 8, fontSize: 13, color: '#5c3d1e', cursor: 'pointer', fontWeight: 500,
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: '8px 20px', background: confirmColor, border: 'none',
            borderRadius: 8, fontSize: 13, color: '#fff', cursor: 'pointer', fontWeight: 600,
            boxShadow: `0 2px 8px ${confirmColor}44`,
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}