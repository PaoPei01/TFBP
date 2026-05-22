import { CircleHelp } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { getGuideTopicById, getGuideTopicPath } from '../../lib/guideRegistry';
import { HelpDrawer } from './HelpDrawer';

type HelpButtonProps = {
  topicId: string;
  variant?: 'icon' | 'link' | 'compact';
  label?: string;
  placement?: 'inline' | 'section-header';
  showFullGuideDirectly?: boolean;
  className?: string;
};

export function HelpButton({ topicId, variant = 'icon', label, placement = 'inline', showFullGuideDirectly = false, className = '' }: HelpButtonProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const topic = getGuideTopicById(topicId);
  const text = label ?? (language === 'th' ? 'ดูวิธีใช้' : 'Open help');

  function handleClick() {
    if (showFullGuideDirectly) {
      navigate(topic ? getGuideTopicPath(topic.topicId) : '/guide');
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button
        className={`help-button help-button-${variant} help-button-${placement} ${className}`}
        type="button"
        aria-label={text}
        title={text}
        onClick={handleClick}
      >
        <CircleHelp size={variant === 'link' ? 17 : 18} aria-hidden="true" />
        {variant !== 'icon' ? <span>{text}</span> : null}
      </button>
      <HelpDrawer open={open} topic={topic} onClose={() => setOpen(false)} />
    </>
  );
}
