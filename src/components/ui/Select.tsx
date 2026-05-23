import type { SelectHTMLAttributes } from 'react';
import { useLanguage } from '../../context/LanguageContext';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: Array<string | { value: string; label: string }>;
  placeholder?: string;
};

export function Select({ label, options, placeholder, id, className = '', ...props }: SelectProps) {
  const { language } = useLanguage();
  const selectId = id ?? props.name ?? label;
  return (
    <label className={`field ${className}`} htmlFor={selectId}>
      <span>{label}</span>
      <select id={selectId} {...props}>
        <option value="">{placeholder ?? (language === 'th' ? 'โปรดเลือก' : 'Please select')}</option>
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;
          return (
          <option key={value} value={value}>
            {optionLabel}
          </option>
          );
        })}
      </select>
    </label>
  );
}
