import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { CHURCH_NAME } from '../../core/domain/Bulletin';

const gold = '#b8860b';
const brown = '#5c3d1e';
const cream = '#fdf6ec';
const muted = '#7a6352';

const s = StyleSheet.create({
  page: { backgroundColor: cream, padding: 0, fontFamily: 'Helvetica' },
  header: { backgroundColor: brown, padding: '24 40 18 40', flexDirection: 'row', alignItems: 'center', gap: 16 },
  logoBox: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(212,160,23,0.15)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logoImg: { width: 48, height: 48, borderRadius: 24 },
  headerText: { flex: 1 },
  churchName: { fontSize: 15, color: cream, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  weekLabel: { fontSize: 10, color: '#d4a017', marginTop: 3 },
  presetName: { fontSize: 12, color: '#e8d5b0', marginTop: 2 },
  body: { padding: '20 40' },
  dayBlock: { marginBottom: 14 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dayName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: brown },
  dayDate: { fontSize: 10, color: muted, marginLeft: 6 },
  dayLine: { flex: 1, height: 0.5, backgroundColor: gold, marginLeft: 8, opacity: 0.4 },
  eventRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
  eventLeft: { flex: 1 },
  eventNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  colorBar: { width: 3, height: 12, marginRight: 6, borderRadius: 1 },
  eventName: { fontSize: 11, color: '#2c1a0e', fontFamily: 'Helvetica-Bold' },
  eventTime: { fontSize: 10, color: gold, marginBottom: 2, paddingLeft: 9 },
  eventNote: { fontSize: 9, color: muted, paddingLeft: 9, marginBottom: 2 },
  contactRow: { flexDirection: 'row', paddingLeft: 9, marginBottom: 1 },
  contactName: { fontSize: 9, color: '#2c1a0e', marginRight: 6 },
  contactPhone: { fontSize: 9, color: gold },
  eventImage: { width: 60, height: 60, objectFit: 'contain', marginLeft: 8, borderRadius: 4, flexShrink: 0 },
  divider: { height: 0.5, backgroundColor: gold, opacity: 0.2, marginBottom: 10 },
  announcementsHeader: { backgroundColor: brown, borderRadius: 3, padding: '4 8', marginBottom: 6 },
  announcementsTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: cream },
  announcementRow: { flexDirection: 'row', marginBottom: 5, paddingLeft: 8, alignItems: 'flex-start' },
  bulletDot: { fontSize: 10, color: gold, marginRight: 5, marginTop: 1 },
  announcementText: { fontSize: 10, color: '#2c1a0e', flex: 1, lineHeight: 1.4 },
  announcementImg: { width: 50, height: 50, objectFit: 'contain', marginLeft: 8, borderRadius: 4, flexShrink: 0 },
  multiDayHeader: { backgroundColor: '#4a3d1e', borderRadius: 3, padding: '4 8', marginBottom: 6 },
  multiDayTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: cream },
  multiDayRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
  multiDayLeft: { flex: 1, paddingLeft: 8 },
  multiDayName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: brown },
  multiDayDate: { fontSize: 9, color: gold, marginTop: 1 },
  multiDayNote: { fontSize: 9, color: muted, marginTop: 1 },
  footer: { borderTopWidth: 0.5, borderTopColor: gold, borderTopStyle: 'solid', margin: '0 40', paddingTop: 8, marginTop: 6 },
  footerText: { fontSize: 8, color: muted, textAlign: 'center' },
});

export const BulletinDocument = ({ bulletin, logoUrl }) => (
  <Document>
    <Page size="A4" style={s.page}>

      {/* Header */}
      <View style={s.header}>
        {logoUrl ? (
          <View style={s.logoBox}>
            <Image src={logoUrl} style={s.logoImg} />
          </View>
        ) : (
          <View style={s.logoBox}>
            <Text style={{ fontSize: 20, color: gold }}>✝</Text>
          </View>
        )}
        <View style={s.headerText}>
          <Text style={s.churchName}>{CHURCH_NAME}</Text>
          <Text style={s.presetName}>{bulletin.presetName}</Text>
          <Text style={s.weekLabel}>Week of {bulletin.weekLabel}</Text>
        </View>
      </View>

      <View style={s.body}>

        {/* Announcements */}
        {(bulletin.announcements ?? []).filter(a => a.text?.trim()).length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <View style={s.announcementsHeader}>
              <Text style={s.announcementsTitle}>📢 Announcements</Text>
            </View>
            {bulletin.announcements.filter(a => a.text?.trim()).map((a, i) => (
              <View key={i} style={s.announcementRow}>
                <Text style={s.bulletDot}>•</Text>
                <Text style={s.announcementText}>{a.text}</Text>
                {a.image ? <Image src={a.image} style={s.announcementImg} /> : null}
              </View>
            ))}
            <View style={s.divider} />
          </View>
        )}

        {/* Multi-day events */}
        {(bulletin.multiDayEvents ?? []).length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <View style={s.multiDayHeader}>
              <Text style={s.multiDayTitle}>🗓 Upcoming Events</Text>
            </View>
            {bulletin.multiDayEvents.map((e, i) => {
              const startFmt = e.startDate && !isNaN(new Date(e.startDate + 'T00:00:00'))
                ? new Date(e.startDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                : e.startDate;
              const endFmt = e.endDate && e.endDate !== e.startDate && !isNaN(new Date(e.endDate + 'T00:00:00'))
                ? new Date(e.endDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                : null;
              return (
                <View key={i} style={s.multiDayRow}>
                  <View style={s.multiDayLeft}>
                    <Text style={s.multiDayName}>{e.name}</Text>
                    {startFmt ? <Text style={s.multiDayDate}>{startFmt}{endFmt ? ` - ${endFmt}` : ''}</Text> : null}
                    {e.time ? <Text style={s.multiDayDate}>{e.time}{e.timeTo ? ` - ${e.timeTo}` : ''}</Text> : null}
                    {e.notes ? <Text style={s.multiDayNote}>{e.notes}</Text> : null}
                    {(e.contacts ?? []).map((c, j) => (
                      <View key={j} style={s.contactRow}>
                        <Text style={s.contactName}>{c.name}</Text>
                        {c.phone ? <Text style={s.contactPhone}>{c.phone}</Text> : null}
                      </View>
                    ))}
                  </View>
                  {e.image ? <Image src={e.image} style={s.eventImage} /> : null}
                </View>
              );
            })}
            <View style={s.divider} />
          </View>
        )}

        {/* Daily schedule */}
        {(bulletin.days ?? []).map((day, i) => {
          if (!day.events?.length) return null;
          const dateLabel = day.date && !isNaN(new Date(day.date + 'T00:00:00'))
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
                <View key={j} style={s.eventRow}>
                  <View style={s.eventLeft}>
                    <View style={s.eventNameRow}>
                      <View style={[s.colorBar, { backgroundColor: event.color ?? gold }]} />
                      <Text style={s.eventName}>{event.name}</Text>
                    </View>
                    {(event.time || event.timeTo)
                      ? <Text style={s.eventTime}>{event.time}{event.timeTo ? ` - ${event.timeTo}` : ''}</Text>
                      : null}
                    {event.notes ? <Text style={s.eventNote}>{event.notes}</Text> : null}
                    {(event.contacts ?? []).map((c, k) => (
                      <View key={k} style={s.contactRow}>
                        <Text style={s.contactName}>{c.name}</Text>
                        {c.phone ? <Text style={s.contactPhone}>{c.phone}</Text> : null}
                      </View>
                    ))}
                  </View>
                  {event.image ? <Image src={event.image} style={s.eventImage} /> : null}
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