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
export const createHeaderNote       = (text = '') => ({ id: crypto.randomUUID(), text });
export const createAnnouncement     = (text = '', image = '') => ({ id: crypto.randomUUID(), text, image, addedAt: new Date().toISOString() });
export const createAnnouncementPreset = (text = '', image = '') => ({ id: crypto.randomUUID(), text, image });
export const createSlideImage       = (url = '', caption = '') => ({ id: crypto.randomUUID(), url, caption });
export const createSlidePreset      = (url = '', caption = '', name = '') => ({ id: crypto.randomUUID(), url, caption, name: name || caption || 'Slide' });

export const createMultiDayEvent = (opts = {}) => ({
  id: crypto.randomUUID(),
  name:        opts.name        ?? 'New Event',
  startDate:   opts.startDate   ?? '',
  endDate:     opts.endDate     ?? '',
  startOffset: opts.startOffset ?? null,
  endOffset:   opts.endOffset   ?? null,
  time:        opts.time        ?? '',
  timeTo:      opts.timeTo      ?? '',
  notes:       opts.notes       ?? '',
  color:       opts.color       ?? '#b8860b',
  image:       opts.image       ?? '',
  contacts:    opts.contacts    ?? [],
});

export const createPreset = (name, opts = {}) => ({
  id: crypto.randomUUID(),
  name,
  color:        opts.color        ?? '#b8860b',
  defaultTime:  opts.defaultTime  ?? '',
  defaultTimeTo:opts.defaultTimeTo ?? '',
  contacts:     opts.contacts     ?? [],
  notes:        opts.notes        ?? '',
  image:        opts.image        ?? '',
});

export const createEvent = (preset = null, overrides = {}) => ({
  id:       crypto.randomUUID(),
  presetId: preset?.id ?? null,
  name:     overrides.name     ?? preset?.name        ?? 'New Event',
  time:     overrides.time     ?? preset?.defaultTime  ?? '',
  timeTo:   overrides.timeTo   ?? preset?.defaultTimeTo ?? '',
  contacts: overrides.contacts ?? (preset?.contacts ? [...preset.contacts] : []),
  notes:    overrides.notes    ?? preset?.notes ?? '',
  image:    overrides.image    ?? preset?.image ?? '',
  modified: false,
  color:    overrides.color    ?? preset?.color ?? '#b8860b',
});

// ── Template ──────────────────────────────────────────────────
export const createTemplate = (name = 'New Template') => ({
  id: crypto.randomUUID(),
  type: 'template',
  name,
  headerNotes:    [],
  days:           DAYS.map(day => ({ day, events: [] })),
  multiDayEvents: [],
  announcements:  [],
  slideImages:    [],
  images:         [],
  slideDurations: {},   // per-slide timing overrides
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const updateTemplate = (template, changes) => ({
  ...template,
  ...changes,
  updatedAt: new Date().toISOString(),
});

// ── Session ───────────────────────────────────────────────────
export const createSession = (name = 'Weekly Bulletin') => {
  const dates = getDatesForWeek();
  return {
    id: crypto.randomUUID(),
    type: 'session',
    templateId: null,
    presetName: name,
    weekLabel: getWeekLabel(),
    headerNotes:    [],
    days:           DAYS.map((day, i) => ({ day, date: dates[i].date, events: [] })),
    multiDayEvents: [],
    announcements:  [],
    slideImages:    [],
    slideDurations: {},   // per-slide timing overrides
    lastAnnouncementsSent: null,
    lastPublished:  null,
    images:         [],
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

// Multi-day events in a template point at days of the schedule by index
// ("day:3"), so they always land on those days whatever date is picked.
export const dayRef = i => `day:${i}`;
export function parseDayRef(v) {
  const m = /^day:(\d+)$/.exec(v ?? '');
  return m ? Number(m[1]) : null;
}

/** Resolve a template multi-day event to { startIdx, endIdx } into template.days */
export function resolveTemplateEventDays(template, e) {
  const days = template.days ?? [];
  if (!days.length) return { startIdx: null, endIdx: null };

  // Legacy: day names picked in the template editor
  const byName = (name, from) => {
    if (!ALL_DAYS.includes(name)) return null;
    let i = days.findIndex((d, j) => j >= from && d.day === name);
    if (i === -1) i = days.findIndex(d => d.day === name);
    return i === -1 ? null : i;
  };
  // Legacy: day-count offsets from the template's first day
  const rel = [0];
  for (let i = 1; i < days.length; i++) {
    let diff = ALL_DAYS.indexOf(days[i].day) - ALL_DAYS.indexOf(days[i - 1].day);
    if (diff <= 0) diff += 7;
    rel.push(rel[i - 1] + diff);
  }
  const byOffset = off => {
    if (off == null) return null;
    const i = rel.findIndex(r => r >= rel[template.offsetAnchorIdx ?? 0] + off);
    return i === -1 ? days.length - 1 : i;
  };

  const startIdx = parseDayRef(e.startDate) ?? byName(e.startDate, 0) ?? byOffset(e.startOffset);
  let endIdx     = parseDayRef(e.endDate)   ?? byName(e.endDate, startIdx ?? 0) ?? byOffset(e.endOffset);
  const clampIdx = i => i == null ? null : Math.min(Math.max(i, 0), days.length - 1);
  if (startIdx != null && endIdx != null && endIdx < startIdx) endIdx = startIdx;
  return { startIdx: clampIdx(startIdx), endIdx: clampIdx(endIdx) };
}

/** Convert a session to a template (strip dates, point events at days, carry timings) */
export function sessionToTemplate(session, templateName) {
  const days = session.days ?? [];
  // Index of the day matching an ISO date, or the nearest day inside the schedule
  const dayIdxFor = iso => {
    if (!iso || !days.length) return null;
    const exact = days.findIndex(d => d.date === iso);
    if (exact !== -1) return exact;
    const after = days.findIndex(d => d.date && d.date > iso);
    return after === -1 ? days.length - 1 : after;
  };

  const multiDayEvents = (session.multiDayEvents ?? []).map(e => {
    const startIdx = dayIdxFor(e.startDate), endIdx = dayIdxFor(e.endDate);
    return {
      ...e,                         // duration field carries over naturally
      startDate: startIdx != null ? dayRef(startIdx) : '',
      endDate:   endIdx   != null ? dayRef(endIdx)   : '',
      startOffset: null, endOffset: null,
      id: crypto.randomUUID(),
    };
  });

  return {
    id: crypto.randomUUID(),
    type: 'template',
    name: templateName ?? session.presetName ?? 'Template',
    headerNotes: deepClone(session.headerNotes ?? []),
    days: (session.days ?? []).map(d => ({
      day:      d.day,
      duration: d.duration ?? null,   // carry inline day duration
      events:   deepClone(d.events ?? []).map(e => ({ ...e, id: crypto.randomUUID() })),
    })),
    multiDayEvents,
    announcements: deepClone(session.announcements ?? []),  // _slideDuration on [0] carries naturally
    slideImages:   deepClone(session.slideImages ?? []),     // img.duration carries naturally
    images:        deepClone(session.images ?? []),
    slideDurations: deepClone(session.slideDurations ?? {}), // carry slide-level overrides
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Create a session from a template + a week anchor date */
export function templateToSession(template, anchorDate) {
  const anchor     = new Date(anchorDate + 'T00:00:00');
  const pickedDow  = anchor.getDay();
  const weekLabel  = anchor.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const templateDays = template.days ?? [];
  // The picked date is the end of the schedule: match the last day with that weekday
  let anchorIdx = templateDays.findLastIndex(d => ALL_DAYS.indexOf(d.day) === pickedDow);
  if (anchorIdx === -1) anchorIdx = 0;

  // Build days with dates; duration + events carry over via deepClone spread
  const days = templateDays.map((d, i) => {
    const cloned = { ...deepClone(d), events: deepClone(d.events ?? []).map(e => ({ ...e, id: crypto.randomUUID() })) };
    if (i === anchorIdx) cloned.date = toISO(anchor);
    return cloned;
  });

  // Walk forward from anchor
  for (let i = anchorIdx + 1; i < days.length; i++) {
    const prevDate  = new Date(days[i - 1].date + 'T00:00:00');
    const prevDow   = prevDate.getDay();
    const targetDow = ALL_DAYS.indexOf(days[i].day);
    let diff = targetDow - prevDow;
    if (diff <= 0) diff += 7;
    const d = new Date(prevDate); d.setDate(d.getDate() + diff);
    days[i].date = toISO(d);
  }

  // Walk backward from anchor
  for (let i = anchorIdx - 1; i >= 0; i--) {
    const nextDate  = new Date(days[i + 1].date + 'T00:00:00');
    const nextDow   = nextDate.getDay();
    const targetDow = ALL_DAYS.indexOf(days[i].day);
    let diff = targetDow - nextDow;
    if (diff >= 0) diff -= 7;
    const d = new Date(nextDate); d.setDate(d.getDate() + diff);
    days[i].date = toISO(d);
  }

  // Resolve multi-day events to the dates of the days they point at
  const multiDayEvents = (template.multiDayEvents ?? []).map(e => {
    const { startIdx, endIdx } = resolveTemplateEventDays(template, e);
    return {
      ...deepClone(e),                // duration field carries over
      id:          crypto.randomUUID(),
      startDate:   startIdx != null ? days[startIdx].date : '',
      endDate:     endIdx   != null ? days[endIdx].date   : '',
      startOffset: null,
      endOffset:   null,
    };
  });

  return {
    id: crypto.randomUUID(),
    type: 'session',
    templateId:  template.id,
    presetName:  template.name,
    weekLabel,
    headerNotes:    deepClone(template.headerNotes ?? []).map(n => ({ ...n, id: crypto.randomUUID() })),
    days,
    multiDayEvents,
    announcements:  deepClone(template.announcements ?? []).map(a => ({ ...a, id: crypto.randomUUID() })),
    slideImages:    deepClone(template.slideImages ?? []).map(s => ({ ...s, id: crypto.randomUUID() })),
    slideDurations: deepClone(template.slideDurations ?? {}),  // carry slide-level overrides
    lastAnnouncementsSent: null,
    lastPublished:  null,
    images:         deepClone(template.images ?? []),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── Helpers ───────────────────────────────────────────────────

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
  createPreset('Matins',         { color: '#4a7c59', defaultTime: '8:00am',  defaultTimeTo: '9:30am'  }),
  createPreset('Bible Study',    { color: '#1a5276', defaultTime: '7:00pm',  defaultTimeTo: '9:00pm'  }),
  createPreset('Youth Meeting',  { color: '#6d3b8e', defaultTime: '6:00pm',  defaultTimeTo: '8:00pm'  }),
  createPreset('Vespers',        { color: '#8b4513', defaultTime: '6:00pm',  defaultTimeTo: '7:30pm'  }),
];

export const DEFAULT_ANNOUNCEMENT_PRESETS = [
  createAnnouncementPreset('Sunday School resumes this week'),
  createAnnouncementPreset('Confession available after Liturgy'),
  createAnnouncementPreset('Youth meeting cancelled this week'),
];