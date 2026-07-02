import { ref, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebase';

async function listRecursive(path) {
  const listRef = ref(storage, path);
  const result = await listAll(listRef);

  const own = await Promise.all(
    result.items.map(async item => ({
      url: await getDownloadURL(item),
      ref: item,
      name: item.name,
      fullPath: item.fullPath,
      folder: item.fullPath.split('/').slice(1, -1).join('/') || null,
    }))
  );

  const nested = await Promise.all(result.prefixes.map(p => listRecursive(p.fullPath)));

  return own.concat(...nested);
}

export async function listImages(path = 'images') {
  return listRecursive(path);
}

export async function deleteImage(fullPath) {
  const imageRef = ref(storage, fullPath);
  await deleteObject(imageRef);
}