export const SlideType = {
  DAY: 'day',
  ANNOUNCEMENT: 'announcement',
  CONTACT: 'contact',
  EVENT: 'event',
};

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const createSlide = (type, data) => ({
  id: crypto.randomUUID(),
  type,
  data,
});

export const defaultSlideData = {
  [SlideType.DAY]: (day) => ({
    day,
    items: [{ time: '', label: '', note: '' }],
  }),
  [SlideType.ANNOUNCEMENT]: () => ({
    title: 'Announcements',
    items: [''],
  }),
  [SlideType.CONTACT]: () => ({
    title: 'Contact',
    entries: [{ name: '', role: '', phone: '' }],
  }),
  [SlideType.EVENT]: () => ({
    title: '',
    subtitle: '',
    time: '',
    note: '',
  }),
};