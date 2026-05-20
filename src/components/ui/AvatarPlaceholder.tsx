import { UserRound } from 'lucide-react';
import { useState } from 'react';

type AvatarPlaceholderProps = {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

function initials(name?: string | null) {
  const text = String(name ?? '').trim();
  if (!text) return '';
  const parts = text.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]).join('').toUpperCase();
}

export function AvatarPlaceholder({ src, name, size = 'md', className = '' }: AvatarPlaceholderProps) {
  const [failed, setFailed] = useState(false);
  const label = initials(name);
  return (
    <div className={`avatar-placeholder avatar-${size} ${className}`} aria-hidden="true">
      {src && !failed ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : label ? <span>{label}</span> : <UserRound size={size === 'lg' ? 34 : 22} />}
    </div>
  );
}
