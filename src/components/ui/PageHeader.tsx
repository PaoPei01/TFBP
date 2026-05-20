import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
};

export function PageHeader({ eyebrow, title, description, meta, actions, compact = false }: PageHeaderProps) {
  return (
    <header className={`page-header ${compact ? 'page-header-compact' : ''}`}>
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {meta || actions ? <div className="page-header-meta">{meta}{actions ? <div className="page-header-actions">{actions}</div> : null}</div> : null}
    </header>
  );
}
