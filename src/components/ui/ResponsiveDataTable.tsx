import type { ReactNode } from 'react';
import { Card } from './Card';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  getKey: (row: T) => string;
  emptyText: string;
  caption?: string;
  ariaLabel?: string;
  density?: 'comfortable' | 'compact';
  stickyHeader?: boolean;
  mobileTitle?: (row: T) => ReactNode;
  mobileSubtitle?: (row: T) => ReactNode;
  mobileMeta?: (row: T) => ReactNode;
  mobileActions?: (row: T) => ReactNode;
  mobileDetailsLabel?: string;
  mobileDefaultOpen?: boolean;
};

export function ResponsiveDataTable<T>({
  rows,
  columns,
  getKey,
  emptyText,
  caption,
  ariaLabel,
  density = 'comfortable',
  stickyHeader = true,
  mobileTitle,
  mobileSubtitle,
  mobileMeta,
  mobileActions,
  mobileDetailsLabel = 'Details',
  mobileDefaultOpen = false,
}: Props<T>) {
  if (!rows.length) {
    return <div className="empty-state">{emptyText}</div>;
  }

  return (
    <>
      <div className={`table-wrap table-${density} ${stickyHeader ? 'table-sticky' : ''}`}>
        <table aria-label={ariaLabel}>
          {caption ? <caption>{caption}</caption> : null}
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getKey(row)}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-list">
        {rows.map((row) => (
          <Card key={getKey(row)} className="mobile-row" variant="soft">
            {mobileTitle || mobileSubtitle || mobileMeta ? (
              <div className="mobile-row-head">
                <div>
                  {mobileTitle ? <strong>{mobileTitle(row)}</strong> : null}
                  {mobileSubtitle ? <span>{mobileSubtitle(row)}</span> : null}
                </div>
                {mobileMeta ? <em>{mobileMeta(row)}</em> : null}
              </div>
            ) : null}
            <details open={mobileDefaultOpen}>
              <summary>{mobileDetailsLabel}</summary>
              {columns.filter((column) => column.key !== 'actions').map((column) => (
                <div key={column.key}>
                  <span>{column.header}</span>
                  <div>{column.render(row)}</div>
                </div>
              ))}
            </details>
            {mobileActions ? <div className="mobile-card-actions">{mobileActions(row)}</div> : columns.find((column) => column.key === 'actions')?.render(row)}
          </Card>
        ))}
      </div>
    </>
  );
}
