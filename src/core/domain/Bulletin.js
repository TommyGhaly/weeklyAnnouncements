export const CHURCH_NAME = 'St. Philopater Mercurius & St. Mina';
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ALL_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function getMondayOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toISO(date) {
  if (typeof date === 'string') return date;
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function addDaysToDate(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toISO(d);
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

// ── Factories ─────────────────────────────────────────────────
export const createHeaderNote = (text = '') => ({ id: crypto.randomUUID(), text });
export const createAnnouncement = (text = '', image = '') => ({ id: crypto.randomUUID(), text, image, addedAt: new Date().toISOString() });
export const createAnnouncementPreset = (text = '', image = '') => ({ id: crypto.randomUUID(), text, image });
export const createSlideImage = (url = '', caption = '') => ({ id: crypto.randomUUID(), url, caption });
export const createSlidePreset = (url = '', caption = '', name = '') => ({ id: crypto.randomUUID(), url, caption, name: name || caption || 'Slide' });

export const createMultiDayEvent = (opts = {}) => ({
  id: crypto.randomUUID(),
  name: opts.name ?? 'New Event',
  startDate: opts.startDate ?? '',
  endDate: opts.endDate ?? '',
  startOffset: opts.startOffset ?? null, // days from week anchor (template mode)
  endOffset: opts.endOffset ?? null,
  time: opts.time ?? '',
  timeTo: opts.timeTo ?? '',
  notes: opts.notes ?? '',
  color: opts.color ?? '#b8860b',
  image: opts.image ?? '',
  contacts: opts.contacts ?? [],
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

// ── Template ──────────────────────────────────────────────────
// Templates have no concrete dates. Days have weekday names only.
// Multi-day events use startOffset/endOffset (relative to week anchor).
export const createTemplate = (name = 'New Template') => ({
  id: crypto.randomUUID(),
  type: 'template',
  name,
  headerNotes: [],
  days: DAYS.map(day => ({ day, events: [] })),
  multiDayEvents: [],
  announcements: [],
  slideImages: [],
  images: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const updateTemplate = (template, changes) => ({
  ...template,
  ...changes,
  updatedAt: new Date().toISOString(),
});

// ── Session ───────────────────────────────────────────────────
// Sessions have concrete dates. Created from a template.
export const createSession = (name = 'Weekly Bulletin') => {
  const dates = getDatesForWeek();
  return {
    id: crypto.randomUUID(),
    type: 'session',
    templateId: null,
    presetName: name,
    weekLabel: getWeekLabel(),
    headerNotes: [],
    days: DAYS.map((day, i) => ({ day, date: dates[i].date, events: [] })),
    multiDayEvents: [],
    announcements: [],
    slideImages: [],
    lastAnnouncementsSent: null,
    lastPublished: null,
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const updateSession = (session, changes) => ({
  ...session,
  ...changes,
  updatedAt: new Date().toISOString(),
});

// Legacy compat
export const createBulletin = createSession;
export const updateBulletin = updateSession;

// ── Template ↔ Session conversion ─────────────────────────────

/** Convert a session to a template (strip dates, compute offsets) */
export function sessionToTemplate(session, templateName) {
  // Find the anchor date (first day with a date)
  let anchorISO = null;
  for (const day of session.days ?? []) {
    if (day.date) { anchorISO = day.date; break; }
  }

  const multiDayEvents = (session.multiDayEvents ?? []).map(e => {
    let startOffset = null, endOffset = null;
    if (anchorISO && e.startDate) {
      startOffset = daysBetween(anchorISO, e.startDate);
    }
    if (anchorISO && e.endDate) {
      endOffset = daysBetween(anchorISO, e.endDate);
    }
    return {
      ...e,
      startDate: '', endDate: '',
      startOffset, endOffset,
      id: crypto.randomUUID(),
    };
  });

  return {
    id: crypto.randomUUID(),
    type: 'template',
    name: templateName ?? session.presetName ?? 'Template',
    headerNotes: deepClone(session.headerNotes ?? []),
    days: (session.days ?? []).map(d => ({
      day: d.day,
      events: deepClone(d.events ?? []).map(e => ({ ...e, id: crypto.randomUUID() })),
    })),
    multiDayEvents,
    announcements: deepClone(session.announcements ?? []),
    slideImages: deepClone(session.slideImages ?? []),
    images: deepClone(session.images ?? []),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Create a session from a template + a week anchor date */
export function templateToSession(template, anchorDate) {
  const anchor = new Date(anchorDate + 'T00:00:00');
  const pickedDow = anchor.getDay(); // 0=Sun
  const weekLabel = anchor.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Find which day in the template matches the picked weekday, anchor it there
  const templateDays = template.days ?? [];
  let anchorIdx = templateDays.findIndex(d => ALL_DAYS.indexOf(d.day) === pickedDow);
  if (anchorIdx === -1) anchorIdx = 0;

  // Assign anchor day the picked date, then walk forward and backward
  const days = templateDays.map((d, i) => {
    const cloned = { ...deepClone(d), events: deepClone(d.events ?? []).map(e => ({ ...e, id: crypto.randomUUID() })) };
    if (i === anchorIdx) {
      cloned.date = toISO(anchor);
    }
    return cloned;
  });

  // Walk forward from anchor
  for (let i = anchorIdx + 1; i < days.length; i++) {
    const prevDate = new Date(days[i - 1].date + 'T00:00:00');
    const prevDow = prevDate.getDay();
    const targetDow = ALL_DAYS.indexOf(days[i].day);
    let diff = targetDow - prevDow;
    if (diff <= 0) diff += 7; // must be after previous
    const d = new Date(prevDate);
    d.setDate(d.getDate() + diff);
    days[i].date = toISO(d);
  }

  // Walk backward from anchor
  for (let i = anchorIdx - 1; i >= 0; i--) {
    const nextDate = new Date(days[i + 1].date + 'T00:00:00');
    const nextDow = nextDate.getDay();
    const targetDow = ALL_DAYS.indexOf(days[i].day);
    let diff = targetDow - nextDow;
    if (diff >= 0) diff -= 7; // must be before next
    const d = new Date(nextDate);
    d.setDate(d.getDate() + diff);
    days[i].date = toISO(d);
  }

  // Resolve multi-day event offsets to concrete dates
  const anchorISO = toISO(anchor);
  const multiDayEvents = (template.multiDayEvents ?? []).map(e => ({
    ...deepClone(e),
    id: crypto.randomUUID(),
    startDate: e.startOffset != null ? addDaysToDate(anchorISO, e.startOffset) : '',
    endDate: e.endOffset != null ? addDaysToDate(anchorISO, e.endOffset) : '',
    startOffset: null, endOffset: null,
  }));

  return {
    id: crypto.randomUUID(),
    type: 'session',
    templateId: template.id,
    presetName: template.name,
    weekLabel,
    headerNotes: deepClone(template.headerNotes ?? []).map(n => ({ ...n, id: crypto.randomUUID() })),
    days,
    multiDayEvents,
    announcements: deepClone(template.announcements ?? []).map(a => ({ ...a, id: crypto.randomUUID() })),
    slideImages: deepClone(template.slideImages ?? []).map(s => ({ ...s, id: crypto.randomUUID() })),
    lastAnnouncementsSent: null,
    lastPublished: null,
    images: deepClone(template.images ?? []),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── Helpers ───────────────────────────────────────────────────

function daysBetween(iso1, iso2) {
  const d1 = new Date(iso1 + 'T00:00:00');
  const d2 = new Date(iso2 + 'T00:00:00');
  return Math.round((d2 - d1) / 86400000);
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** Collect all image URLs in a bulletin/session/template */
export function collectImageUrls(b) {
  const urls = new Set();
  for (const day of b.days ?? []) {
    for (const e of day.events ?? []) { if (e.image) urls.add(e.image); }
  }
  for (const e of b.multiDayEvents ?? []) { if (e.image) urls.add(e.image); }
  for (const a of b.announcements ?? []) { if (a.image) urls.add(a.image); }
  for (const s of b.slideImages ?? []) { if (s.url) urls.add(s.url); }
  for (const img of b.images ?? []) { if (img.url) urls.add(img.url); }
  return urls;
}

export const DEFAULT_PRESETS = [
  createPreset('Divine Liturgy', { color: '#7a5230', defaultTime: '10:00am', defaultTimeTo: '1:00pm' }),
  createPreset('Matins', { color: '#4a7c59', defaultTime: '8:00am', defaultTimeTo: '9:30am' }),
  createPreset('Bible Study', { color: '#1a5276', defaultTime: '7:00pm', defaultTimeTo: '9:00pm' }),
  createPreset('Youth Meeting', { color: '#6d3b8e', defaultTime: '6:00pm', defaultTimeTo: '8:00pm' }),
  createPreset('Vespers', { color: '#8b4513', defaultTime: '6:00pm', defaultTimeTo: '7:30pm' }),
];

export const DEFAULT_ANNOUNCEMENT_PRESETS = [
  createAnnouncementPreset('Sunday School resumes this week'),
  createAnnouncementPreset('Confession available after Liturgy'),
  createAnnouncementPreset('Youth meeting cancelled this week'),
];