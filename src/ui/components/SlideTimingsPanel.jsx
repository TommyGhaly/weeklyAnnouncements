import { useAppConfig } from '../../hooks/useAppConfig';
import {
  buildSlides, autoSec, itemCount, fmtSec,
  SLIDE_TYPE_COLOR, SLIDE_TYPE_ICON,
} from '../../utils/slideUtils';

const MAX_SEC = 120;

export default function SlideTimingsPanel({ bulletin, onChange }) {
  const { config } = useAppConfig();
  const baseline   = config.slideBaseline   ?? 10;
  const multiplier = config.slideMultiplier ?? 0.4;
  const overrides = bulletin.slideDurations ?? {};
  const slides    = buildSlides(bulletin);

  if (!slides.length) return (
    <div>
      <SectionHeader overrideCount={0} totalSec={0} baseline={baseline} onReset={null} />
      <div style={{ fontSize: 11, color: '#c4a882', textAlign: 'center', padding: '24px 0', border: '1.5px dashed #e8d9c0', borderRadius: 10 }}>
        No slides yet — add days, events, announcements, or images above.
      </div>
    </div>
  );

  const totalSec = slides.reduce((sum, s) => {
    return sum + (overrides[s.key] ?? autoSec(s.type, itemCount(s), baseline));
  }, 0);

  const setOverride = (key, val) => {
    const next = { ...overrides };
    if (val === null || val === '') delete next[key];
    else next[key] = Math.min(MAX_SEC, Math.max(1, Math.round(Number(val))));
    onChange({ slideDurations: next });
  };

  const resetAll = () => onChange({ slideDurations: {} });
  const overrideCount = Object.keys(overrides).length;

  return (
    <div>
      <SectionHeader overrideCount={overrideCount} totalSec={totalSec} baseline={baseline} onReset={overrideCount > 0 ? resetAll : null} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {slides.map((s, idx) => {
          const auto      = autoSec(s.type, itemCount(s), baseline, multiplier);
          const override  = overrides[s.key] ?? null;
          const effective = override ?? auto;
          const hasOverride = override !== null;
          const color     = SLIDE_TYPE_COLOR[s.type];
          const pct       = Math.min(100, (effective / MAX_SEC) * 100);

          return (
            <SlideRow
              key={s.key}
              index={idx + 1}
              total={slides.length}
              slide={s}
              auto={auto}
              override={override}
              effective={effective}
              hasOverride={hasOverride}
              color={color}
              pct={pct}
              onSet={val => setOverride(s.key, val)}
              onReset={() => setOverride(s.key, null)}
            />
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ overrideCount, totalSec, baseline, onReset }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#b0956e', textTransform: 'uppercase', letterSpacing: 1 }}>
          Slide Timings
        </div>
        <div style={{ fontSize: 10, color: '#c4a882', marginTop: 3 }}>
          {totalSec > 0 && <>Total loop: <strong style={{ color: '#5c3d1e' }}>{fmtSec(totalSec)}</strong> · </>}
          baseline: <strong style={{ color: '#b8860b' }}>{baseline}s</strong>
          {overrideCount > 0 && <> · <span style={{ color: '#b8860b' }}>{overrideCount} override{overrideCount !== 1 ? 's' : ''}</span></>}
        </div>
      </div>
      {onReset && (
        <button onClick={onReset} style={{
          fontSize: 10, color: '#c0392b', background: 'none',
          border: '1px solid #f5c6cb', borderRadius: 5,
          padding: '3px 10px', cursor: 'pointer', flexShrink: 0,
        }}>
          Reset all
        </button>
      )}
    </div>
  );
}

function SlideRow({ index, total, slide, auto, override, effective, hasOverride, color, pct, onSet, onReset }) {
  const label = slideLabel(slide);
  const sub   = slideSub(slide);

  return (
    <div style={{
      background: hasOverride ? '#fffbf0' : '#fafafa',
      border: `1.5px solid ${hasOverride ? '#e8c87a' : '#ede4d8'}`,
      borderRadius: 10,
      padding: '10px 14px',
      transition: 'border-color 0.15s, background 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Order badge */}
        <div style={{ fontSize: 9, fontWeight: 700, color: '#c4a882', minWidth: 18, textAlign: 'center' }}>
          {index}/{total}
        </div>

        {/* Type icon */}
        <div style={{
          width: 30, height: 30, borderRadius: 7, flexShrink: 0,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        }}>
          {SLIDE_TYPE_ICON[slide.type]}
        </div>

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#3d2408', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </div>
          <div style={{ fontSize: 10, color: '#b0956e' }}>{sub}</div>
        </div>

        {/* Auto badge (only when not overridden) */}
        {!hasOverride && (
          <span style={{ fontSize: 9, color: '#b0956e', background: '#f0e8d4', padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>
            auto {fmtSec(auto)}
          </span>
        )}

        {/* Duration input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <input
            type="number" min={1} max={120}
            placeholder={String(auto)}
            value={override ?? ''}
            onChange={e => onSet(e.target.value === '' ? null : e.target.value)}
            style={{
              width: 54, padding: '5px 6px', fontSize: 12, textAlign: 'center',
              border: `1.5px solid ${hasOverride ? color : '#e0cba8'}`,
              borderRadius: 6,
              background: hasOverride ? '#fff' : '#f8f4ee',
              color: '#3d2408', outline: 'none',
              fontWeight: hasOverride ? 700 : 400,
              transition: 'border-color 0.15s',
            }}
          />
          <span style={{ fontSize: 10, color: '#b0956e' }}>s</span>
          {hasOverride && (
            <button onClick={onReset} title={`Reset to auto (${fmtSec(auto)})`}
              style={{ background: 'none', border: 'none', color, fontSize: 15, cursor: 'pointer', padding: 0, lineHeight: 1 }}>
              ↺
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 8, height: 3, background: '#e8d9c0', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: hasOverride ? color : '#c4a882',
          borderRadius: 2, transition: 'width 0.2s, background 0.2s',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 9, color: hasOverride ? color : '#c4a882', fontWeight: hasOverride ? 700 : 400 }}>
          {hasOverride ? `${fmtSec(effective)} (override)` : fmtSec(effective)}
        </span>
        <span style={{ fontSize: 9, color: '#d4c4a8' }}>2m cap</span>
      </div>
    </div>
  );
}

function slideLabel(s) {
  if (s.type === 'day')   return s.data.day;
  if (s.type === 'multi') return 'Upcoming Events';
  if (s.type === 'ann')   return 'Announcements';
  if (s.type === 'img')   return s.data.caption || 'Image Slide';
  return 'Slide';
}

function slideSub(s) {
  if (s.type === 'day') {
    const n = s.data.events?.length ?? 0;
    return `${n} event${n !== 1 ? 's' : ''}${s.data.date ? ` · ${fmtDate(s.data.date)}` : ''}`;
  }
  if (s.type === 'multi') {
    const n = s.data.length;
    return `${n} event${n !== 1 ? 's' : ''}`;
  }
  if (s.type === 'ann') {
    const n = s.data.length;
    return `${n} item${n !== 1 ? 's' : ''}`;
  }
  return 'Image';
}

function fmtDate(iso) {
  try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return iso; }
}