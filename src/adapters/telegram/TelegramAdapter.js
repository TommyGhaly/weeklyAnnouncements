import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { NotificationPort } from '../../core/ports/NotificationPort';
import { CHURCH_NAME } from '../../core/domain/Bulletin';

export class TelegramAdapter extends NotificationPort {
  constructor(devMode = false) {
    super();
    this.token  = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    this.chatId = devMode
      ? import.meta.env.VITE_TELEGRAM_CHAT_ID_TEST
      : import.meta.env.VITE_TELEGRAM_CHAT_ID_REAL;
    this.base = `https://api.telegram.org/bot${this.token}`;
  }

  static async create() {
    try {
      const snap = await getDoc(doc(db, 'config', 'app'));
      const devMode = snap.exists() ? (snap.data().devMode ?? false) : false;
      return new TelegramAdapter(devMode);
    } catch (e) {
      const devMode = import.meta.env.VITE_TELEGRAM_USE_REAL !== 'true';
      return new TelegramAdapter(devMode);
    }
  }

  // ─── PUBLISH ───────────────────────────────────────────────

  async publish(bulletin, pdfBlob) {
    const ids = [];
    const digest = this.formatDigest(bulletin);
    const header = `✝ *${CHURCH_NAME}* — ${bulletin.presetName}\n🗓 Week of ${bulletin.weekLabel}`;

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

  async publishAnnouncements(bulletin) {
    const anns = (bulletin.announcements ?? []).filter(a => a.text?.trim());
    if (!anns.length) return [];
    const ids = [];

    // Announcements with images: send as photo+caption (no repeat in text block)
    const withImage    = anns.filter(a => a.image);
    const withoutImage = anns.filter(a => !a.image);

    for (const a of withImage) {
      const caption = `• ${a.text}`;
      if (caption.length <= 1024) {
        const id = await this._sendPhoto(a.image, caption);
        if (id) ids.push(id);
      } else {
        // Photo with truncated caption + full text as follow-up message
        const id = await this._sendPhoto(a.image, caption.slice(0, 1021) + '…');
        if (id) ids.push(id);
        const tid = await this._sendMessage(caption);
        if (tid) ids.push(tid);
      }
    }

    // Text-only announcements go in one message block
    if (withoutImage.length) {
      const lines = [
        `✝ *${CHURCH_NAME}*`,
        ``,
        `📢 *Announcements*`,
        ``,
        ...withoutImage.map(a => `• ${a.text}`),
      ];
      const textIds = await this._sendLongMessage(lines.join('\n'));
      ids.push(...textIds);
    }

    return ids;
  }

  // ─── SEND HELPERS ──────────────────────────────────────────

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

  async _sendPhoto(url, caption) {
    const form = new FormData();
    form.append('chat_id', this.chatId);
    form.append('photo',   url);
    form.append('caption', caption);
    const res = await fetch(`${this.base}/sendPhoto`, { method: 'POST', body: form });
    if (res.ok) {
      const d = await res.json();
      return d.result?.message_id ?? null;
    }
    try {
      const imgRes = await fetch(url);
      if (!imgRes.ok) throw new Error('Failed to fetch image');
      const blob = await imgRes.blob();
      const ext  = blob.type?.split('/')[1] ?? 'jpg';
      const f2   = new FormData();
      f2.append('chat_id', this.chatId);
      f2.append('photo',   blob, `photo.${ext}`);
      f2.append('caption', caption);
      const r2 = await fetch(`${this.base}/sendPhoto`, { method: 'POST', body: f2 });
      if (!r2.ok) {
        const e = await r2.json().catch(() => ({}));
        throw new Error(e.description || r2.statusText);
      }
      const d2 = await r2.json();
      return d2.result?.message_id ?? null;
    } catch (e) {
      console.error('Telegram photo upload failed:', e);
      return null;
    }
  }

  async _sendDocument(pdfBlob, caption) {
    const form = new FormData();
    form.append('chat_id',    this.chatId);
    form.append('document',   pdfBlob, 'weekly-bulletin.pdf');
    form.append('caption',    caption.slice(0, 1024));
    form.append('parse_mode', 'Markdown');
    const res = await fetch(`${this.base}/sendDocument`, { method: 'POST', body: form });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(`Telegram sendDocument error: ${e.description || res.statusText}`);
    }
    const data = await res.json();
    return data.result?.message_id ?? null;
  }

  async _sendLongMessage(text) {
    const LIMIT = 4000;
    if (text.length <= LIMIT) {
      const id = await this._sendMessage(text);
      return id ? [id] : [];
    }
    const chunks = [];
    let current = '';
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
    const ids = [];
    for (const chunk of chunks) {
      const id = await this._sendMessage(chunk);
      if (id) ids.push(id);
    }
    return ids;
  }

  // ─── EDIT ──────────────────────────────────────────────────

  async editMessageText(messageId, newText) {
    const form = new FormData();
    form.append('chat_id',    this.chatId);
    form.append('message_id', messageId);
    form.append('text',       newText.slice(0, 4096));
    form.append('parse_mode', 'Markdown');
    const res = await fetch(`${this.base}/editMessageText`, { method: 'POST', body: form });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(`Telegram edit error: ${e.description || res.statusText}`);
    }
    return res.json();
  }

  async editMessageCaption(messageId, newCaption) {
    const form = new FormData();
    form.append('chat_id',    this.chatId);
    form.append('message_id', messageId);
    form.append('caption',    newCaption.slice(0, 1024));
    form.append('parse_mode', 'Markdown');
    const res = await fetch(`${this.base}/editMessageCaption`, { method: 'POST', body: form });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(`Telegram edit caption error: ${e.description || res.statusText}`);
    }
    return res.json();
  }

  // ─── DELETE ────────────────────────────────────────────────

  async deleteMessage(messageId) {
    const form = new FormData();
    form.append('chat_id',    this.chatId);
    form.append('message_id', messageId);
    const res = await fetch(`${this.base}/deleteMessage`, { method: 'POST', body: form });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(`Telegram delete error: ${e.description || res.statusText}`);
    }
    return res.json();
  }

  async deleteMessages(messageIds) {
    const results = [];
    for (const id of messageIds) {
      try {
        await this.deleteMessage(id);
        results.push({ id, deleted: true });
      } catch (e) {
        results.push({ id, deleted: false, error: e.message });
      }
    }
    return results;
  }

  // ─── FORMAT DIGEST ─────────────────────────────────────────

  formatDigest(bulletin) {
    const lines = [
      `✝ *${CHURCH_NAME}*`,
      ``,
      `📋 *${bulletin.presetName ?? 'Weekly Bulletin'}*`,
      `🗓 Week of ${bulletin.weekLabel ?? ''}`,
    ];

    const headerNotes = (bulletin.headerNotes ?? []).filter(n => n.text?.trim());
    if (headerNotes.length) {
      lines.push(``);
      for (const n of headerNotes) {
        lines.push(`   📌 _${n.text}_`);
      }
    }

    lines.push(``, `━━━━━━━━━━━━━━━`, ``);

    const multiDay = (bulletin.multiDayEvents ?? []).filter(e => e.name);
    if (multiDay.length) {
      lines.push(`🗓 *Upcoming Events*`, ``);
      for (const e of multiDay) {
        const start = e.startDate
          ? new Date(e.startDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          : '';
        const end = e.endDate && e.endDate !== e.startDate
          ? new Date(e.endDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          : '';
        const time = e.time ? ` · ${e.time}${e.timeTo ? `–${e.timeTo}` : ''}` : '';
        lines.push(`   *${e.name}*`);
        lines.push(`   📅 ${end ? `${start} — ${end}` : start}${time}`);
        if (e.notes) lines.push(`   _${e.notes}_`);
        const contacts = e.contacts ?? [];
        if (contacts.length) {
          lines.push(`   👤 ${contacts.map(c => c.name + (c.phone ? ` ${c.phone}` : '')).join(' · ')}`);
        }
        lines.push(``);
      }
      lines.push(`━━━━━━━━━━━━━━━`, ``);
    }

    const anns = (bulletin.announcements ?? []).filter(a => a.text?.trim());
    if (anns.length) {
      lines.push(`📢 *Announcements*`, ``);
      for (const a of anns) lines.push(`   • ${a.text}`);
      lines.push(``, `━━━━━━━━━━━━━━━`, ``);
    }

    for (const day of bulletin.days ?? []) {
      if (!day.events?.length) continue;
      const dateLabel = day.date
        ? new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
        : '';
      lines.push(`📅 *${day.day}${dateLabel ? ` — ${dateLabel}` : ''}*`, ``);
      for (const ev of day.events) {
        const time = ev.time ? `🕐 ${ev.time}${ev.timeTo ? ` → ${ev.timeTo}` : ''}` : '';
        lines.push(`   *${ev.name}*`);
        if (time) lines.push(`   ${time}`);
        if (ev.notes) lines.push(`   _${ev.notes}_`);
        for (const c of ev.contacts ?? []) {
          if (c.name || c.phone) lines.push(`   📞 ${c.name}${c.phone ? ` · ${c.phone}` : ''}`);
        }
        lines.push(``);
      }
      lines.push(`━━━━━━━━━━━━━━━━━━━━`, ``);
    }

    return lines.join('\n');
  }
}