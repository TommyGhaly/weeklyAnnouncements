import { ExportPort } from '../../core/ports/ExportPort';

export class PlainTextExporter extends ExportPort {
  async export(bulletin) {
    const lines = [`📋 ${bulletin.presetName}\n`];

    for (const slide of bulletin.slides) {
      switch (slide.type) {
        case 'schedule':
          lines.push('SCHEDULE');
          slide.data.items?.forEach(i => lines.push(`  ${i.time} — ${i.label}`));
          lines.push('');
          break;
        case 'announcement':
          lines.push('ANNOUNCEMENTS');
          slide.data.items?.forEach(i => lines.push(`  • ${i}`));
          lines.push('');
          break;
        case 'custom':
          lines.push(slide.data.title);
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