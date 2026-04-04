import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const CONFIG_REF = doc(db, 'config', 'app');

export const DEFAULT_CONFIG = {
  devMode: false,
  lightMode: false,
};

/** Live-synced config from Firestore config/app */
export function useAppConfig() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    const unsub = onSnapshot(CONFIG_REF, snap => {
      if (snap.exists()) setConfig({ ...DEFAULT_CONFIG, ...snap.data() });
    });
    return unsub;
  }, []);

  async function updateConfig(patch) {
    await setDoc(CONFIG_REF, patch, { merge: true });
  }

  return { config, updateConfig };
}