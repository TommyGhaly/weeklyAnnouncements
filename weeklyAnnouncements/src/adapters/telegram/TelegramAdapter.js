import { NotificationPort } from '../../core/ports/NotificationPort';

export class TelegramAdapter extends NotificationPort {
  constructor() {
    super();
    this.token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    this.chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
    this.base = `https://api.telegram.org/bot${this.token}`;
  }

  async publish(bulletin, pdfBlob) {
    const caption = this.formatDigest(bulletin);
    const form = new FormData();
    form.append('chat_id', this.chatId);
    form.append('document', pdfBlob, 'bulletin.pdf');
    form.append('caption', caption);
    form.append('parse_mode', 'Markdown');

    const res = await fetch(`${this.base}/sendDocument`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) throw new Error(`Telegram error: ${res.statusText}`);
    return res.json();
  }

  formatDigest(bulletin) {
    const lines = [`📋 *${bulletin.presetName}*\n`];

    for (const slide of bulletin.slides) {
      switch (slide.type) {
        case 'schedule':
          lines.push('🕐 *Schedule*');
          slide.data.items?.forEach(i => lines.push(`${i.time} — ${i.label}`));
          lines.push('');
          break;
        case 'announcement':
          lines.push('📢 *Announcements*');
          slide.data.items?.forEach(i => lines.push(`• ${i}`));
          lines.push('');
          break;
        case 'custom':
          lines.push(`*${slide.data.title}*`);
          lines.push(slide.data.body);
          lines.push('');
          break;
        case 'image':
          break;
      }
    }

    return lines.join('\n');
  }
}