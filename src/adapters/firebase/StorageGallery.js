import { ref, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebase';

async function listFolder(prefixPath) {
  const r = ref(storage, prefixPath);
  const result = await listAll(r);
  const items = await Promise.all(
    result.items.map(async item => {
      const folder = item.fullPath.split('/').slice(-2, -1)[0] || '';
      return {
        url: await getDownloadURL(item),
        ref: item,
        name: item.name,
        fullPath: item.fullPath,
        folder,
      };
    })
  );
  // Recurse into subfolders (one level deep is enough for images/<folder>/file)
  const subfolderItems = await Promise.all(result.prefixes.map(p => listFolder(p.fullPath)));
  return [...items, ...subfolderItems.flat()];
}

export async function listImages(rootPath = 'images') {
  return listFolder(rootPath);
}

export async function deleteImage(fullPath) {
  await deleteObject(ref(storage, fullPath));
}