import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import { CHURCH_NAME } from '../../core/domain/Bulletin';

const gold = '#9a7b2a';
const dark = '#2c2010';
const mid = '#6b5a42';
const light = '#a09080';
const line = '#d8cab0';
const bg = '#ffffff';

const s = StyleSheet.create({
  page: { backgroundColor: bg, padding: '36 42', fontFamily: 'Helvetica', fontSize: 10, color: dark },

  // header
  hdr: { marginBottom: 20, paddingBottom: 14, borderBottomWidth: 1.5, borderBottomColor: gold, borderBottomStyle: 'solid' },
  hdrRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 42, height: 42, borderRadius: 21 },
  logoPlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f0e8d8', alignItems: 'center', justifyContent: 'center' },
  churchName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: dark, letterSpacing: 0.3 },
  presetName: { fontSize: 10, color: gold, marginTop: 2, fontFamily: 'Helvetica-Bold' },
  weekLabel: { fontSize: 9, color: light, marginTop: 1 },
  headerNotes: { marginTop: 8 },
  headerNote: { fontSize: 8, color: mid, fontStyle: 'italic', marginBottom: 1 },

  // sections
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: gold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  divider: { height: 0.5, backgroundColor: line, marginVertical: 6 },

  // day
  dayBlock: { marginBottom: 12 },
  dayRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  dayName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: dark },
  dayDate: { fontSize: 9, color: light },

  // event
  evRow: { flexDirection: 'row', marginBottom: 6, paddingLeft: 6 },
  evDot: { width: 3, height: 3, borderRadius: 1.5, marginTop: 4, marginRight: 8 },
  evBody: { flex: 1 },
  evNameLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  evName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: dark },
  evTime: { fontSize: 9, color: gold, fontFamily: 'Helvetica-Bold' },
  evNotes: { fontSize: 8, color: mid, marginTop: 1, lineHeight: 1.5 },
  evContact: { fontSize: 8, color: mid, marginTop: 1 },
  evContactPhone: { color: gold },
  evImg: { width: 48, height: 48, objectFit: 'contain', marginLeft: 10, borderRadius: 3 },

  // announcement
  annRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5, paddingLeft: 6 },
  annBullet: { fontSize: 8, color: gold, marginRight: 6, marginTop: 2 },
  annText: { fontSize: 9, color: dark, flex: 1, lineHeight: 1.6 },
  annImg: { width: 40, height: 40, objectFit: 'contain', marginLeft: 8, borderRadius: 3 },

  // multi-day
  mdRow: { flexDirection: 'row', marginBottom: 6, paddingLeft: 6 },
  mdDot: { width: 3, height: 3, borderRadius: 1.5, marginTop: 4, marginRight: 8 },
  mdBody: { flex: 1 },
  mdName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: dark },
  mdDate: { fontSize: 8, color: gold, marginTop: 1 },
  mdTime: { fontSize: 8, color: light, marginTop: 1 },
  mdNotes: { fontSize: 8, color: mid, marginTop: 1 },
  mdImg: { width: 48, height: 48, objectFit: 'contain', marginLeft: 10, borderRadius: 3 },

  // footer
  ftr: { position: 'absolute', bottom: 24, left: 42, right: 42, flexDirection: 'row', justifyContent: 'space-between' },
  ftrText: { fontSize: 7, color: light },
});

// Helper: safely render image — catches cross-origin issues
function SafeImage({ src, style }) {
  if (!src) return null;
  // Only render if it looks like a valid URL
  if (!src.startsWith('http') && !src.startsWith('data:')) return null;
  try {
    return <Image src={src} style={style} />;
  } catch {
    return null;
  }
}

function fmtDate(iso, opts) {
  if (!iso) return '';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', opts);
  } catch { return iso; }
}

export const BulletinDocument = ({ bulletin, logoUrl }) => {
  const hn = (bulletin.headerNotes ?? []).filter(n => n.text?.trim());
  const ann = (bulletin.announcements ?? []).filter(a => a.text?.trim());
  const md = bulletin.multiDayEvents ?? [];
  const days = (bulletin.days ?? []).filter(d => d.events?.length > 0);
  // slideImages intentionally excluded from PDF

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.hdr}>
          <View style={s.hdrRow}>
            {logoUrl ? (
              <SafeImage src={logoUrl} style={s.logo} />
            ) : (
              <View style={s.logoPlaceholder}>
                <Text style={{ fontSize: 16, color: gold }}>✝</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.churchName}>{CHURCH_NAME}</Text>
              <Text style={s.presetName}>{bulletin.presetName}</Text>
              <Text style={s.weekLabel}>Week of {bulletin.weekLabel}</Text>
            </View>
          </View>
          {hn.length > 0 && (
            <View style={s.headerNotes}>
              {hn.map((n, i) => <Text key={i} style={s.headerNote}>{hn.length > 1 ? '• ' : ''}{n.text}</Text>)}
            </View>
          )}
        </View>

        {/* ── Announcements ── */}
        {ann.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Announcements</Text>
            {ann.map((a, i) => (
              <View key={i} style={s.annRow} wrap={false}>
                <Text style={s.annBullet}>•</Text>
                <Text style={s.annText}>{a.text}</Text>
                <SafeImage src={a.image} style={s.annImg} />
              </View>
            ))}
            <View style={s.divider} />
          </View>
        )}

        {/* ── Multi-day events ── */}
        {md.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Upcoming Events</Text>
            {md.map((e, i) => {
              const sf = fmtDate(e.startDate, { weekday: 'short', month: 'short', day: 'numeric' });
              const ef = e.endDate && e.endDate !== e.startDate ? fmtDate(e.endDate, { weekday: 'short', month: 'short', day: 'numeric' }) : null;
              return (
                <View key={i} style={s.mdRow} wrap={false}>
                  <View style={[s.mdDot, { backgroundColor: e.color ?? gold }]} />
                  <View style={s.mdBody}>
                    <Text style={s.mdName}>{e.name}</Text>
                    {sf ? <Text style={s.mdDate}>{sf}{ef ? `  →  ${ef}` : ''}</Text> : null}
                    {e.time ? <Text style={s.mdTime}>{e.time}{e.timeTo ? ` – ${e.timeTo}` : ''}</Text> : null}
                    {e.notes ? <Text style={s.mdNotes}>{e.notes}</Text> : null}
                    {(e.contacts ?? []).filter(c => c.name || c.phone).map((c, j) => (
                      <Text key={j} style={s.evContact}>{c.name}{c.phone ? <Text style={s.evContactPhone}>  {c.phone}</Text> : null}</Text>
                    ))}
                  </View>
                  <SafeImage src={e.image} style={s.mdImg} />
                </View>
              );
            })}
            <View style={s.divider} />
          </View>
        )}

        {/* ── Daily schedule ── */}
        {days.length > 0 && <Text style={s.sectionTitle}>Weekly Schedule</Text>}
        {days.map((day, i) => {
          const dl = fmtDate(day.date, { weekday: 'long', month: 'short', day: 'numeric' });
          return (
            <View key={i} style={s.dayBlock} wrap={false}>
              <View style={s.dayRow}>
                <Text style={s.dayName}>{day.day}</Text>
                {dl ? <Text style={s.dayDate}>{dl}</Text> : null}
              </View>
              {day.events.map((ev, j) => {
                const time = [ev.time, ev.timeTo].filter(Boolean).join(' – ');
                return (
                  <View key={j} style={s.evRow}>
                    <View style={[s.evDot, { backgroundColor: ev.color ?? gold }]} />
                    <View style={s.evBody}>
                      <View style={s.evNameLine}>
                        <Text style={s.evName}>{ev.name}</Text>
                        {time ? <Text style={s.evTime}>{time}</Text> : null}
                      </View>
                      {ev.notes ? <Text style={s.evNotes}>{ev.notes}</Text> : null}
                      {(ev.contacts ?? []).filter(c => c.name || c.phone).map((c, k) => (
                        <Text key={k} style={s.evContact}>{c.name}{c.phone ? <Text style={s.evContactPhone}>  {c.phone}</Text> : null}</Text>
                      ))}
                    </View>
                    <SafeImage src={ev.image} style={s.evImg} />
                  </View>
                );
              })}
              {i < days.length - 1 && <View style={s.divider} />}
            </View>
          );
        })}

        {/* ── Footer ── */}
        <View style={s.ftr} fixed>
          <Text style={s.ftrText}>{CHURCH_NAME}</Text>
          <Text style={s.ftrText}>Week of {bulletin.weekLabel}</Text>
        </View>
      </Page>
    </Document>
  );
};