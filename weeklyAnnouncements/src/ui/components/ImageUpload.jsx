import { useState, useRef } from 'react';
import { uploadImage } from '../../adapters/firebase/StorageUpload';

export default function ImageUpload({ value, onChange, height = 100 }) {
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const handle = async file => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (e) {
      console.error(e);
    }
    setUploading(false);
  };

  const onDrop = e => {
    e.preventDefault();
    setDrag(false);
    handle(e.dataTransfer.files[0]);
  };

  if (value) return (
    <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', height }}>
      <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <button
        onClick={() => onChange('')}
        style={{
          position: 'absolute', top: 6, right: 6,
          background: 'rgba(0,0,0,0.6)', border: 'none',
          color: '#fff', borderRadius: '50%',
          width: 24, height: 24, cursor: 'pointer',
          fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >✕</button>
    </div>
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      style={{
        height, borderRadius: 8,
        border: `2px dashed ${drag ? '#b8860b' : '#e0cba8'}`,
        background: drag ? '#fffbf0' : '#fdf6ec',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 6, cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {uploading
        ? <div style={{ fontSize: 12, color: '#b0956e' }}>Uploading...</div>
        : <>
            <div style={{ fontSize: 20, color: '#c9a96e' }}>🖼</div>
            <div style={{ fontSize: 11, color: '#b0956e', fontWeight: 500 }}>Drop image or click to upload</div>
          </>
      }
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handle(e.target.files[0])} />
    </div>
  );
}