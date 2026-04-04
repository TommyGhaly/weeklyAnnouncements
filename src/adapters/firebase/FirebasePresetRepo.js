import { collection, doc, setDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';

const col = () => collection(db, 'presets');

export async function fetchPresets() {
  const snap = await getDocs(col());
  return snap.docs
    .map(d => d.data())
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function savePreset(preset) {
  await setDoc(doc(col(), preset.id), preset);
}

export async function deletePreset(id) {
  await deleteDoc(doc(col(), id));
}

export async function savePresetOrder(presets) {
  const batch = writeBatch(db);
  presets.forEach((p, i) => {
    batch.set(doc(col(), p.id), { ...p, order: i });
  });
  await batch.commit();
}