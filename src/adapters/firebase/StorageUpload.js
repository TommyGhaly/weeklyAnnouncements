import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';

export const IMAGE_FOLDERS = ['logos', 'icons', 'announcements', 'events', 'slides', 'misc'];

function sanitize(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.\-_]/g, '');
}

function splitNameExt(filename) {
  const i = filename.lastIndexOf('.');
  if (i <= 0) return { base: filename, ext: '' };
  return { base: filename.slice(0, i), ext: filename.slice(i) };
}

export async function uploadImage(file, folder = 'misc', customName = '') {
  const ext = splitNameExt(file.name).ext || '';
  const baseRaw = customName.trim() || splitNameExt(file.name).base;
  const base = sanitize(baseRaw) || 'image';
  const name = `images/${folder}/${base}-${Date.now()}${ext}`;
  const storageRef = ref(storage, name);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}