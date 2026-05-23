import { SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';

type MobileFilterSheetProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  primaryLabel?: string;
  clearLabel?: string;
  onClose: () => void;
  onClear?: () => void;
};

export function MobileFilterSheet({ open, title, description, children, primaryLabel = 'Apply', clearLabel = 'Clear', onClose, onClear }: MobileFilterSheetProps) {
  const { language } = useLanguage();
  const sheetRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previous?.focus?.();
    };
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className="mobile-filter-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="mobile-filter-sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={sheetRef}>
        <div className="mobile-filter-head">
          <div>
            <span><SlidersHorizontal size={17} /> {title}</span>
            {description ? <small>{description}</small> : null}
          </div>
          <Button variant="ghost" size="sm" aria-label={language === 'th' ? 'ปิดตัวกรอง' : 'Close filters'} icon={<X size={18} />} onClick={onClose} />
        </div>
        <div className="mobile-filter-body">{children}</div>
        <div className="mobile-filter-actions">
          {onClear ? <Button type="button" variant="ghost" onClick={onClear}>{clearLabel}</Button> : null}
          <Button type="button" onClick={onClose}>{primaryLabel}</Button>
        </div>
      </section>
    </div>
  );
}
