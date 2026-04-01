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

    // 2. Send PDF with digest as caption
    await this._sendDocument(pdfBlob, this.formatDigest(bulletin));
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