import { ref, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebase';

export async function listImages(path = 'images') {
  const listRef = ref(storage, path);
  const result = await listAll(listRef);
  const urls = await Promise.all(
    result.items.map(async item => ({
      url: await getDownloadURL(item),
      ref: item,
      name: item.name,
      fullPath: item.fullPath,
    }))
  );
  return urls;
}

export async function deleteImage(fullPath) {
  const imageRef = ref(storage, fullPath);
  await deleteObject(imageRef);
}