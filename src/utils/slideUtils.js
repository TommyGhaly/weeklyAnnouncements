/**
 * Shared slide-building + duration logic.
 * Used by both SlideTimingsPanel (admin) and PresentPage (display).
 */

/** Stable key for each slide — must be consistent across both pages */
export function slideKey(type, data) {
  if (type === 'day')   return `day-${data.id ?? data.day}`;
  if (type === 'multi') return 'multi';
  if (type === 'ann')   return 'ann';
  if (type === 'img')   return `img-${data.id}`;
  return type;
}

/** Build ordered slide list from a bulletin */
export function buildSlides(bulletin) {
  const slides = [];
  for (const d of bulletin.days ?? []) {
    if (!d.events?.length) continue;
    slides.push({ type: 'day', key: slideKey('day', d), data: d });
  }
  const md = (bulletin.multiDayEvents ?? []).filter(e => e.name);
  if (md.length) slides.push({ type: 'multi', key: 'multi', data: md });
  const ann = (bulletin.announcements ?? []).filter(a => a.text?.trim());
  if (ann.length) slides.push({ type: 'ann', key: 'ann', data: ann });
  for (const img of bulletin.slideImages ?? []) {
    if (img.url) slides.push({ type: 'img', key: slideKey('img', img), data: img });
  }
  return slides;
}

/**
 * Compute effective duration (ms) for a slide.
 * Priority: inline item override → slide-level override (SlideTimingsPanel) → auto scaling.
 *
 * Inline overrides live on the data object itself:
 *   day   → slide.data.duration
 *   ann   → slide.data[0]._slideDuration  (proxy on first announcement)
 *   multi → each event has .duration; use first non-null, else auto
 *   img   → slide.data.duration
 */
export function slideDurationMs(slide, bulletin, baselineSec = 10, multiplier = 0.4) {
  // 1. Inline override on the item itself
  if ((slide.type === 'day' || slide.type === 'img') && slide.data.duration != null) {
    return Math.min(120, slide.data.duration) * 1000;
  }
  if (slide.type === 'ann' && slide.data[0]?._slideDuration != null) {
    return Math.min(120, slide.data[0]._slideDuration) * 1000;
  }
  if (slide.type === 'multi') {
    const first = slide.data.find(e => e.duration != null);
    if (first) return Math.min(120, first.duration) * 1000;
  }
  // 2. Slide-level override from SlideTimingsPanel
  const overrides = bulletin?.slideDurations ?? {};
  if (overrides[slide.key] != null) return overrides[slide.key] * 1000;
  // For announcements: any page-specific key wins, otherwise fall back to a shared 'ann' key
  if (slide.type === 'ann' && overrides['ann'] != null) return overrides['ann'] * 1000;
  // 3. Auto scaling
  return autoMs(slide.type, itemCount(slide), baselineSec, multiplier);
}

/** Auto duration in ms (no override) */
export function autoMs(type, items, baselineSec, multiplier = 0.4) {
  const base = baselineSec * 1000;
  if (type === 'img') return base;
  const perItem = Math.round(baselineSec * multiplier) * 1000;
  return Math.min(120_000, base + items * perItem);
}

/** Auto duration in seconds (for display) */
export function autoSec(type, items, baselineSec, multiplier = 0.4) {
  return Math.round(autoMs(type, items, baselineSec, multiplier) / 1000);
}

/** Number of content items on a slide (drives scaling) */
export function itemCount(slide) {
  if (slide.type === 'day')   return slide.data.events?.length ?? 0;
  if (slide.type === 'ann')   return slide.data.length ?? 0;
  if (slide.type === 'multi') return slide.data.length ?? 0;
  return 0;
}

export function fmtSec(s) {
  if (s >= 60) {
    const m = Math.floor(s / 60), r = s % 60;
    return r > 0 ? `${m}m ${r}s` : `${m}m`;
  }
  return `${s}s`;
}

export const SLIDE_TYPE_COLOR = {
  day:   '#b8860b',
  multi: '#8a6ab4',
  ann:   '#2980b9',
  img:   '#27ae60',
};

export const SLIDE_TYPE_ICON = {
  day:   '📅',
  multi: '🗓',
  ann:   '📢',
  img:   '🖼',
};