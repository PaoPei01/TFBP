import type { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'elevated' | 'soft' | 'warning' | 'danger' | 'success';
};

export function Card({ className = '', variant = 'default', ...props }: CardProps) {
  return <div className={`glass-card card-${variant} ${className}`} {...props} />;
}
