import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { NotificationPort } from '../../core/ports/NotificationPort';
import { CHURCH_NAME } from '../../core/domain/Bulletin';

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}
function fmtDateRange(s, e) { return `${fmtDate(s)} – ${fmtDate(e)}`; }
function dayName(dateStr) {
  return DAY_NAMES[new Date(dateStr + 'T12:00:00').getDay()];
}

/** Same logic as PresentPage — smart label for multi-day section */
function multiDayLabel(events) {
  if (!events?.length) return 'Multi-Day Events';
  const keys = [...new Set(events.map(e => `${e.startDate}|${e.endDate}`))];
  if (keys.length === 1) {
    const [s, e] = keys[0].split('|');
    const sd = dayName(s), ed = dayName(e);
    return sd === ed ? sd : `${sd} – ${ed}`;
  }
  return 'Multi-Day Events';
}

/* ═══════════════════════════════════════════════════════════
   TelegramAdapter
   ═══════════════════════════════════════════════════════════ */
export class TelegramAdapter extends NotificationPort {
  /**
   * @param {boolean} devMode - when true, sends to the test channel
   */
  constructor(devMode = false) {
    super();
    this.token  = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    this.chatId = devMode
      ? import.meta.env.VITE_TELEGRAM_CHAT_ID_TEST
      : import.meta.env.VITE_TELEGRAM_CHAT_ID_REAL;
    this.base = `https://api.telegram.org/bot${this.token}`;
  }

  /**
   * Reads devMode from Firestore config/app, then constructs the adapter.
   * Use this at every call site instead of `new TelegramAdapter()`.
   */
  static async create() {
    try {
      const snap = await getDoc(doc(db, 'config', 'app'));
      const devMode = snap.exists() ? (snap.data().devMode ?? false) : false;
      return new TelegramAdapter(devMode);
    } catch {
      return new TelegramAdapter(false);
    }
  }

  /* ── Public API ─────────────────────────────────────────── */

  /**
   * Publishes the full bulletin: PDF + digest text.
   * Slide images are intentionally excluded from Telegram.
   * Returns array of sent message IDs (for edit/delete later).
   */
  async publish(bulletin, pdfBlob) {
    const ids   = [];
    const digest = this.formatDigest(bulletin);
    const header = `✝ *${CHURCH_NAME}* — ${bulletin.presetName ?? ''}\n🗓 Week of ${bulletin.weekLabel ?? ''}`;

    if (digest.length <= 1024) {
      const id = await this._sendDocument(pdfBlob, digest);
      if (id) ids.push(id);
    } else {
      const id = await this._sendDocument(pdfBlob, header);
      if (id) ids.push(id);
      const mids = await this._sendLongMessage(digest);
      ids.push(...mids);
    }

    return ids;
  }

  /**
   * Sends only the announcements block (the "announcements only" button).
   * Returns array of sent message IDs.
   */
  async publishAnnouncements(bulletin) {
    const anns = (bulletin.announcements ?? []).filter(a => a.text?.trim());
    if (!anns.length) return [];

    const lines = [
      `✝ *${CHURCH_NAME}*`,
      ``,
      `📢 *Announcements*`,
      ``,
      ...anns.map(a => `• ${a.text}`),
    ];

    return this._sendLongMessage(lines.join('\n'));
  }

  /**
   * Edits a previously sent text message.
   */
  async editMessage(messageId, newText) {
    const form = new FormData();
    form.append('chat_id',    this.chatId);
    form.append('message_id', messageId);
    form.append('text',       newText.slice(0, 4096));
    form.append('parse_mode', 'Markdown');
    const res = await fetch(`${this.base}/editMessageText`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Telegram editMessage error: ${res.statusText}`);
  }

  /**
   * Deletes a previously sent message.
   */
  async deleteMessage(messageId) {
    const form = new FormData();
    form.append('chat_id',    this.chatId);
    form.append('message_id', messageId);
    const res = await fetch(`${this.base}/deleteMessage`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Telegram deleteMessage error: ${res.statusText}`);
  }

  /* ── formatDigest ───────────────────────────────────────── */

  formatDigest(bulletin) {
    const lines = [
      `✝ *${CHURCH_NAME}*`,
      ``,
      `📋 *${bulletin.presetName ?? 'Weekly Bulletin'}*`,
      `🗓 Week of ${bulletin.weekLabel ?? ''}`,
    ];

    // Header notes
    const headerNotes = (bulletin.headerNotes ?? []).filter(n => n.text?.trim());
    if (headerNotes.length) {
      lines.push(``);
      for (const n of headerNotes) lines.push(`   📌 _${n.text}_`);
    }

    lines.push(``, `━━━━━━━━━━━━━━━`, ``);

    // Multi-day events
    const multiDay = (bulletin.multiDayEvents ?? []).filter(e => e.name);
    if (multiDay.length) {
      const label = multiDayLabel(multiDay);
      lines.push(`🗓 *${label}*`, ``);
      for (const e of multiDay) {
        lines.push(`*${e.name}*`);
        lines.push(`   📅 ${fmtDateRange(e.startDate, e.endDate)}${e.time ? ` · ${e.time}` : ''}`);
        if (e.notes) lines.push(`   _${e.notes}_`);
        const contacts = e.contacts ?? [];
        if (contacts.length) lines.push(`   👤 ${contacts.map(c => c.name + (c.phone ? ` ${c.phone}` : '')).join(' · ')}`);
        lines.push(``);
      }
      lines.push(`━━━━━━━━━━━━━━━`, ``);
    }

    // Daily schedule
    const days = (bulletin.days ?? []).filter(d => d.events?.length);
    if (days.length) {
      lines.push(`🕐 *Schedule*`, ``);
      for (const day of days) {
        lines.push(`*${day.day}*`);
        for (const ev of day.events) {
          const time = ev.time ? `${ev.time}${ev.timeTo ? ` – ${ev.timeTo}` : ''}` : '';
          lines.push(`   ${time ? `${time}  ` : ''}${ev.name}`);
          if (ev.notes)    lines.push(`   _${ev.notes}_`);
          const contacts = ev.contacts ?? [];
          if (contacts.length) lines.push(`   👤 ${contacts.map(c => c.name + (c.phone ? ` ${c.phone}` : '')).join(' · ')}`);
        }
        lines.push(``);
      }
    }

    // Announcements
    const anns = (bulletin.announcements ?? []).filter(a => a.text?.trim());
    if (anns.length) {
      lines.push(`━━━━━━━━━━━━━━━`, ``, `📢 *Announcements*`, ``);
      for (const a of anns) lines.push(`• ${a.text}`);
      lines.push(``);
    }

    return lines.join('\n');
  }

  /* ── Private send helpers ───────────────────────────────── */

  /** Sends a PDF document with a caption. Returns message_id. */
  async _sendDocument(pdfBlob, caption) {
    const form = new FormData();
    form.append('chat_id',    this.chatId);
    form.append('document',   pdfBlob, 'weekly-bulletin.pdf');
    form.append('caption',    caption.slice(0, 1024));
    form.append('parse_mode', 'Markdown');
    const res = await fetch(`${this.base}/sendDocument`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Telegram sendDocument error: ${res.statusText}`);
    const data = await res.json();
    return data.result?.message_id ?? null;
  }

  /** Sends a text message. Returns message_id. */
  async _sendMessage(text) {
    const form = new FormData();
    form.append('chat_id',    this.chatId);
    form.append('text',       text.slice(0, 4096));
    form.append('parse_mode', 'Markdown');
    const res = await fetch(`${this.base}/sendMessage`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Telegram sendMessage error: ${res.statusText}`);
    const data = await res.json();
    return data.result?.message_id ?? null;
  }

  /**
   * Splits long text on newlines to stay under Telegram's 4096-char limit.
   * Returns array of message_ids.
   */
  async _sendLongMessage(text) {
    const LIMIT = 4000;
    const ids   = [];

    if (text.length <= LIMIT) {
      const id = await this._sendMessage(text);
      if (id) ids.push(id);
      return ids;
    }

    const chunks = [];
    let current  = '';
    for (const line of text.split('\n')) {
      const candidate = current ? `${current}\n${line}` : line;
      if (candidate.length > LIMIT) {
        if (current) chunks.push(current.trim());
        current = line;
      } else {
        current = candidate;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    for (const chunk of chunks) {
      const id = await this._sendMessage(chunk);
      if (id) ids.push(id);
    }
    return ids;
  }
}