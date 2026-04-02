import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { BulletinRepository } from '../../core/ports/BulletinRepository';

export class FirebaseBulletinRepo extends BulletinRepository {
  constructor() {
    super();
    this.col = collection(db, 'bulletins');
  }

  async save(bulletin) {
    const ref = doc(this.col, bulletin.id);
    await setDoc(ref, bulletin);
    return bulletin;
  }

  async load(id) {
    const ref = doc(this.col, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error(`Bulletin ${id} not found`);
    return snap.data();
  }

  async listPresets() {
    const snap = await getDocs(this.col);
    return snap.docs.map(d => d.data()).sort((a, b) =>
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }

  async delete(id) {
    await deleteDoc(doc(this.col, id));
  }

  async setActive(bulletinId) {
    await setDoc(doc(db, 'config', 'active_bulletin'), { id: bulletinId });
  }

  async getActive() {
    const snap = await getDoc(doc(db, 'config', 'active_bulletin'));
    if (!snap.exists()) return null;
    return snap.data().id;
  }

  /** Realtime listener on the active bulletin config doc.
   *  Calls onChange(bulletinId) whenever the active bulletin changes.
   *  Returns an unsubscribe function. */
  onActiveChange(onChange) {
    return onSnapshot(doc(db, 'config', 'active_bulletin'), snap => {
      if (!snap.exists()) return onChange(null);
      onChange(snap.data().id ?? null);
    });
  }

  /** Realtime listener on a specific bulletin document.
   *  Calls onChange(bulletinData) whenever the document updates.
   *  Returns an unsubscribe function. */
  onBulletinChange(id, onChange) {
    return onSnapshot(doc(this.col, id), snap => {
      if (!snap.exists()) return onChange(null);
      onChange(snap.data());
    });
  }

  async setLogo(url) {
    await setDoc(doc(db, 'config', 'church_logo'), { url });
  }

  async getLogo() {
    const snap = await getDoc(doc(db, 'config', 'church_logo'));
    if (!snap.exists()) return '';
    return snap.data().url ?? '';
  }
}