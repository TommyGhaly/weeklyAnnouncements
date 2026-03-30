import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  title: { fontSize: 22, marginBottom: 20, fontFamily: 'Helvetica-Bold' },
  sectionTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 8, marginTop: 16 },
  item: { fontSize: 12, marginBottom: 4 },
  body: { fontSize: 12, lineHeight: 1.6 },
});

export const BulletinDocument = ({ bulletin }) => (
  <Document>
    <Page size="A4" style={s.page}>
      <Text style={s.title}>{bulletin.presetName}</Text>
      {bulletin.slides.map(slide => (
        <View key={slide.id}>
          {slide.type === 'schedule' && (
            <>
              <Text style={s.sectionTitle}>Schedule</Text>
              {slide.data.items?.map((item, i) => (
                <Text key={i} style={s.item}>{item.time} — {item.label}</Text>
              ))}
            </>
          )}
          {slide.type === 'announcement' && (
            <>
              <Text style={s.sectionTitle}>Announcements</Text>
              {slide.data.items?.map((item, i) => (
                <Text key={i} style={s.item}>• {item}</Text>
              ))}
            </>
          )}
          {slide.type === 'custom' && (
            <>
              <Text style={s.sectionTitle}>{slide.data.title}</Text>
              <Text style={s.body}>{slide.data.body}</Text>
            </>
          )}
        </View>
      ))}
    </Page>
  </Document>
);