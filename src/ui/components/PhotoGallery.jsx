import { useState } from 'react';
import { ImageLibraryModal } from './ImagePicker';

// Sidebar section: opens the shared image library in manage mode (browse, upload, move between sections, delete).
export default function PhotoGallery() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        Photo Gallery
      </div>
      <button onClick={() => setOpen(true)} style={{
        width: '100%', padding: '10px 14px', background: '#fdf6ec',
        border: '1.5px dashed #c9a96e', borderRadius: 8,
        color: '#7a5230', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        🖼 Open Photo Gallery
      </button>
      <div style={{ fontSize: 10, color: '#c4a882', marginTop: 6 }}>Browse, upload, and move photos between sections.</div>
      {open && <ImageLibraryModal title="Photo Gallery" onClose={() => setOpen(false)} />}
    </>
  );
}
