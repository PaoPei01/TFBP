import { X } from 'lucide-react';
import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useFocusTrap } from '../../hooks/useFocusTrap';

type MobileMoreMenuProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function MobileMoreMenu({ open, title, children, onClose }: MobileMoreMenuProps) {
  const { language } = useLanguage();
  const titleId = useId();
  const sheetRef = useRef<HTMLElement>(null);
  useBodyScrollLock(open);
  useFocusTrap(open, sheetRef, onClose, 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');

  if (!open) return null;
  return (
    <div
      className="mobile-more-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      onTouchMove={(event) => event.target === event.currentTarget && event.preventDefault()}
    >
      <section className="mobile-more-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={sheetRef}>
        <div className="mobile-more-head">
          <strong id={titleId}>{title}</strong>
          <Button variant="ghost" size="sm" aria-label={language === 'th' ? 'ปิดเมนู' : 'Close menu'} icon={<X size={18} />} onClick={onClose} />
        </div>
        <div
          className="mobile-more-grid"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a,button')) onClose();
          }}
        >
          {children}
        </div>
      </section>
    </div>
  );
}
