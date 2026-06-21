import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { CHURCH_NAME } from '../../core/domain/Bulletin';

const gold  = '#9a7b2a';
const dark  = '#1a1208';
const mid   = '#4a3e30';
const light = '#8a7a68';
const ln    = '#d8ccb8';

const s = StyleSheet.create({
  page: {
    backgroundColor: '#fff',
    padding: '32 40 28 40',
    fontFamily: 'Helvetica',
    fontSize: 12,
    color: dark,
  },

  // ── Header ──────────────────────────────────────────────────
  hdr: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: gold,
    borderBottomStyle: 'solid',
  },
  churchName: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: dark,
    letterSpacing: 0.3,
  },
  presetName: {
    fontSize: 12,
    color: gold,
    fontFamily: 'Helvetica-Bold',
    marginTop: 2,
  },
  weekLabel: {
    fontSize: 10,
    color: light,
    marginTop: 1,
  },
  headerNote: {
    fontSize: 10,
    color: mid,
    fontStyle: 'italic',
    marginTop: 3,
    lineHeight: 1.4,
  },

  // ── Section title ────────────────────────────────────────────
  secTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: gold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 4,
  },
  div: {
    height: 0.75,
    backgroundColor: ln,
    marginVertical: 4,
  },

  // ── Multi-day events ─────────────────────────────────────────
  mdRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e8e0d0',
    borderBottomStyle: 'solid',
  },
  mdDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 4,
    marginRight: 8,
    backgroundColor: gold,
  },
  mdName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: dark,
    flex: 1,
  },
  mdMeta: {
    width: 160,
    textAlign: 'right',
  },
  mdDate: {
    fontSize: 10,
    color: gold,
    fontFamily: 'Helvetica-Bold',
  },
  mdTime: {
    fontSize: 9,
    color: light,
    marginTop: 1,
  },
  mdNotes: {
    fontSize: 10,
    color: mid,
    fontStyle: 'italic',
    paddingLeft: 13,
    marginTop: 2,
    lineHeight: 1.4,
  },
  mdContacts: {
    fontSize: 9,
    color: mid,
    paddingLeft: 13,
    marginTop: 1,
  },

  // ── Announcements ────────────────────────────────────────────
  annRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e8e0d0',
    borderBottomStyle: 'solid',
  },
  annBullet: {
    fontSize: 10,
    color: gold,
    marginRight: 6,
    marginTop: 2,
  },
  annText: {
    fontSize: 12,
    color: dark,
    flex: 1,
    lineHeight: 1.5,
  },

  // ── Daily schedule ───────────────────────────────────────────
  dayHdr: {
    backgroundColor: '#f6f2ec',
    padding: '5 10',
    marginTop: 8,
    marginBottom: 2,
    borderLeftWidth: 3,
    borderLeftColor: gold,
    borderLeftStyle: 'solid',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  dayName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: dark,
  },
  dayDate: {
    fontSize: 10,
    color: light,
  },
  evRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e8e0d0',
    borderBottomStyle: 'solid',
    minHeight: 22,
  },
  evDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 8,
  },
  evName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: dark,
    flex: 1,
  },
  evTime: {
    fontSize: 11,
    color: gold,
    fontFamily: 'Helvetica-Bold',
    width: 130,
    textAlign: 'right',
  },
  evNotes: {
    fontSize: 10,
    color: mid,
    fontStyle: 'italic',
    paddingLeft: 24,
    marginTop: 2,
    lineHeight: 1.4,
    marginBottom: 2,
  },
  evContact: {
    fontSize: 9,
    color: mid,
    paddingLeft: 24,
    marginBottom: 1,
  },
  evContactPhone: {
    color: gold,
  },

  // ── Footer ───────────────────────────────────────────────────
  ftr: {
    position: 'absolute',
    bottom: 16,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ftrT: {
    fontSize: 8,
    color: light,
  },
});

function fmtD(iso, opts) {
  if (!iso) return '';
  try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', opts); } catch { return iso; }
}

export const HomilyDocument = ({ bulletin }) => {

  const hn   = (bulletin.headerNotes   ?? []).filter(n => n.text?.trim());
  const ann  = (bulletin.announcements ?? []).filter(a => a.text?.trim());
  const md   = (bulletin.multiDayEvents ?? []).filter(e => e.name?.trim());
  const days = (bulletin.days ?? []).filter(d => d.events?.length > 0);

  return (
    <Document title={`${bulletin.presetName ?? 'Bulletin'} — Homily`}>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.hdr}>
          <Text style={s.churchName}>{CHURCH_NAME}</Text>
          <Text style={s.presetName}>{bulletin.presetName}</Text>
          <Text style={s.weekLabel}>Week of {bulletin.weekLabel}</Text>
          {hn.map((n, i) => (
            <Text key={i} style={s.headerNote}>{hn.length > 1 ? '• ' : ''}{n.text}</Text>
          ))}
        </View>

        {/* ── Multi-day ── */}
        {md.length > 0 && (
          <View>
            <Text style={s.secTitle}>Upcoming Events</Text>
            {md.map((e, i) => {
              const sf = fmtD(e.startDate, { weekday: 'short', month: 'short', day: 'numeric' });
              const ef = e.endDate && e.endDate !== e.startDate
                ? fmtD(e.endDate, { weekday: 'short', month: 'short', day: 'numeric' }) : null;
              const contacts = (e.contacts ?? []).filter(c => c.name || c.phone);
              return (
                <View key={i} wrap={false}>
                  <View style={s.mdRow}>
                    <View style={[s.mdDot, { backgroundColor: e.color ?? gold }]} />
                    <Text style={s.mdName}>{e.name}</Text>
                    <View style={s.mdMeta}>
                      {sf ? <Text style={s.mdDate}>{sf}{ef ? ` – ${ef}` : ''}</Text> : null}
                      {e.time ? <Text style={s.mdTime}>{e.time}{e.timeTo ? ` – ${e.timeTo}` : ''}</Text> : null}
                    </View>
                  </View>
                  {e.notes ? <Text style={s.mdNotes}>{e.notes}</Text> : null}
                  {contacts.map((c, k) => (
                    <Text key={k} style={s.mdContacts}>
                      {c.name}{c.phone ? `  ·  ${c.phone}` : ''}
                    </Text>
                  ))}
                </View>
              );
            })}
            <View style={s.div} />
          </View>
        )}

        {/* ── Announcements ── */}
        {ann.length > 0 && (
          <View>
            <Text style={s.secTitle}>Announcements</Text>
            {ann.map((a, i) => (
              <View key={i} style={s.annRow} wrap={false}>
                <Text style={s.annBullet}>•</Text>
                <Text style={s.annText}>{a.text}</Text>
              </View>
            ))}
            <View style={s.div} />
          </View>
        )}

        {/* ── Daily schedule ── */}
        {days.length > 0 && (
          <View>
            <Text style={s.secTitle}>Weekly Schedule</Text>
            {days.map((day, di) => {
              const dl = fmtD(day.date, { weekday: 'long', month: 'short', day: 'numeric' });
              return (
                <View key={di}>
                  <View style={s.dayHdr} wrap={false} minPresenceAhead={30}>
                    <View style={s.dayRow}>
                      <Text style={s.dayName}>{day.day}</Text>
                      {dl ? <Text style={s.dayDate}>{dl}</Text> : null}
                    </View>
                  </View>
                  {day.events.map((ev, j) => {
                    const time = [ev.time, ev.timeTo].filter(Boolean).join(' – ');
                    const contacts = (ev.contacts ?? []).filter(c => c.name || c.phone);
                    return (
                      <View key={j} wrap={false}>
                        <View style={s.evRow}>
                          <View style={[s.evDot, { backgroundColor: ev.color ?? gold }]} />
                          <Text style={s.evName}>{ev.name}</Text>
                          <Text style={s.evTime}>{time}</Text>
                        </View>
                        {ev.notes ? <Text style={s.evNotes}>{ev.notes}</Text> : null}
                        {contacts.map((c, k) => (
                          <Text key={k} style={s.evContact}>
                            {c.name}{c.phone ? `  ·  ` : ''}
                            {c.phone ? <Text style={s.evContactPhone}>{c.phone}</Text> : null}
                          </Text>
                        ))}
                      </View>
                    );
                  })}
                  {di < days.length - 1 && <View style={s.div} />}
                </View>
              );
            })}
          </View>
        )}

        <View style={s.ftr} fixed>
          <Text style={s.ftrT}>{CHURCH_NAME}</Text>
          <Text style={s.ftrT}>Week of {bulletin.weekLabel}</Text>
        </View>

      </Page>
    </Document>
  );
};