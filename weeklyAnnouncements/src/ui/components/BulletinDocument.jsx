import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { CHURCH_NAME } from '../../core/domain/Bulletin';

const gold = '#b8860b';
const brown = '#5c3d1e';
const cream = '#fdf6ec';
const muted = '#7a6352';

const s = StyleSheet.create({
  page: { backgroundColor: cream, padding: 0, fontFamily: 'Helvetica' },
  header: { backgroundColor: brown, padding: '28 40 20 40', alignItems: 'center' },
  churchName: { fontSize: 18, color: cream, fontFamily: 'Helvetica-Bold', textAlign: 'center', letterSpacing: 1 },
  weekLabel: { fontSize: 11, color: '#d4a017', marginTop: 6, textAlign: 'center' },
  presetName: { fontSize: 13, color: '#e8d5b0', marginTop: 4, textAlign: 'center' },
  body: { padding: '24 40' },
  dayBlock: { marginBottom: 16 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dayName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: brown },
  dayDate: { fontSize: 10, color: muted, marginLeft: 8 },
  dayLine: { flex: 1, height: 1, backgroundColor: gold, marginLeft: 8, opacity: 0.3 },
  eventRow: { flexDirection: 'row', marginBottom: 5, paddingLeft: 10 },
  eventTime: { fontSize: 11, color: gold, width: 110, fontFamily: 'Helvetica-Bold' },
  eventName: { fontSize: 11, color: '#2c1a0e', flex: 1 },
  eventNote: { fontSize: 10, color: muted, marginLeft: 120, marginTop: 1 },
  contactRow: { flexDirection: 'row', marginLeft: 120, marginBottom: 2 },
  contactName: { fontSize: 10, color: '#2c1a0e', marginRight: 8 },
  contactPhone: { fontSize: 10, color: gold },
  footer: { borderTop: `1 solid ${gold}`, margin: '0 40', paddingTop: 10, marginTop: 8 },
  footerText: { fontSize: 9, color: muted, textAlign: 'center' },
});

export const BulletinDocument = ({ bulletin }) => (
  <Document>
    <Page size="A4" style={s.page}>
      <View style={s.header}>
        <Text style={s.churchName}>{CHURCH_NAME}</Text>
        <Text style={s.presetName}>{bulletin.presetName}</Text>
        <Text style={s.weekLabel}>Week of {bulletin.weekLabel}</Text>
      </View>

      <View style={s.body}>
        {(bulletin.days ?? []).map((day, i) => {
          if (!day.events?.length) return null;
          const dateLabel = day.date
            ? new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '';
          return (
            <View key={i} style={s.dayBlock}>
              <View style={s.dayHeader}>
                <Text style={s.dayName}>{day.day}</Text>
                {dateLabel ? <Text style={s.dayDate}>{dateLabel}</Text> : null}
                <View style={s.dayLine} />
              </View>
              {day.events.map((event, j) => (
                <View key={j}>
                  <View style={s.eventRow}>
                    <Text style={s.eventTime}>
                      {event.time}{event.timeTo ? ` → ${event.timeTo}` : ''}
                    </Text>
                    <Text style={s.eventName}>{event.name}</Text>
                  </View>
                  {event.notes ? <Text style={s.eventNote}>{event.notes}</Text> : null}
                  {(event.contacts ?? []).map((c, k) => (
                    <View key={k} style={s.contactRow}>
                      <Text style={s.contactName}>{c.name}</Text>
                      <Text style={s.contactPhone}>{c.phone}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          );
        })}
      </View>

      <View style={s.footer}>
        <Text style={s.footerText}>{CHURCH_NAME} · {bulletin.weekLabel}</Text>
      </View>
    </Page>
  </Document>
);