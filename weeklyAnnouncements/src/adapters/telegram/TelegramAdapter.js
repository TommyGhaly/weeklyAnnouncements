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
      `📋 *${bulletin.presetName}* — ${bulletin.weekLabel}`,
      '',
    ];

    for (const slide of bulletin.slides) {
      switch (slide.type) {
        case 'day':
          lines.push(`*${slide.data.day}*`);
          slide.data.items?.forEach(i => {
            const time = i.time ? `${i.time} ` : '';
            const note = i.note ? ` _(${i.note})_` : '';
            lines.push(`  ${time}${i.label}${note}`);
          });
          lines.push('');
          break;
        case 'announcement':
          lines.push(`📢 *${slide.data.title}*`);
          slide.data.items?.forEach(i => lines.push(`  • ${i}`));
          lines.push('');
          break;
        case 'contact':
          lines.push(`📞 *${slide.data.title}*`);
          slide.data.entries?.forEach(e => {
            lines.push(`  ${e.role ? `_${e.role}_: ` : ''}${e.name} ${e.phone ? `— ${e.phone}` : ''}`);
          });
          lines.push('');
          break;
        case 'event':
          lines.push(`🗓 *${slide.data.title}*`);
          if (slide.data.subtitle) lines.push(`  ${slide.data.subtitle}`);
          if (slide.data.time) lines.push(`  🕐 ${slide.data.time}`);
          if (slide.data.note) lines.push(`  ${slide.data.note}`);
          lines.push('');
          break;
      }
    }

    return lines.join('\n');
  }
}