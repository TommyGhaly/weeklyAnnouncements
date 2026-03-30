import { pdf } from '@react-pdf/renderer';
import { ExportPort } from '../../core/ports/ExportPort';
import { BulletinDocument } from '../../ui/components/BulletinDocument';

export class ReactPDFExporter extends ExportPort {
  async export(bulletin) {
    const blob = await pdf(<BulletinDocument bulletin={bulletin} />).toBlob();
    return blob;
  }
}