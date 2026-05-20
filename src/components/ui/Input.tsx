import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  inputClassName?: string;
};

export function Input({ label, hint, error, id, className = '', inputClassName = '', ...props }: InputProps) {
  const inputId = id ?? props.name ?? label;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <label className={`field ${className}`} htmlFor={inputId}>
      <span>{label}</span>
      <input id={inputId} className={inputClassName} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy} {...props} />
      {hint ? <small id={hintId}>{hint}</small> : null}
      {error ? <small id={errorId} className="field-error">{error}</small> : null}
    </label>
  );
}
