import { pdf } from '@react-pdf/renderer';
import { ExportPort } from '../../core/ports/ExportPort';
import { BulletinDocument } from '../../ui/components/BulletinDocument';
import { collectImageUrls } from '../../core/domain/Bulletin';

async function urlToBase64(url) {
  if (!url || (!url.startsWith('http') && !url.startsWith('data:'))) return null;
  if (url.startsWith('data:')) return url; // already base64

  // Try fetch with cors
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.statusText);
    const blob = await res.blob();
    return await blobToBase64(blob);
  } catch (e1) {
    // Try with proxy approach — canvas
    try {
      return await imgToBase64ViaCanvas(url);
    } catch (e2) {
      // Last resort — try appending alt=media for Firebase Storage
      if (url.includes('firebasestorage.googleapis.com') && !url.includes('alt=media')) {
        try {
          const sep = url.includes('?') ? '&' : '?';
          const res = await fetch(url + sep + 'alt=media');
          if (!res.ok) throw new Error(res.statusText);
          const blob = await res.blob();
          return await blobToBase64(blob);
        } catch { /* give up */ }
      }
      console.warn('Could not load image for PDF:', url);
      return null;
    }
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function imgToBase64ViaCanvas(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve(c.toDataURL('image/png'));
      } catch { reject(new Error('Canvas tainted')); }
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
  });
}

export class ReactPDFExporter extends ExportPort {
  async export(bulletin, logoUrl = '') {
    const urls = collectImageUrls(bulletin);
    if (logoUrl) urls.add(logoUrl);

    const imageMap = {};
    await Promise.allSettled(
      [...urls].map(async url => {
        const b64 = await urlToBase64(url);
        if (b64) imageMap[url] = b64;
      })
    );

    const logoB64 = logoUrl ? (imageMap[logoUrl] || null) : null;

    const blob = await pdf(
      <BulletinDocument bulletin={bulletin} logoUrl={logoB64} imageMap={imageMap} />
    ).toBlob();
    return blob;
  }
}