import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { listImages, deleteImage } from '../../adapters/firebase/StorageGallery';
import { uploadImage, IMAGE_FOLDERS } from '../../adapters/firebase/StorageUpload';

export default function ImagePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);    // file selected, awaiting folder/name
  const [uploadName, setUploadName] = useState('');
  const [uploadFolder, setUploadFolder] = useState('misc');
  const [filterFolder, setFilterFolder] = useState('all');
  const inputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try { setImages(await listImages()); }
    catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const handleFilePick = file => {
    if (!file) return;
    const dot = file.name.lastIndexOf('.');
    setUploadName(dot > 0 ? file.name.slice(0, dot) : file.name);
    setUploadFolder('misc');
    setPendingFile(file);
  };

  const confirmUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const url = await uploadImage(pendingFile, uploadFolder, uploadName);
      onChange(url);
      setPendingFile(null);
      setUploadName('');
      await load();
    } catch (e) { console.error(e); alert(`Upload failed: ${e.message}`); }
    setUploading(false);
  };

  const handleDelete = async (img, e) => {
    e.stopPropagation();
    if (!confirm(`Delete ${img.name}?`)) return;
    setDeleting(img.fullPath);
    try {
      await deleteImage(img.fullPath);
      if (value === img.url) onChange('');
      await load();
    } catch (e) { console.error(e); alert(`Delete failed: ${e.message}`); }
    setDeleting(null);
  };

  const select = url => { onChange(url); setOpen(false); };

  const visibleImages = useMemo(() => {
    if (filterFolder === 'all') return images;
    return images.filter(i => i.folder === filterFolder);
  }, [images, filterFolder]);

  const folders = useMemo(() => {
    const found = new Set(images.map(i => i.folder).filter(Boolean));
    return ['all', ...IMAGE_FOLDERS, ...[...found].filter(f => !IMAGE_FOLDERS.includes(f))];
  }, [images]);

  return (
    <>
      {/* Trigger */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {value && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src={value} alt="" style={{ height: 56, width: 80, objectFit: 'cover', borderRadius: 7, border: '1.5px solid #e0cba8' }} />
            <button onClick={() => onChange('')} style={{
              position: 'absolute', top: -6, right: -6,
              width: 18, height: 18, borderRadius: '50%',
              background: '#c0392b', border: 'none', color: '#fff',
              fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>
        )}
        <button onClick={() => setOpen(true)} style={{
          padding: '8px 14px', background: '#fdf6ec',
          border: '1.5px dashed #c9a96e', borderRadius: 8,
          color: '#7a5230', fontSize: 12, fontWeight: 500, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          🖼 {value ? 'Change image' : 'Choose image'}
        </button>
      </div>

      {/* Modal */}
      {open && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }} onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16,
            width: '100%', maxWidth: 720,
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0e4cc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#3d2408', fontFamily: 'Playfair Display, serif' }}>Image Library</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button onClick={() => inputRef.current?.click()} style={{
                  padding: '7px 16px', background: 'linear-gradient(135deg, #b8860b, #d4a017)',
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  ↑ Upload new
                </button>
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#b0956e', cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>
              <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFilePick(e.target.files[0])} />
            </div>

            {/* Folder filter */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0e4cc', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#b0956e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginRight: 4 }}>Folder</span>
              {folders.map(f => (
                <button key={f} onClick={() => setFilterFolder(f)} style={{
                  padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                  background: filterFolder === f ? '#b8860b' : '#fdf6ec',
                  color: filterFolder === f ? '#fff' : '#7a5230',
                  border: filterFolder === f ? '1px solid #b8860b' : '1px solid #e0cba8',
                  cursor: 'pointer',
                }}>{f}</button>
              ))}
            </div>

            {/* Pending upload prompt */}
            {pendingFile && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0e4cc', background: '#fdf6ec', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#5c3d1e' }}>Uploading: {pendingFile.name}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 11, color: '#7a5230' }}>Name</label>
                  <input value={uploadName} onChange={e => setUploadName(e.target.value)} style={{
                    padding: '5px 8px', fontSize: 12, border: '1.5px solid #e0cba8', borderRadius: 6, background: '#fff', color: '#3d2408', flex: '1 1 200px', outline: 'none',
                  }} />
                  <label style={{ fontSize: 11, color: '#7a5230' }}>Folder</label>
                  <select value={uploadFolder} onChange={e => setUploadFolder(e.target.value)} style={{
                    padding: '5px 8px', fontSize: 12, border: '1.5px solid #e0cba8', borderRadius: 6, background: '#fff', color: '#3d2408', outline: 'none',
                  }}>
                    {IMAGE_FOLDERS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <button onClick={confirmUpload} disabled={uploading || !uploadName.trim()} style={{
                    padding: '5px 14px', background: uploading || !uploadName.trim() ? '#ccc' : 'linear-gradient(135deg, #b8860b, #d4a017)',
                    color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    cursor: uploading || !uploadName.trim() ? 'default' : 'pointer',
                  }}>{uploading ? 'Uploading...' : 'Upload'}</button>
                  <button onClick={() => setPendingFile(null)} disabled={uploading} style={{
                    padding: '5px 12px', background: '#fff', border: '1.5px solid #e0cba8', borderRadius: 6, fontSize: 12, color: '#7a5230', cursor: 'pointer',
                  }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {loading
                ? <div style={{ textAlign: 'center', color: '#b0956e', padding: 40, fontSize: 13 }}>Loading...</div>
                : visibleImages.length === 0
                  ? <div style={{ textAlign: 'center', color: '#b0956e', padding: 40, fontSize: 13 }}>No images in this folder</div>
                  : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                      {visibleImages.map(img => (
                        <div
                          key={img.fullPath}
                          onClick={() => select(img.url)}
                          style={{
                            position: 'relative', cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
                            border: `2.5px solid ${value === img.url ? '#b8860b' : 'transparent'}`,
                            boxShadow: value === img.url ? '0 0 0 2px #b8860b44' : '0 1px 4px rgba(0,0,0,0.1)',
                            transition: 'border-color 0.15s',
                            opacity: deleting === img.fullPath ? 0.4 : 1,
                          }}
                        >
                          <img src={img.url} alt={img.name} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                          {value === img.url && (
                            <div style={{ position: 'absolute', top: 6, left: 6, width: 20, height: 20, borderRadius: '50%', background: '#b8860b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>✓</div>
                          )}
                          <button onClick={e => handleDelete(img, e)} title="Delete" style={{
                            position: 'absolute', top: 4, right: 4,
                            width: 22, height: 22, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.55)', border: 'none',
                            color: '#fff', fontSize: 11, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>✕</button>
                          <div style={{ padding: '4px 6px', fontSize: 10, color: '#7a5230', background: '#fdf6ec', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ color: '#b0956e' }}>{img.folder ? `${img.folder}/` : ''}</span>{img.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
              }
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #f0e4cc', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setOpen(false)} style={{ padding: '7px 20px', background: '#fff', border: '1.5px solid #e0cba8', borderRadius: 8, fontSize: 13, color: '#7a5230', cursor: 'pointer' }}>
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}