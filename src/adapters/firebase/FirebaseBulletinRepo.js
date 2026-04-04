import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { BulletinRepository } from '../../core/ports/BulletinRepository';

export class FirebaseBulletinRepo extends BulletinRepository {
  constructor() {
    super();
    this.sessions = collection(db, 'bulletins');
    this.templates = collection(db, 'bulletinTemplates');
  }

  // ── Sessions ────────────────────────────────────────────────
  async saveSession(session) {
    await setDoc(doc(this.sessions, session.id), session);
    return session;
  }

  async loadSession(id) {
    const snap = await getDoc(doc(this.sessions, id));
    if (!snap.exists()) throw new Error(`Session ${id} not found`);
    return snap.data();
  }

  async listSessions() {
    const snap = await getDocs(this.sessions);
    return snap.docs.map(d => d.data()).sort((a, b) =>
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }

  async deleteSession(id) {
    await deleteDoc(doc(this.sessions, id));
  }

  onSessionChange(id, onChange) {
    return onSnapshot(doc(this.sessions, id), snap => {
      if (!snap.exists()) return onChange(null);
      onChange(snap.data());
    });
  }

  // Legacy compat
  async save(b) { return this.saveSession(b); }
  async load(id) { return this.loadSession(id); }
  async listPresets() { return this.listSessions(); }
  async delete(id) { return this.deleteSession(id); }

  // ── Templates ───────────────────────────────────────────────
  async saveTemplate(template) {
    await setDoc(doc(this.templates, template.id), template);
    return template;
  }

  async loadTemplate(id) {
    const snap = await getDoc(doc(this.templates, id));
    if (!snap.exists()) throw new Error(`Template ${id} not found`);
    return snap.data();
  }

  async listTemplates() {
    const snap = await getDocs(this.templates);
    return snap.docs.map(d => d.data()).sort((a, b) =>
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }

  async deleteTemplate(id) {
    await deleteDoc(doc(this.templates, id));
  }

  // ── Active presentation ─────────────────────────────────────
  async setActive(sessionId) {
    await setDoc(doc(db, 'config', 'active_bulletin'), { id: sessionId });
  }

  async getActive() {
    const snap = await getDoc(doc(db, 'config', 'active_bulletin'));
    if (!snap.exists()) return null;
    return snap.data().id;
  }

  onActiveChange(onChange) {
    return onSnapshot(doc(db, 'config', 'active_bulletin'), snap => {
      if (!snap.exists()) return onChange(null);
      onChange(snap.data().id ?? null);
    });
  }

  onBulletinChange(id, onChange) {
    return onSnapshot(doc(this.sessions, id), snap => {
      if (!snap.exists()) return onChange(null);
      onChange(snap.data());
    });
  }

  // ── Logo ────────────────────────────────────────────────────
  async setLogo(url) {
    await setDoc(doc(db, 'config', 'church_logo'), { url });
  }

  async getLogo() {
    const snap = await getDoc(doc(db, 'config', 'church_logo'));
    if (!snap.exists()) return '';
    return snap.data().url ?? '';
  }
}