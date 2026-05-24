import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({ variant = 'primary', size = 'md', fullWidth = false, loading = false, icon, className = '', children, disabled, ...props }: ButtonProps) {
  const ariaLabel = props['aria-label'] ?? (!children && typeof props.title === 'string' ? props.title : undefined);

  return (
    <button className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${loading ? 'btn-loading' : ''} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...props} aria-label={ariaLabel}>
      {loading ? <span className="btn-spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}
