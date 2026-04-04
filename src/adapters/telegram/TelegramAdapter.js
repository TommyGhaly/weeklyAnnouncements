import { NotificationPort } from '../../core/ports/NotificationPort';
import { CHURCH_NAME } from '../../core/domain/Bulletin';

export class TelegramAdapter extends NotificationPort {
  constructor() {
    super();
    this.token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    this.chatId = import.meta.env.VITE_TELEGRAM_USE_REAL === 'true'
      ? import.meta.env.VITE_TELEGRAM_CHAT_ID_REAL
      : import.meta.env.VITE_TELEGRAM_CHAT_ID_TEST;
    this.base = `https://api.telegram.org/bot${this.token}`;
  }

  // ─── PUBLISH (returns array of sent message IDs) ───
  async publish(bulletin, pdfBlob) {
    const messageIds = [];

    // Send PDF + digest
    const digest = this.formatDigest(bulletin);
    if (digest.length <= 1024) {
      const id = await this._sendDocument(pdfBlob, digest);
      if (id) messageIds.push(id);
    } else {
      const id = await this._sendDocument(
        pdfBlob,
        `✝ *${CHURCH_NAME}* — ${bulletin.presetName}\n🗓 Week of ${bulletin.weekLabel}`
      );
      if (id) messageIds.push(id);
      const ids = await this._sendLongMessage(digest);
      messageIds.push(...ids);
    }

    return messageIds;
  }

  // ─── SEND HELPERS (all return message_id) ───
  async _sendMessage(text) {
    const form = new FormData();
    form.append('chat_id', this.chatId);
    form.append('text', text.slice(0, 4096));
    form.append('parse_mode', 'Markdown');
    const res = await fetch(`${this.base}/sendMessage`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Telegram message error: ${res.statusText}`);
    const data = await res.json();
    return data.result?.message_id ?? null;
  }

  async _sendPhoto(url, caption) {
    // Try URL first, if it fails download and send as file upload
    const form = new FormData();
    form.append('chat_id', this.chatId);
    form.append('photo', url);
    form.append('caption', caption);
    const res = await fetch(`${this.base}/sendPhoto`, { method: 'POST', body: form });
    if (res.ok) {
      const data = await res.json();
      return data.result?.message_id ?? null;
    }

    // Fallback: fetch the image and upload as a file
    try {
      const imgRes = await fetch(url);
      if (!imgRes.ok) throw new Error('Failed to fetch image');
      const blob = await imgRes.blob();
      const ext = blob.type?.split('/')[1] ?? 'jpg';
      const form2 = new FormData();
      form2.append('chat_id', this.chatId);
      form2.append('photo', blob, `photo.${ext}`);
      form2.append('caption', caption);
      const res2 = await fetch(`${this.base}/sendPhoto`, { method: 'POST', body: form2 });
      if (!res2.ok) {
        const err = await res2.json().catch(() => ({}));
        throw new Error(err.description || res2.statusText);
      }
      const data2 = await res2.json();
      return data2.result?.message_id ?? null;
    } catch (e) {
      console.error('Telegram photo upload failed:', e);
      // Non-fatal — skip the photo and continue
      return null;
    }
  }

  async _sendDocument(pdfBlob, caption) {
    const form = new FormData();
    form.append('chat_id', this.chatId);
    form.append('document', pdfBlob, 'weekly-bulletin.pdf');
    form.append('caption', caption.slice(0, 1024));
    form.append('parse_mode', 'Markdown');
    const res = await fetch(`${this.base}/sendDocument`, { method: 'POST', body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Telegram sendDocument error:', err);
      throw new Error(`Telegram document error: ${err.description || res.statusText}`);
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
      if ((current + '\n' + line).length > LIMIT) {
        if (current) chunks.push(current.trim());
        current = line;
      } else {
        current += (current ? '\n' : '') + line;
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

  // ─── EDIT ───
  async editMessageText(messageId, newText) {
    const form = new FormData();
    form.append('chat_id', this.chatId);
    form.append('message_id', messageId);
    form.append('text', newText.slice(0, 4096));
    form.append('parse_mode', 'Markdown');
    const res = await fetch(`${this.base}/editMessageText`, { method: 'POST', body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Telegram edit error: ${err.description || res.statusText}`);
    }
    return res.json();
  }

  async editMessageCaption(messageId, newCaption) {
    const form = new FormData();
    form.append('chat_id', this.chatId);
    form.append('message_id', messageId);
    form.append('caption', newCaption.slice(0, 1024));
    form.append('parse_mode', 'Markdown');
    const res = await fetch(`${this.base}/editMessageCaption`, { method: 'POST', body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Telegram edit caption error: ${err.description || res.statusText}`);
    }
    return res.json();
  }

  // ─── DELETE ───
  async deleteMessage(messageId) {
    const form = new FormData();
    form.append('chat_id', this.chatId);
    form.append('message_id', messageId);
    const res = await fetch(`${this.base}/deleteMessage`, { method: 'POST', body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Telegram delete error: ${err.description || res.statusText}`);
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

  // ─── GET RECENT BOT MESSAGES (for finding last sent bulletin) ───
  async getRecentBotMessages(limit = 20) {
    // Telegram doesn't have a "get messages" API for channels,
    // so we track message IDs at send time instead.
    // This method is here as a fallback using getUpdates for the bot's own messages.
    const res = await fetch(`${this.base}/getUpdates?limit=${limit}&allowed_updates=["channel_post"]`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.result ?? [])
      .filter(u => u.channel_post?.chat?.id === Number(this.chatId))
      .map(u => ({
        messageId: u.channel_post.message_id,
        date: u.channel_post.date,
        text: u.channel_post.text || u.channel_post.caption || '',
        hasDocument: !!u.channel_post.document,
        hasPhoto: !!u.channel_post.photo,
      }))
      .reverse();
  }

  // ─── FORMAT ───
  formatDigest(bulletin) {
    const lines = [
      `✝ *${CHURCH_NAME}*`,
      ``,
      `📋 *${bulletin.presetName}*`,
      `🗓 Week of ${bulletin.weekLabel}`,
    ];

    const headerNotes = (bulletin.headerNotes ?? []).filter(n => n.text?.trim());
    if (headerNotes.length > 0) {
      lines.push(``);
      for (const n of headerNotes) {
        lines.push(`   📌 _${n.text}_`);
      }
    }

    lines.push(``);
    lines.push(`━━━━━━━━━━━━━━━`);
    lines.push(``);

    const multiDay = bulletin.multiDayEvents ?? [];
    if (multiDay.length > 0) {
      lines.push(`🗓 *Upcoming Events*`);
      lines.push(``);
      for (const e of multiDay) {
        const start = e.startDate
          ? new Date(e.startDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          : '';
        const end = e.endDate && e.endDate !== e.startDate
          ? new Date(e.endDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          : '';
        const dateRange = end ? `${start} — ${end}` : start;
        const time = e.time ? ` · ${e.time}${e.timeTo ? `–${e.timeTo}` : ''}` : '';
        lines.push(`   *${e.name}*`);
        lines.push(`   📅 ${dateRange}${time}`);
        if (e.notes) lines.push(`   _${e.notes}_`);
        lines.push(``);
      }
      lines.push(`━━━━━━━━━━━━━━━`);
      lines.push(``);
    }

    const announcements = (bulletin.announcements ?? []).filter(a => a.text?.trim());
    if (announcements.length > 0) {
      lines.push(`📢 *Announcements*`);
      lines.push(``);
      for (const a of announcements) {
        lines.push(`   • ${a.text}`);
      }
      lines.push(``);
      lines.push(`━━━━━━━━━━━━━━━`);
      lines.push(``);
    }

    for (const day of bulletin.days ?? []) {
      if (!day.events?.length) continue;
      const dateLabel = day.date
        ? new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
        : '';

      lines.push(`📅 *${day.day}${dateLabel ? ` — ${dateLabel}` : ''}*`);
      lines.push(``);

      for (const e of day.events) {
        const time = e.time
          ? `🕐 ${e.time}${e.timeTo ? ` → ${e.timeTo}` : ''}`
          : '';
        lines.push(`   *${e.name}*`);
        if (time) lines.push(`   ${time}`);
        if (e.notes) lines.push(`   _${e.notes}_`);
        for (const c of e.contacts ?? []) {
          if (!c.name && !c.phone) continue;
          lines.push(`   📞 ${c.name}${c.phone ? ` · ${c.phone}` : ''}`);
        }
        lines.push(``);
      }

      lines.push(`━━━━━━━━━━━━━━━━━━━━`);
      lines.push(``);
    }

    return lines.join('\n');
  }
}