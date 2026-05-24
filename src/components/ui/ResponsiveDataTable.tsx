import type { ReactNode } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from './Card';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  mobileHidden?: boolean;
  mobileLabel?: string;
  priority?: 'primary' | 'secondary' | 'detail';
  align?: 'left' | 'center' | 'right';
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
  getRowTone?: (row: T) => 'normal' | 'warning' | 'danger' | 'success';
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
  mobileDetailsLabel,
  mobileDefaultOpen = false,
  getRowTone,
}: Props<T>) {
  const { language } = useLanguage();
  const detailsLabel = mobileDetailsLabel ?? (language === 'th' ? 'รายละเอียดเพิ่มเติม' : 'More details');

  if (!rows.length) {
    return <div className="empty-state" role="status">{emptyText}</div>;
  }

  const mobileColumns = columns.filter((column) => column.key !== 'actions' && !column.mobileHidden);
  const mobilePrimaryColumns = mobileColumns.filter((column) => column.priority === 'primary');
  const mobileSecondaryColumns = mobileColumns.filter((column) => column.priority === 'secondary');
  const fallbackSummaryColumns = !mobileTitle && !mobileSubtitle && !mobileMeta && !mobilePrimaryColumns.length && !mobileSecondaryColumns.length
    ? mobileColumns.slice(0, 2)
    : [];
  const fallbackSummaryKeys = new Set(fallbackSummaryColumns.map((column) => column.key));
  const mobileDetailColumns = mobileColumns.filter((column) => !fallbackSummaryKeys.has(column.key) && (!column.priority || column.priority === 'detail'));
  const actionColumn = columns.find((column) => column.key === 'actions');

  return (
    <>
      <div className={`table-wrap table-${density} ${stickyHeader ? 'table-sticky' : ''}`}>
        <table aria-label={ariaLabel}>
          {caption ? <caption>{caption}</caption> : null}
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.align ? `cell-${column.align}` : undefined}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getKey(row)} className={`row-tone-${getRowTone?.(row) ?? 'normal'}`}>
                {columns.map((column) => (
                  <td key={column.key} className={column.align ? `cell-${column.align}` : undefined}>{column.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-list">
        {rows.map((row) => (
          <Card key={getKey(row)} className={`mobile-row row-tone-${getRowTone?.(row) ?? 'normal'}`} variant="soft">
            {mobileTitle || mobileSubtitle || mobileMeta ? (
              <div className="mobile-row-head">
                <div>
                  {mobileTitle ? <strong>{mobileTitle(row)}</strong> : null}
                  {mobileSubtitle ? <span>{mobileSubtitle(row)}</span> : null}
                </div>
                {mobileMeta ? <em>{mobileMeta(row)}</em> : null}
              </div>
            ) : null}
            {mobilePrimaryColumns.length || mobileSecondaryColumns.length ? (
              <div className="mobile-row-summary-grid">
                {[...mobilePrimaryColumns, ...mobileSecondaryColumns].map((column) => (
                  <div key={column.key} className={column.priority ? `mobile-detail-${column.priority}` : undefined}>
                    <span>{column.mobileLabel ?? column.header}</span>
                    <div>{column.render(row)}</div>
                  </div>
                ))}
              </div>
            ) : null}
            {mobileDetailColumns.length ? (
              <details open={mobileDefaultOpen}>
                <summary aria-label={language === 'th' ? 'เปิดรายละเอียดเพิ่มเติมของรายการนี้' : 'Open more details for this record'}>{detailsLabel}</summary>
                {mobileDetailColumns.map((column) => (
                  <div key={column.key} className={column.priority ? `mobile-detail-${column.priority}` : undefined}>
                    <span>{column.mobileLabel ?? column.header}</span>
                    <div>{column.render(row)}</div>
                  </div>
                ))}
              </details>
            ) : null}
            {!mobileTitle && !mobileSubtitle && !mobileMeta && !mobilePrimaryColumns.length && !mobileSecondaryColumns.length && !mobileDetailColumns.length ? (
              <div className="mobile-row-summary-grid">
                {fallbackSummaryColumns.map((column) => (
                  <div key={column.key}>
                  <span>{column.mobileLabel ?? column.header}</span>
                  <div>{column.render(row)}</div>
                  </div>
                ))}
              </div>
            ) : null}
            {mobileActions ? <div className="mobile-card-actions" aria-label={language === 'th' ? 'การทำงานของรายการนี้' : 'Record actions'}>{mobileActions(row)}</div> : actionColumn ? <div className="mobile-card-actions" aria-label={language === 'th' ? 'การทำงานของรายการนี้' : 'Record actions'}>{actionColumn.render(row)}</div> : null}
          </Card>
        ))}
      </div>
    </>
  );
}
