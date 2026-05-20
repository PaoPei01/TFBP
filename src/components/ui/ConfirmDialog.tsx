import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from './Button';
import { Modal } from './Modal';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  variant?: 'danger' | 'primary';
  requireText?: string;
};

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onClose, variant = 'danger', requireText }: ConfirmDialogProps) {
  const { language } = useLanguage();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const canConfirm = useMemo(() => !requireText || value.trim() === requireText, [requireText, value]);

  useEffect(() => {
    if (!open) setValue('');
    if (open && requireText) window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [open, requireText]);

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="modal-body confirm-dialog">
        <p>{message}</p>
        {requireText ? (
          <label className="field">
            <span>{language === 'th' ? `พิมพ์ ${requireText} เพื่อยืนยัน` : `Type ${requireText} to confirm`}</span>
            <input ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} />
          </label>
        ) : null}
        <div className="form-actions">
          <Button variant={variant} disabled={!canConfirm} onClick={onConfirm}>{confirmLabel}</Button>
          <Button variant="secondary" onClick={onClose}>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</Button>
        </div>
      </div>
    </Modal>
  );
}
