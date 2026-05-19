import type { ReactNode } from 'react';

type MobileActionSheetProps = {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function MobileActionSheet({ title, children, className = '' }: MobileActionSheetProps) {
  return (
    <div className={`mobile-action-sheet ${className}`}>
      {title ? <strong>{title}</strong> : null}
      <div>{children}</div>
    </div>
  );
}
