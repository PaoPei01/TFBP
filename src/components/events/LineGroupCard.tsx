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

function resolvePublicAssetPath(path?: string) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;

  const cleanPath = path.replace(/^\/+/, '');
  const base = import.meta.env.BASE_URL || '/';

  return `${base.replace(/\/$/, '')}/${cleanPath}`;
}

function withRetryParam(src: string, retryKey: number) {
  if (!retryKey) return src;
  return `${src}${src.includes('?') ? '&' : '?'}v=${retryKey}`;
}

export function LineGroupCard({ label, note, url, qrImagePath, language }: LineGroupCardProps) {
  const [qrError, setQrError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const qrSrc = resolvePublicAssetPath(qrImagePath);

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
      {qrSrc && !qrError ? (
        <img
          key={`${qrSrc}-${retryKey}`}
          className="line-group-qr"
          src={withRetryParam(qrSrc, retryKey)}
          alt={language === 'th' ? 'คิวอาร์โค้ดกลุ่มไลน์สตาฟกิจกรรม' : 'QR code for the staff Line group'}
          onError={() => setQrError(true)}
          onLoad={() => setQrError(false)}
        />
      ) : null}
      {qrSrc && qrError ? (
        <div className="line-group-qr-fallback">
          <p>{language === 'th' ? 'โหลดคิวอาร์โค้ดไม่สำเร็จ กรุณากดปุ่มเข้ากลุ่มไลน์แทน' : 'Could not load the QR code. Please use the Line group button instead.'}</p>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => {
              setQrError(false);
              setRetryKey((current) => current + 1);
            }}
          >
            {language === 'th' ? 'ลองโหลด QR อีกครั้ง' : 'Retry QR'}
          </button>
        </div>
      ) : null}
    </Card>
  );
}
