import { collection, doc, setDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
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
    return snap.docs.map(d => d.data());
  }

  async delete(id) {
    await deleteDoc(doc(this.col, id));
  }
}