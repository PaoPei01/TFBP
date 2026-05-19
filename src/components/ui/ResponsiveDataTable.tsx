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
  mobileTitle?: (row: T) => ReactNode;
  mobileSubtitle?: (row: T) => ReactNode;
  mobileMeta?: (row: T) => ReactNode;
  mobileActions?: (row: T) => ReactNode;
  mobileDetailsLabel?: string;
};

export function ResponsiveDataTable<T>({ rows, columns, getKey, emptyText, mobileTitle, mobileSubtitle, mobileMeta, mobileActions, mobileDetailsLabel = 'Details' }: Props<T>) {
  if (!rows.length) {
    return <div className="empty-state">{emptyText}</div>;
  }

  return (
    <>
      <div className="table-wrap">
        <table>
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
          <Card key={getKey(row)} className="mobile-row">
            {mobileTitle || mobileSubtitle || mobileMeta ? (
              <div className="mobile-row-head">
                <div>
                  {mobileTitle ? <strong>{mobileTitle(row)}</strong> : null}
                  {mobileSubtitle ? <span>{mobileSubtitle(row)}</span> : null}
                </div>
                {mobileMeta ? <em>{mobileMeta(row)}</em> : null}
              </div>
            ) : null}
            <details>
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
