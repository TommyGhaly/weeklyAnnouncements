import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const CONFIG_REF = doc(db, 'config', 'app');

export const DEFAULT_CONFIG = {
  devMode: false,
  lightMode: false,
  slideBaseline: 10, // seconds — floor before content scaling
};

// Pass { enabled: false } to skip the Firestore listener (e.g. while a modal is closed).
export function useAppConfig({ enabled = true } = {}) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    if (!enabled) return;
    const unsub = onSnapshot(CONFIG_REF, snap => {
      if (snap.exists()) setConfig({ ...DEFAULT_CONFIG, ...snap.data() });
    });
    return unsub;
  }, [enabled]);

  async function updateConfig(patch) {
    await setDoc(CONFIG_REF, patch, { merge: true });
  }

  return { config, updateConfig };
}