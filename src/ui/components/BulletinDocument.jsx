import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { CHURCH_NAME } from '../../core/domain/Bulletin';

const gold = '#9a7b2a';
const dark = '#2c2010';
const mid = '#6b5a42';
const light = '#a09080';
const ln = '#e0d4c0';
const bg = '#faf8f4';

const s = StyleSheet.create({
  page: { backgroundColor: '#fff', padding: '22 30 18 30', fontFamily: 'Helvetica', fontSize: 9, color: dark },
  hdr: { marginBottom: 6, paddingBottom: 5, borderBottomWidth: 1.5, borderBottomColor: gold, borderBottomStyle: 'solid' },
  hdrRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 30, height: 30, borderRadius: 15 },
  logoP: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0e8d8', alignItems: 'center', justifyContent: 'center' },
  cn: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: dark },
  pn: { fontSize: 7.5, color: gold, marginTop: 0.5, fontFamily: 'Helvetica-Bold' },
  wl: { fontSize: 6.5, color: light },
  hnWrap: { marginTop: 2 },
  hn: { fontSize: 6, color: mid, fontStyle: 'italic' },
  secT: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: gold, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2, marginTop: 5 },
  div: { height: 0.5, backgroundColor: ln, marginVertical: 2 },
  // day header
  dayHdr: { backgroundColor: bg, padding: '3 6', marginTop: 3, marginBottom: 1, borderLeftWidth: 2, borderLeftColor: gold, borderLeftStyle: 'solid' },
  dayRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  dayName: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: dark },
  dayDate: { fontSize: 7, color: light },
  // event row — table-like
  evRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 1.5, paddingLeft: 8, borderBottomWidth: 0.3, borderBottomColor: '#ece4d8', borderBottomStyle: 'solid', minHeight: 14 },
  evDot: { width: 2, height: 2, borderRadius: 1, marginRight: 4 },
  evName: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: dark, flex: 1 },
  evTime: { fontSize: 7.5, color: gold, fontFamily: 'Helvetica-Bold', width: 110, textAlign: 'right' },
  evImg: { width: 24, height: 24, objectFit: 'contain', marginLeft: 4, borderRadius: 1.5 },
  evNotes: { fontSize: 6, color: mid, paddingLeft: 14, lineHeight: 1.3, marginBottom: 0.5 },
  evC: { fontSize: 6, color: mid, paddingLeft: 14 },
  evCP: { color: gold },
  // multi-day
  mdRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2, paddingLeft: 4, borderBottomWidth: 0.3, borderBottomColor: '#ece4d8', borderBottomStyle: 'solid' },
  mdName: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: dark, flex: 1 },
  mdRight: { width: 140, textAlign: 'right' },
  mdDate: { fontSize: 7, color: gold },
  mdTime: { fontSize: 6.5, color: light },
  mdImg: { width: 24, height: 24, objectFit: 'contain', marginLeft: 4, borderRadius: 1.5 },
  // announcement
  annRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 1.5, paddingLeft: 4 },
  annBullet: { fontSize: 6, color: gold, marginRight: 4 },
  annText: { fontSize: 7.5, color: dark, flex: 1, lineHeight: 1.3 },
  annImg: { width: 20, height: 20, objectFit: 'contain', marginLeft: 4, borderRadius: 1.5 },
  // footer
  ftr: { position: 'absolute', bottom: 12, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between' },
  ftrT: { fontSize: 5.5, color: light },
});

function fmtD(iso, o) {
  if (!iso) return '';
  try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', o); } catch { return iso; }
}

function Img({ src, style }) {
  if (!src) return null;
  try { return <Image src={src} style={style} />; } catch { return null; }
}

export const BulletinDocument = ({ bulletin, logoUrl, imageMap }) => {
  const img = url => (imageMap && imageMap[url]) || url || null;
  const hn = (bulletin.headerNotes ?? []).filter(n => n.text?.trim());
  const ann = (bulletin.announcements ?? []).filter(a => a.text?.trim());
  const md = bulletin.multiDayEvents ?? [];
  const days = (bulletin.days ?? []).filter(d => d.events?.length > 0);

  return (
    <Document title={bulletin.presetName ?? 'Weekly Bulletin'}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.hdr}>
          <View style={s.hdrRow}>
            {img(logoUrl) ? <Img src={img(logoUrl)} style={s.logo} /> : <View style={s.logoP}><Text style={{ fontSize: 11, color: gold }}>✝</Text></View>}
            <View style={{ flex: 1 }}>
              <Text style={s.cn}>{CHURCH_NAME}</Text>
              <Text style={s.pn}>{bulletin.presetName}</Text>
              <Text style={s.wl}>Week of {bulletin.weekLabel}</Text>
            </View>
          </View>
          {hn.length > 0 && <View style={s.hnWrap}>{hn.map((n, i) => <Text key={i} style={s.hn}>{hn.length > 1 ? '• ' : ''}{n.text}</Text>)}</View>}
        </View>

        {/* Multi-day */}
        {md.length > 0 && <View>
          <Text style={s.secT}>Upcoming Events</Text>
          {md.map((e, i) => {
            const sf = fmtD(e.startDate, { weekday: 'short', month: 'short', day: 'numeric' });
            const ef = e.endDate && e.endDate !== e.startDate ? fmtD(e.endDate, { weekday: 'short', month: 'short', day: 'numeric' }) : null;
            return <View key={i} wrap={false}>
              <View style={s.mdRow}>
                <View style={[s.evDot, { backgroundColor: e.color ?? gold }]} />
                <Text style={s.mdName}>{e.name}</Text>
                <View style={s.mdRight}>
                  {sf ? <Text style={s.mdDate}>{sf}{ef ? ` → ${ef}` : ''}</Text> : null}
                  {e.time ? <Text style={s.mdTime}>{e.time}{e.timeTo ? ` – ${e.timeTo}` : ''}</Text> : null}
                </View>
                <Img src={img(e.image)} style={s.mdImg} />
              </View>
              {e.notes ? <Text style={s.evNotes}>{e.notes}</Text> : null}
            </View>;
          })}
          <View style={s.div} />
        </View>}

        {/* Announcements */}
        {ann.length > 0 && <View>
          <Text style={s.secT}>Announcements</Text>
          {ann.map((a, i) => <View key={i} style={s.annRow} wrap={false}><Text style={s.annBullet}>•</Text><Text style={s.annText}>{a.text}</Text><Img src={img(a.image)} style={s.annImg} /></View>)}
          <View style={s.div} />
        </View>}

        {/* Daily schedule */}
        {days.length > 0 && <Text style={s.secT}>Weekly Schedule</Text>}
        {days.map((day, di) => {
          const dl = fmtD(day.date, { weekday: 'long', month: 'short', day: 'numeric' });
          return <View key={di}>
            <View style={s.dayHdr} wrap={false} minPresenceAhead={30}>
              <View style={s.dayRow}>
                <Text style={s.dayName}>{day.day}</Text>
                {dl ? <Text style={s.dayDate}>{dl}</Text> : null}
              </View>
            </View>
            {day.events.map((ev, j) => {
              const time = [ev.time, ev.timeTo].filter(Boolean).join(' – ');
              return <View key={j} wrap={false}>
                <View style={s.evRow}>
                  <View style={[s.evDot, { backgroundColor: ev.color ?? gold }]} />
                  <Text style={s.evName}>{ev.name}</Text>
                  <Text style={s.evTime}>{time}</Text>
                  <Img src={img(ev.image)} style={s.evImg} />
                </View>
                {ev.notes ? <Text style={s.evNotes}>{ev.notes}</Text> : null}
                {(ev.contacts ?? []).filter(c => c.name || c.phone).map((c, k) => <Text key={k} style={s.evC}>{c.name}{c.phone ? <Text style={s.evCP}>  {c.phone}</Text> : null}</Text>)}
              </View>;
            })}
            {di < days.length - 1 && <View style={s.div} />}
          </View>;
        })}

        <View style={s.ftr} fixed>
          <Text style={s.ftrT}>{CHURCH_NAME}</Text>
          <Text style={s.ftrT}>Week of {bulletin.weekLabel}</Text>
        </View>
      </Page>
    </Document>
  );
};