import type { HTMLAttributes, ReactNode } from 'react';

type MobileCardProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
};

export function MobileCard({ title, subtitle, meta, actions, children, className = '', ...props }: MobileCardProps) {
  return (
    <div className={`mobile-card ${className}`} {...props}>
      {title || subtitle || meta ? (
        <div className="mobile-card-head">
          <div>
            {title ? <strong>{title}</strong> : null}
            {subtitle ? <span>{subtitle}</span> : null}
          </div>
          {meta ? <em>{meta}</em> : null}
        </div>
      ) : null}
      {children ? <div className="mobile-card-body">{children}</div> : null}
      {actions ? <div className="mobile-card-actions">{actions}</div> : null}
    </div>
  );
}
