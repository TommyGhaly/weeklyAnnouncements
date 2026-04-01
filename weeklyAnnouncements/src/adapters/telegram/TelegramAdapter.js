import { NotificationPort } from '../../core/ports/NotificationPort';
import { CHURCH_NAME } from '../../core/domain/Bulletin';

export class TelegramAdapter extends NotificationPort {
  constructor() {
    super();
    this.token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    this.chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
    this.base = `https://api.telegram.org/bot${this.token}`;
  }

  async publish(bulletin, pdfBlob) {
    // 1. Send each uploaded image first
    for (const img of bulletin.images ?? []) {
      if (!img.url) continue;
      await this._sendPhoto(img.url, img.caption ?? '');
    }

    // 2. Send PDF with digest split across messages if needed
    const digest = this.formatDigest(bulletin);
    if (digest.length <= 1024) {
      await this._sendDocument(pdfBlob, digest);
    } else {
      await this._sendDocument(pdfBlob, `✝ *${CHURCH_NAME}* — ${bulletin.presetName}\n🗓 Week of ${bulletin.weekLabel}`);
      await this._sendLongMessage(digest);
    }
  }

  async _sendLongMessage(text) {
    const LIMIT = 4000;
    if (text.length <= LIMIT) {
      await this._sendMessage(text);
      return;
    }
    // Split on day dividers to keep sections intact
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
    for (const chunk of chunks) await this._sendMessage(chunk);
  }

  async _sendMessage(text) {
    const form = new FormData();
    form.append('chat_id', this.chatId);
    form.append('text', text.slice(0, 4096));
    form.append('parse_mode', 'Markdown');
    const res = await fetch(`${this.base}/sendMessage`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Telegram message error: ${res.statusText}`);
  }

  async _sendPhoto(url, caption) {
    const form = new FormData();
    form.append('chat_id', this.chatId);
    form.append('photo', url);
    form.append('caption', caption);
    const res = await fetch(`${this.base}/sendPhoto`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Telegram photo error: ${res.statusText}`);
  }

  async _sendDocument(pdfBlob, caption) {
    const form = new FormData();
    form.append('chat_id', this.chatId);
    form.append('document', pdfBlob, 'weekly-bulletin.pdf');
    form.append('caption', caption.slice(0, 1024)); // Telegram caption limit
    form.append('parse_mode', 'Markdown');
    const res = await fetch(`${this.base}/sendDocument`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Telegram document error: ${res.statusText}`);
  }

  formatDigest(bulletin) {
    const lines = [
      `✝ *${CHURCH_NAME}*`,
      ``,
      `📋 *${bulletin.presetName}*`,
      `🗓 Week of ${bulletin.weekLabel}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━`,
      ``,
    ];

    // Multi-day events
    const multiDay = bulletin.multiDayEvents ?? [];
    if (multiDay.length > 0) {
      lines.push(`🗓 *Upcoming Events*`);
      lines.push(``);
      for (const e of multiDay) {
        const start = e.startDate ? new Date(e.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        const end = e.endDate && e.endDate !== e.startDate ? new Date(e.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        lines.push(`   *${e.name}*`);
        if (start) lines.push(`   📅 ${start}${end ? ` → ${end}` : ''}`);
        if (e.time) lines.push(`   🕐 ${e.time}${e.timeTo ? ` → ${e.timeTo}` : ''}`);
        if (e.notes) lines.push(`   _${e.notes}_`);
        lines.push(``);
      }
      lines.push(`━━━━━━━━━━━━━━━━━━━━`);
      lines.push(``);
    }

    // Announcements
    const announcements = (bulletin.announcements ?? []).filter(a => a.text?.trim());
    if (announcements.length > 0) {
      lines.push(`📢 *Announcements*`);
      lines.push(``);
      for (const a of announcements) lines.push(`   • ${a.text}`);
      lines.push(``);
      lines.push(`━━━━━━━━━━━━━━━━━━━━`);
      lines.push(``);
    }

    // Daily schedule
    for (const day of bulletin.days ?? []) {
      if (!day.events?.length) continue;
      const dateLabel = day.date
        ? new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
        : '';
      lines.push(`📅 *${day.day}${dateLabel ? ` — ${dateLabel}` : ''}*`);
      lines.push(``);
      for (const e of day.events) {
        const time = e.time ? `🕐 ${e.time}${e.timeTo ? ` → ${e.timeTo}` : ''}` : '';
        lines.push(`   *${e.name}*`);
        if (time) lines.push(`   ${time}`);
        if (e.notes) lines.push(`   _${e.notes}_`);
        for (const c of e.contacts ?? []) {
          if (!c.name && !c.phone) continue;
          lines.push(`   📞 ${c.name}${c.phone ? ` · ${c.phone}` : ''}`);
        }        lines.push(``);
      }
      lines.push(`━━━━━━━━━━━━━━━━━━━━`);
      lines.push(``);
    }

    return lines.join('\n');
  }
}