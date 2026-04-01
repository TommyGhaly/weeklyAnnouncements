export const CHURCH_NAME = 'St. Philopater Mercurius & St. Mina';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getMondayOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export function getDatesForWeek(startDate = new Date()) {
  const monday = getMondayOfWeek(startDate);
  return DAYS.map((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { day, date: toISO(d) };
  });
}

function getWeekLabel(date = new Date()) {
  const monday = getMondayOfWeek(date);
  return monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export const createAnnouncement = (text = '') => ({
  id: crypto.randomUUID(),
  text,
  addedAt: new Date().toISOString(),
});

export const createMultiDayEvent = (opts = {}) => ({
  id: crypto.randomUUID(),
  name: opts.name ?? 'New Event',
  startDate: opts.startDate ?? '',
  endDate: opts.endDate ?? '',
  time: opts.time ?? '',
  timeTo: opts.timeTo ?? '',
  notes: opts.notes ?? '',
  color: opts.color ?? '#b8860b',
  image: opts.image ?? '',
});

export const createBulletin = (presetName = 'Weekly Bulletin') => {
  const dates = getDatesForWeek();
  return {
    id: crypto.randomUUID(),
    presetName,
    weekLabel: getWeekLabel(),
    days: DAYS.map((day, i) => ({ day, date: dates[i].date, events: [] })),
    multiDayEvents: [],
    announcements: [],
    lastAnnouncementsSent: null,
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const updateBulletin = (bulletin, changes) => ({
  ...bulletin,
  ...changes,
  updatedAt: new Date().toISOString(),
});

export const createPreset = (name, opts = {}) => ({
  id: crypto.randomUUID(),
  name,
  color: opts.color ?? '#b8860b',
  defaultTime: opts.defaultTime ?? '',
  defaultTimeTo: opts.defaultTimeTo ?? '',
  contacts: opts.contacts ?? [],
  notes: opts.notes ?? '',
  image: opts.image ?? '',
});

export const createEvent = (preset = null, overrides = {}) => ({
  id: crypto.randomUUID(),
  presetId: preset?.id ?? null,
  name: overrides.name ?? preset?.name ?? 'New Event',
  time: overrides.time ?? preset?.defaultTime ?? '',
  timeTo: overrides.timeTo ?? preset?.defaultTimeTo ?? '',
  contacts: overrides.contacts ?? (preset?.contacts ? [...preset.contacts] : []),
  notes: overrides.notes ?? preset?.notes ?? '',
  image: overrides.image ?? preset?.image ?? '',
  modified: false,
  color: overrides.color ?? preset?.color ?? '#b8860b',
});

export const DEFAULT_PRESETS = [
  createPreset('Divine Liturgy', { color: '#7a5230', defaultTime: '10:00am', defaultTimeTo: '1:00pm' }),
  createPreset('Matins', { color: '#4a7c59', defaultTime: '8:00am', defaultTimeTo: '9:30am' }),
  createPreset('Bible Study', { color: '#1a5276', defaultTime: '7:00pm', defaultTimeTo: '9:00pm' }),
  createPreset('Youth Meeting', { color: '#6d3b8e', defaultTime: '6:00pm', defaultTimeTo: '8:00pm' }),
  createPreset('Vespers', { color: '#8b4513', defaultTime: '6:00pm', defaultTimeTo: '7:30pm' }),
];