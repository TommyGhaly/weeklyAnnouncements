export const CHURCH_NAME = 'St. Philopater Mercurius & St. Mina';

export const createBulletin = (presetName = 'Weekly Bulletin', slides = []) => ({
  id: crypto.randomUUID(),
  presetName,
  slides,
  images: [], // array of { url, caption }
  weekLabel: getWeekLabel(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const updateBulletin = (bulletin, changes) => ({
  ...bulletin,
  ...changes,
  updatedAt: new Date().toISOString(),
});

function getWeekLabel() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}