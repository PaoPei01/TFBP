import type { ReactNode } from 'react';

type MobileSectionProps = {
  title: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function MobileSection({ title, eyebrow, action, children, defaultOpen = true }: MobileSectionProps) {
  return (
    <details className="mobile-section" open={defaultOpen}>
      <summary>
        <div>
          {eyebrow ? <span>{eyebrow}</span> : null}
          <strong>{title}</strong>
        </div>
        {action ? <em>{action}</em> : null}
      </summary>
      <div className="mobile-section-body">{children}</div>
    </details>
  );
}
