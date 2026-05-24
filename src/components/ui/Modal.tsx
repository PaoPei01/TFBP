import { X } from 'lucide-react';
import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { Button } from './Button';

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ open, title, children, onClose }: ModalProps) {
  const { language } = useLanguage();
  const titleId = useId();
  const modalRef = useRef<HTMLElement>(null);
  useBodyScrollLock(open);
  useFocusTrap(open, modalRef, onClose);
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={modalRef}>
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <Button variant="ghost" icon={<X size={18} />} aria-label={language === 'th' ? 'ปิด' : 'Close'} onClick={onClose} />
        </div>
        {children}
      </section>
    </div>
  );
}
