import type { ReactNode } from 'react';

export type ToastState = {
  type: 'success' | 'error' | 'info';
  message: string;
} | null;

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.type}`} role="status" aria-live={toast.type === 'error' ? 'assertive' : 'polite'}>
      {toast.message}
    </div>
  );
}

export type ToastSetter = (toast: ToastState) => void;
export type ToastProviderValue = { toast: ToastState; setToast: ToastSetter };
export type WithChildren = { children: ReactNode };
