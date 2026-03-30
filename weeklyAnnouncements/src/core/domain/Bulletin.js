export const createBulletin = (presetName = 'Untitled', slides = []) => ({
  id: crypto.randomUUID(),
  presetName,
  slides,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const updateBulletin = (bulletin, changes) => ({
  ...bulletin,
  ...changes,
  updatedAt: new Date().toISOString(),
});