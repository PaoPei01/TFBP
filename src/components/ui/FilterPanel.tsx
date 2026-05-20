import type { ReactNode } from 'react';
import { Card } from './Card';

type FilterPanelProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  chips?: ReactNode;
};

export function FilterPanel({ title, description, children, actions, chips }: FilterPanelProps) {
  return (
    <Card className="filter-panel" variant="soft">
      {title || description || actions ? (
        <div className="filter-panel-head">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="filter-panel-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="filter-panel-grid">{children}</div>
      {chips ? <div className="filter-panel-chips">{chips}</div> : null}
    </Card>
  );
}
