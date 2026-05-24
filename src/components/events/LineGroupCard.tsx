import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { AppLanguage } from '../../lib/i18n';
import { Card } from '../ui/Card';

type LineGroupCardProps = {
  label: string;
  note: string;
  url: string;
  qrImagePath?: string;
  language: AppLanguage;
};

export function LineGroupCard({ label, note, url, qrImagePath, language }: LineGroupCardProps) {
  const [showQr, setShowQr] = useState(Boolean(qrImagePath));

  return (
    <Card className="line-group-card" variant="soft">
      <div className="line-group-card-copy">
        <strong>{label}</strong>
        <p>{note}</p>
        <a className="btn btn-primary" href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={18} />
          {language === 'th' ? 'เข้ากลุ่มไลน์' : 'Join Line group'}
        </a>
      </div>
      {qrImagePath && showQr ? (
        <img
          className="line-group-qr"
          src={qrImagePath}
          alt={language === 'th' ? 'คิวอาร์โค้ดกลุ่มไลน์สตาฟงานปฐมนิเทศผู้ปกครอง' : 'QR code for the Parent Orientation Staff Line group'}
          onError={() => setShowQr(false)}
        />
      ) : null}
    </Card>
  );
}
