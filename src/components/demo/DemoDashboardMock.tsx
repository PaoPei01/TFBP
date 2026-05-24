import type { ReactNode } from 'react';

type DemoDashboardMockProps = {
  title: string;
  children: ReactNode;
};

export function DemoDashboardMock({ title, children }: DemoDashboardMockProps) {
  return (
    <div className="demo-dashboard-mock">
      <div className="demo-dashboard-topbar">
        <span />
        <strong>{title}</strong>
        <em>Demo</em>
      </div>
      <div className="demo-dashboard-body">
        {children}
      </div>
    </div>
  );
}
