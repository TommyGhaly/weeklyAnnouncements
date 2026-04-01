import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { CHURCH_NAME } from '../../core/domain/Bulletin';

const gold = '#b8860b';
const brown = '#5c3d1e';
const cream = '#fdf6ec';
const muted = '#7a6352';

const s = StyleSheet.create({
  page: { backgroundColor: cream, padding: 0, fontFamily: 'Helvetica' },

  // Header
  header: { backgroundColor: brown, padding: '28 40 20 40', alignItems: 'center' },
  cross: { fontSize: 28, color: gold, marginBottom: 6 },
  churchName: { fontSize: 18, color: cream, fontFamily: 'Helvetica-Bold', textAlign: 'center', letterSpacing: 1 },
  weekLabel: { fontSize: 11, color: '#d4a017', marginTop: 6, textAlign: 'center', letterSpacing: 0.5 },
  presetName: { fontSize: 13, color: '#e8d5b0', marginTop: 4, textAlign: 'center' },

  // Body
  body: { padding: '24 40' },

  // Day section
  dayBlock: { marginBottom: 16 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dayName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: brown },
  dayLine: { flex: 1, height: 1, backgroundColor: gold, marginLeft: 8, opacity: 0.4 },
  dayItem: { flexDirection: 'row', marginBottom: 4, paddingLeft: 10 },
  itemTime: { fontSize: 11, color: gold, width: 80, fontFamily: 'Helvetica-Bold' },
  itemLabel: { fontSize: 11, color: '#2c1a0e', flex: 1 },
  itemNote: { fontSize: 10, color: muted, marginLeft: 88, marginTop: 1, marginBottom: 2 },

  // Announcement section
  sectionBlock: { marginBottom: 16 },
  sectionHeader: { backgroundColor: brown, borderRadius: 4, padding: '5 10', marginBottom: 8 },
  sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: cream, letterSpacing: 0.5 },
  bulletItem: { flexDirection: 'row', marginBottom: 4, paddingLeft: 10 },
  bullet: { fontSize: 11, color: gold, width: 14 },
  bulletText: { fontSize: 11, color: '#2c1a0e', flex: 1 },

  // Contact section
  contactItem: { flexDirection: 'row', marginBottom: 5, paddingLeft: 10, alignItems: 'center' },
  contactRole: { fontSize: 10, color: muted, width: 100, fontFamily: 'Helvetica-Bold' },
  contactName: { fontSize: 11, color: '#2c1a0e', flex: 1 },
  contactPhone: { fontSize: 11, color: gold },

  // Event section
  eventBlock: { borderLeft: `3 solid ${gold}`, paddingLeft: 12, marginBottom: 12 },
  eventTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: brown, marginBottom: 3 },
  eventSubtitle: { fontSize: 11, color: muted, marginBottom: 2 },
  eventTime: { fontSize: 11, color: gold, marginBottom: 2 },
  eventNote: { fontSize: 10, color: muted },

  // Footer
  footer: { borderTop: `1 solid ${gold}`, margin: '0 40', paddingTop: 10, marginTop: 8 },
  footerText: { fontSize: 9, color: muted, textAlign: 'center' },
});

export const BulletinDocument = ({ bulletin }) => (
  <Document>
    <Page size="A4" style={s.page}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.cross}>✝</Text>
        <Text style={s.churchName}>{CHURCH_NAME}</Text>
        <Text style={s.presetName}>{bulletin.presetName}</Text>
        <Text style={s.weekLabel}>Week of {bulletin.weekLabel}</Text>
      </View>

      {/* Body */}
      <View style={s.body}>
        {bulletin.slides.map(slide => (
          <View key={slide.id}>

            {slide.type === 'day' && (
              <View style={s.dayBlock}>
                <View style={s.dayHeader}>
                  <Text style={s.dayName}>{slide.data.day}</Text>
                  <View style={s.dayLine} />
                </View>
                {slide.data.items?.map((item, i) => (
                  <View key={i}>
                    <View style={s.dayItem}>
                      <Text style={s.itemTime}>{item.time}</Text>
                      <Text style={s.itemLabel}>{item.label}</Text>
                    </View>
                    {item.note ? <Text style={s.itemNote}>{item.note}</Text> : null}
                  </View>
                ))}
              </View>
            )}

            {slide.type === 'announcement' && (
              <View style={s.sectionBlock}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>📢 {slide.data.title}</Text>
                </View>
                {slide.data.items?.map((item, i) => (
                  <View key={i} style={s.bulletItem}>
                    <Text style={s.bullet}>•</Text>
                    <Text style={s.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {slide.type === 'contact' && (
              <View style={s.sectionBlock}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>📞 {slide.data.title}</Text>
                </View>
                {slide.data.entries?.map((entry, i) => (
                  <View key={i} style={s.contactItem}>
                    <Text style={s.contactRole}>{entry.role}</Text>
                    <Text style={s.contactName}>{entry.name}</Text>
                    <Text style={s.contactPhone}>{entry.phone}</Text>
                  </View>
                ))}
              </View>
            )}

            {slide.type === 'event' && (
              <View style={s.eventBlock}>
                <Text style={s.eventTitle}>{slide.data.title}</Text>
                {slide.data.subtitle ? <Text style={s.eventSubtitle}>{slide.data.subtitle}</Text> : null}
                {slide.data.time ? <Text style={s.eventTime}>🕐 {slide.data.time}</Text> : null}
                {slide.data.note ? <Text style={s.eventNote}>{slide.data.note}</Text> : null}
              </View>
            )}

          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <Text style={s.footerText}>{CHURCH_NAME} · {bulletin.weekLabel}</Text>
      </View>

    </Page>
  </Document>
);