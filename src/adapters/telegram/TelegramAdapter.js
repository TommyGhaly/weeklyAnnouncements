import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { NotificationPort } from '../../core/ports/NotificationPort';
import { CHURCH_NAME } from '../../core/domain/Bulletin';

const DIV = '━━━━━━━━━━━━━━━';

// A published bulletin is tracked as [{ id, kind }] so a re-publish can edit
// each message in place instead of deleting and resending. Sessions published
// before that stored a flat array of ids with the document first —
// normalizeRecords upgrades those shapes on read.
export function normalizeRecords(stored = []) {
  return (stored ?? [])
    .map((entry, i) =>
      entry && typeof entry === 'object'
        ? { id: entry.id, kind: entry.kind ?? 'text' }
        : { id: entry, kind: i === 0 ? 'document' : 'text' }
    )
    .filter(r => r.id != null);
}

export function recordIds(stored = []) {
  return normalizeRecords(stored).map(r => r.id);
}

export class TelegramAdapter extends NotificationPort {
  constructor(devMode = false) {
    super();
    this.token      = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    this.chatId     = devMode
      ? import.meta.env.VITE_TELEGRAM_CHAT_ID_TEST
      : import.meta.env.VITE_TELEGRAM_CHAT_ID_REAL;
    this.homlyChatId = devMode
      ? import.meta.env.VITE_TELEGRAM_CHAT_ID_TEST
      : import.meta.env.VITE_TELEGRAM_HOMILY_CHAT_ID;
    this.base = `https://api.telegram.org/bot${this.token}`;
  }

  static async create() {
    try {
      const snap = await getDoc(doc(db, 'config', 'app'));
      const devMode = snap.exists() ? (snap.data().devMode ?? false) : false;
      return new TelegramAdapter(devMode);
    } catch {
      const devMode = import.meta.env.VITE_TELEGRAM_USE_REAL !== 'true';
      return new TelegramAdapter(devMode);
    }
  }

  // ─── PUBLISH ───────────────────────────────────────────────

  async publish(bulletin, pdfBlob, { includeAnnouncements = true } = {}) {
    const records = [];
    const digest   = this.formatDigest(this._filter(bulletin, includeAnnouncements));
    const filename = this._bulletinFilename(bulletin);

    const docId = await this._sendDocument(pdfBlob, filename, '');
    if (docId) records.push({ id: docId, kind: 'document' });
    for (const id of await this._sendLongMessage(digest)) {
      records.push({ id, kind: 'text' });
    }

    return records;
  }

  // Re-publish by editing the already-sent messages in place. Returns null when
  // the new digest needs more text messages than are in the channel — the extra
  // ones would land below whatever has been posted since, so the caller falls
  // back to delete-and-resend rather than leaving the bulletin out of order.
  async republish(bulletin, pdfBlob, stored, { includeAnnouncements = true } = {}) {
    const prev  = normalizeRecords(stored);
    const docs  = prev.filter(r => r.kind === 'document');
    const texts = prev.filter(r => r.kind === 'text');
    if (!docs.length) return null;

    const chunks = this._chunkText(this.formatDigest(this._filter(bulletin, includeAnnouncements)));
    if (chunks.length > texts.length) return null;

    await this.editMessageDocument(docs[0].id, pdfBlob, this._bulletinFilename(bulletin));
    for (let i = 0; i < chunks.length; i++) {
      await this.editMessageText(texts[i].id, chunks[i]);
    }

    // Trim messages the shorter bulletin no longer fills. A failure here is the
    // 48-hour delete window, not a publish failure — the edits already landed.
    const stale = [...docs.slice(1), ...texts.slice(chunks.length)];
    let removed = 0;
    for (const r of stale) {
      try { await this.deleteMessage(r.id); removed++; } catch { /* too old to delete */ }
    }

    return {
      records: [
        { id: docs[0].id, kind: 'document' },
        ...chunks.map((_, i) => ({ id: texts[i].id, kind: 'text' })),
      ],
      edited: 1 + chunks.length,
      removed,
    };
  }

  _filter(bulletin, includeAnnouncements) {
    return includeAnnouncements ? bulletin : { ...bulletin, announcements: [] };
  }

  _bulletinFilename(bulletin) {
    return `${bulletin.presetName ?? 'Weekly Bulletin'}.pdf`;
  }

  async publishAnnouncements(bulletin) {
    const anns = (bulletin.announcements ?? []).filter(a => a.text?.trim());
    if (!anns.length) return [];
    const ids = [];

    const withImage    = anns.filter(a => a.image);
    const withoutImage = anns.filter(a => !a.image);

    for (const a of withImage) {
      const caption = `• ${a.text}`;
      if (caption.length <= 1024) {
        const id = await this._sendPhoto(a.image, caption);
        if (id) ids.push(id);
      } else {
        const id = await this._sendPhoto(a.image, caption.slice(0, 1021) + '…');
        if (id) ids.push(id);
        const tid = await this._sendMessage(caption);
        if (tid) ids.push(tid);
      }
    }

    if (withoutImage.length) {
      const lines = [
        `✝ *${CHURCH_NAME}*`,
        ``,
        `*Announcements*`,
        ...withoutImage.map(a => `• ${a.text}`),
      ];
      const textIds = await this._sendLongMessage(lines.join('\n'));
      ids.push(...textIds);
    }

    return ids;
  }

  async publishHomily(bulletin, pdfBlob, filteredBulletin) {
    const digest   = this.formatDigest(filteredBulletin);
    const filename = `${bulletin.presetName ?? 'Homily'}.pdf`;

    const mainChatId = this.chatId;
    this.chatId      = this.homlyChatId;

    const ids = [];
    try {
      const docId = await this._sendDocument(pdfBlob, filename, '');
      if (docId) ids.push(docId);
      const msgIds = await this._sendLongMessage(digest);
      ids.push(...msgIds);
    } finally {
      this.chatId = mainChatId;
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

  async _sendDocument(pdfBlob, filename, caption) {
    const form = new FormData();
    form.append('chat_id',  this.chatId);
    form.append('document', pdfBlob, filename);
    if (caption) {
      form.append('caption',    caption.slice(0, 1024));
      form.append('parse_mode', 'Markdown');
    }
    const res = await fetch(`${this.base}/sendDocument`, { method: 'POST', body: form });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(`Telegram sendDocument error: ${e.description || res.statusText}`);
    }
    const data = await res.json();
    return data.result?.message_id ?? null;
  }

  // Split on line boundaries so re-publishing the same bulletin produces the
  // same chunks, and an unchanged message edits to an identical body.
  _chunkText(text) {
    const LIMIT = 4000;
    if (text.length <= LIMIT) return [text];
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
    return chunks;
  }

  async _sendLongMessage(text) {
    const ids = [];
    for (const chunk of this._chunkText(text)) {
      const id = await this._sendMessage(chunk);
      if (id) ids.push(id);
    }
    return ids;
  }

  // ─── EDIT ──────────────────────────────────────────────────

  // Editing a bulletin the bot sent has no 48-hour cutoff the way deleting
  // does, so this path still works on messages too old to undo.
  async _edit(method, form) {
    const res  = await fetch(`${this.base}/${method}`, { method: 'POST', body: form });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { changed: true };
    const desc = data.description || res.statusText;
    // Telegram rejects a no-op edit; an unchanged bulletin is still a success.
    if (/message is not modified/i.test(desc)) return { changed: false };
    throw new Error(`Telegram ${method} error: ${desc}`);
  }

  async editMessageText(messageId, newText) {
    const form = new FormData();
    form.append('chat_id',    this.chatId);
    form.append('message_id', messageId);
    form.append('text',       newText.slice(0, 4096));
    form.append('parse_mode', 'Markdown');
    return this._edit('editMessageText', form);
  }

  async editMessageCaption(messageId, newCaption) {
    const form = new FormData();
    form.append('chat_id',    this.chatId);
    form.append('message_id', messageId);
    form.append('caption',    newCaption.slice(0, 1024));
    form.append('parse_mode', 'Markdown');
    return this._edit('editMessageCaption', form);
  }

  // Swapping the attached PDF needs editMessageMedia — editMessageText cannot
  // touch a document message, and a document cannot become a text message.
  async editMessageDocument(messageId, pdfBlob, filename, caption = '') {
    const media = { type: 'document', media: 'attach://file' };
    if (caption) {
      media.caption    = caption.slice(0, 1024);
      media.parse_mode = 'Markdown';
    }
    const form = new FormData();
    form.append('chat_id',    this.chatId);
    form.append('message_id', messageId);
    form.append('media',      JSON.stringify(media));
    form.append('file',       pdfBlob, filename);
    return this._edit('editMessageMedia', form);
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
    for (const id of recordIds(messageIds)) {
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
      `*${bulletin.presetName ?? 'Weekly Bulletin'}* · Week of ${bulletin.weekLabel ?? ''}`,
    ];

    const headerNotes = (bulletin.headerNotes ?? []).filter(n => n.text?.trim());
    for (const n of headerNotes) lines.push(`_${n.text}_`);

    lines.push(DIV);

    const multiDay = (bulletin.multiDayEvents ?? []).filter(e => e.name);
    if (multiDay.length) {
      lines.push('*Upcoming*');
      for (const e of multiDay) {
        const start = e.startDate
          ? new Date(e.startDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          : '';
        const end = e.endDate && e.endDate !== e.startDate
          ? new Date(e.endDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          : '';
        const time = e.time ? ` · ${e.time}${e.timeTo ? `–${e.timeTo}` : ''}` : '';
        const when = end ? `${start} — ${end}` : start;
        lines.push(`*${e.name}* — ${when}${time}`);
        if (e.notes) lines.push(`  _${e.notes}_`);
        const contacts = e.contacts ?? [];
        if (contacts.length) {
          lines.push(`  ${contacts.map(c => c.name + (c.phone ? ` ${c.phone}` : '')).join(' · ')}`);
        }
      }
      lines.push(DIV);
    }

    const anns = (bulletin.announcements ?? []).filter(a => a.text?.trim());
    if (anns.length) {
      lines.push('*Announcements*');
      for (const a of anns) lines.push(`• ${a.text}`);
      lines.push(DIV);
    }

    for (const day of bulletin.days ?? []) {
      if (!day.events?.length) continue;
      const dateLabel = day.date
        ? new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
        : '';
      lines.push(`*${day.day}${dateLabel ? ` · ${dateLabel}` : ''}*`);
      for (const ev of day.events) {
        const time = ev.time ? `${ev.time}${ev.timeTo ? `–${ev.timeTo}` : ''}` : '';
        lines.push(`  ${time ? `${time} · ` : ''}*${ev.name}*`);
        if (ev.notes) lines.push(`    _${ev.notes}_`);
        for (const c of ev.contacts ?? []) {
          if (c.name || c.phone) lines.push(`    ${c.name}${c.phone ? ` · ${c.phone}` : ''}`);
        }
      }
      lines.push(DIV);
    }

    return lines.join('\n');
  }
}