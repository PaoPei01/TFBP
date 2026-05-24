import type { ReactNode } from 'react';

type DemoPhoneMockProps = {
  title: string;
  children: ReactNode;
};

export function DemoPhoneMock({ title, children }: DemoPhoneMockProps) {
  return (
    <div className="demo-phone-mock" aria-label={title}>
      <div className="demo-phone-speaker" />
      <div className="demo-phone-screen">
        <strong>{title}</strong>
        {children}
      </div>
    </div>
  );
}
