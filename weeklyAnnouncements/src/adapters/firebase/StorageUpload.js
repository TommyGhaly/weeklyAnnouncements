import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';

export async function uploadImage(file, path = 'images') {
  const safeName = file.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.\-_]/g, '');
  const name = `${path}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, name);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}