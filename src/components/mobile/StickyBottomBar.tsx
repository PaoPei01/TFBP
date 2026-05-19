import type { ReactNode } from 'react';

type StickyBottomBarProps = {
  children: ReactNode;
  className?: string;
  label?: string;
};

export function StickyBottomBar({ children, className = '', label }: StickyBottomBarProps) {
  return (
    <div className={`sticky-bottom-bar ${className}`} aria-label={label}>
      {children}
    </div>
  );
}
