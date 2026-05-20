import { X } from 'lucide-react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../ui/Button';

type MobileMoreMenuProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function MobileMoreMenu({ open, title, children, onClose }: MobileMoreMenuProps) {
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className="mobile-more-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="mobile-more-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mobile-more-head">
          <strong>{title}</strong>
          <Button variant="ghost" size="sm" aria-label="Close" icon={<X size={18} />} onClick={onClose} />
        </div>
        <div className="mobile-more-grid" onClick={onClose}>{children}</div>
      </section>
    </div>
  );
}
