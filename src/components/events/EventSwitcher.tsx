import { CalendarDays } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { DEFAULT_EVENT, defaultEventName } from '../../lib/defaultEvent';

type EventSwitcherProps = {
  compact?: boolean;
};

export function EventSwitcher({ compact = false }: EventSwitcherProps) {
  const { language } = useLanguage();
  return (
    <div className={`event-switcher ${compact ? 'event-switcher-compact' : ''}`} aria-label={language === 'th' ? 'กิจกรรมปัจจุบัน' : 'Current event'}>
      <CalendarDays size={18} aria-hidden="true" />
      <div>
        <span>{language === 'th' ? 'กิจกรรมปัจจุบัน' : 'Current event'}</span>
        <strong>{defaultEventName(language)}</strong>
      </div>
      <em>{DEFAULT_EVENT.slug}</em>
    </div>
  );
}
