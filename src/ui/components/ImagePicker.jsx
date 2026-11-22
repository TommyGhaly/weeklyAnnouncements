import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { deleteField } from 'firebase/firestore';
import { listImages, deleteImage } from '../../adapters/firebase/StorageGallery';
import { uploadImage, IMAGE_FOLDERS } from '../../adapters/firebase/StorageUpload';
import { useAppConfig } from '../../hooks/useAppConfig';

export default function ImagePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);

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

      {open && <ImageLibraryModal value={value} onSelect={onChange} onClose={() => setOpen(false)} />}
    </>
  );
}

// Library modal: pass onSelect to pick a photo (ImagePicker), or omit it to just browse/manage (Photo Gallery).
export function ImageLibraryModal({ value, onSelect, onClose, title = 'Image Library' }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);    // file selected, awaiting folder/name
  const [uploadName, setUploadName] = useState('');
  const [uploadFolder, setUploadFolder] = useState('misc');
  const [filterFolder, setFilterFolder] = useState('all');
  const [arranging, setArranging] = useState(false);
  const [dragFolder, setDragFolder] = useState(null);
  const [movingImage, setMovingImage] = useState(null); // fullPath of the photo whose section menu is open
  const inputRef = useRef(null);
  // Mounted only while open, so the config listener only runs while the library is showing.
  const { config, updateConfig } = useAppConfig();

  const load = async () => {
    setLoading(true);
    try { setImages(await listImages()); }
    catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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
      onSelect?.(url);
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
      if (value === img.url) onSelect?.('');
      if (overrides?.[img.fullPath]) updateConfig({ imageFolderOverrides: { [img.fullPath]: deleteField() } }).catch(console.error);
      await load();
    } catch (e) { console.error(e); alert(`Delete failed: ${e.message}`); }
    setDeleting(null);
  };

  const select = url => { if (!onSelect) return; onSelect(url); onClose(); };

  // A "move" is a section override in shared config, not a Storage copy — copying would
  // change the download URL and break every session/preset that already uses the photo.
  const overrides = config.imageFolderOverrides;
  const placed = useMemo(
    () => images.map(i => ({ ...i, folder: overrides?.[i.fullPath] ?? i.folder })),
    [images, overrides],
  );

  const moveImage = (img, folder) => {
    if (!folder || folder === img.folder) return;
    updateConfig({ imageFolderOverrides: { [img.fullPath]: folder } })
      .catch(e => alert(`Could not move photo: ${e.message}`));
    setMovingImage(null);
  };

  const visibleImages = useMemo(() => {
    if (filterFolder === 'all') return placed;
    return placed.filter(i => i.folder === filterFolder);
  }, [placed, filterFolder]);

  // Saved order wins; any folder not in it (new uploads, new defaults) falls in after, in default order.
  const orderedFolders = useMemo(() => {
    const found = placed.map(i => i.folder).filter(Boolean);
    const known = [...new Set([...IMAGE_FOLDERS, ...found])];
    const saved = (config.imageFolderOrder ?? []).filter(f => known.includes(f));
    return [...saved, ...known.filter(f => !saved.includes(f))];
  }, [placed, config.imageFolderOrder]);

  const folders = useMemo(() => ['all', ...orderedFolders], [orderedFolders]);

  const moveFolder = (from, to) => {
    if (to < 0 || to >= orderedFolders.length || from === to) return;
    const next = [...orderedFolders];
    const [f] = next.splice(from, 1);
    next.splice(to, 0, f);
    updateConfig({ imageFolderOrder: next }).catch(e => alert(`Could not save order: ${e.message}`));
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16,
        width: '100%', maxWidth: 720,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0e4cc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#3d2408', fontFamily: 'Playfair Display, serif' }}>{title}</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => inputRef.current?.click()} style={{
              padding: '7px 16px', background: 'linear-gradient(135deg, #b8860b, #d4a017)',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              ↑ Upload new
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#b0956e', cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFilePick(e.target.files[0])} />
        </div>

        {/* Folder filter */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0e4cc', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#b0956e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginRight: 4 }}>Folder</span>
          {!arranging && folders.map(f => (
            <button key={f} onClick={() => setFilterFolder(f)} style={{
              padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
              background: filterFolder === f ? '#b8860b' : '#fdf6ec',
              color: filterFolder === f ? '#fff' : '#7a5230',
              border: filterFolder === f ? '1px solid #b8860b' : '1px solid #e0cba8',
              cursor: 'pointer',
            }}>{f}</button>
          ))}
          {arranging && orderedFolders.map((f, i) => (
            <div
              key={f}
              draggable
              onDragStart={() => setDragFolder(f)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); if (dragFolder) moveFolder(orderedFolders.indexOf(dragFolder), i); setDragFolder(null); }}
              onDragEnd={() => setDragFolder(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 2,
                padding: '2px 4px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                background: '#fff', color: '#7a5230',
                border: '1px dashed #c9a96e', cursor: 'grab',
                opacity: dragFolder === f ? 0.4 : 1,
              }}
            >
              <ArrowBtn label="◀" disabled={i === 0} onClick={() => moveFolder(i, i - 1)} />
              <span style={{ padding: '0 4px' }}>{f}</span>
              <ArrowBtn label="▶" disabled={i === orderedFolders.length - 1} onClick={() => moveFolder(i, i + 1)} />
            </div>
          ))}
          <button onClick={() => setArranging(a => !a)} style={{
            marginLeft: 'auto', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
            background: arranging ? '#b8860b' : 'none', color: arranging ? '#fff' : '#b0956e',
            border: arranging ? '1px solid #b8860b' : '1px solid transparent', cursor: 'pointer',
          }}>{arranging ? 'Done' : '⇄ Arrange'}</button>
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
                {orderedFolders.filter(f => IMAGE_FOLDERS.includes(f)).map(f => <option key={f} value={f}>{f}</option>)}
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
                        // No overflow:hidden here — it would clip the Move menu. Corners are rounded on the img/caption instead.
                        position: 'relative', cursor: onSelect ? 'pointer' : 'default', borderRadius: 8,
                        zIndex: movingImage === img.fullPath ? 3 : 'auto',
                        border: `2.5px solid ${value === img.url ? '#b8860b' : 'transparent'}`,
                        boxShadow: value === img.url ? '0 0 0 2px #b8860b44' : '0 1px 4px rgba(0,0,0,0.1)',
                        transition: 'border-color 0.15s',
                        opacity: deleting === img.fullPath ? 0.4 : 1,
                      }}
                    >
                      <img src={img.url} alt={img.name} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block', borderRadius: '6px 6px 0 0' }} />
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
                      <button onClick={e => { e.stopPropagation(); setMovingImage(p => p === img.fullPath ? null : img.fullPath); }} title="Move to another section" style={{
                        position: 'absolute', top: 4, right: 30,
                        height: 22, padding: '0 7px', borderRadius: 11,
                        background: movingImage === img.fullPath ? '#b8860b' : 'rgba(0,0,0,0.55)', border: 'none',
                        color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>⇄ Move</button>
                      {movingImage === img.fullPath && (
                        <div onClick={e => e.stopPropagation()} style={{
                          position: 'absolute', top: 30, left: 4, right: 4, zIndex: 2,
                          background: '#fff', borderRadius: 8, border: '1px solid #e0cba8',
                          boxShadow: '0 6px 18px rgba(0,0,0,0.18)', padding: 4,
                        }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 1, padding: '3px 6px' }}>Move to</div>
                          {orderedFolders.map(f => (
                            <button key={f} onClick={() => moveImage(img, f)} disabled={f === img.folder} style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              padding: '4px 6px', borderRadius: 5, border: 'none', fontSize: 11,
                              background: f === img.folder ? '#fdf6ec' : 'none',
                              color: f === img.folder ? '#c4a882' : '#5c3d1e',
                              cursor: f === img.folder ? 'default' : 'pointer', fontWeight: f === img.folder ? 600 : 400,
                            }}>{f === img.folder ? `✓ ${f}` : f}</button>
                          ))}
                        </div>
                      )}
                      <div style={{ padding: '4px 6px', fontSize: 10, color: '#7a5230', background: '#fdf6ec', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderRadius: '0 0 6px 6px' }}>
                        <span style={{ color: '#b0956e' }}>{img.folder ? `${img.folder}/` : ''}</span>{img.name}
                      </div>
                    </div>
                  ))}
                </div>
              )
          }
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #f0e4cc', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 20px', background: '#fff', border: '1.5px solid #e0cba8', borderRadius: 8, fontSize: 13, color: '#7a5230', cursor: 'pointer' }}>
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ArrowBtn({ label, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 18, height: 18, padding: 0, borderRadius: '50%',
      background: disabled ? 'transparent' : '#fdf6ec', border: 'none',
      color: disabled ? '#e0cba8' : '#b8860b', fontSize: 8,
      cursor: disabled ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{label}</button>
  );
}
