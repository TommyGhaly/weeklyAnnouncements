export const SlideType = {
  SCHEDULE: 'schedule',
  ANNOUNCEMENT: 'announcement',
  IMAGE: 'image',
  CUSTOM: 'custom',
};

export const createSlide = (type, data) => ({
  id: crypto.randomUUID(),
  type,
  data,
});