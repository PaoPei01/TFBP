import { ArrowRight, X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import type { GuideTopic } from '../../lib/guideContent';
import { getGuideTopicPath } from '../../lib/guideRegistry';
import { Button } from '../ui/Button';

type HelpDrawerProps = {
  open: boolean;
  topic: GuideTopic | null;
  onClose: () => void;
};

export function HelpDrawer({ open, topic, onClose }: HelpDrawerProps) {
  const { language } = useLanguage();
  const titleId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    window.setTimeout(() => drawerRef.current?.focus(), 0);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [onClose, open]);

  if (!open) return null;

  const title = topic ? (language === 'th' ? topic.titleTh : topic.titleEn) : (language === 'th' ? 'ไม่พบหัวข้อวิธีใช้' : 'Help topic not found');
  const summary = topic
    ? (language === 'th' ? topic.quickHelpTh || topic.summaryTh : topic.quickHelpEn || topic.summaryEn)
    : (language === 'th' ? 'หัวข้อนี้ยังไม่มีในคู่มือ กรุณาเปิดศูนย์คู่มือเพื่อค้นหาหัวข้อใกล้เคียง' : 'This help topic is not available yet. Open the Guide Center to find a related topic.');
  const steps = topic ? (language === 'th' ? topic.stepsTh : topic.stepsEn).slice(0, 3) : [];
  const problem = topic ? (language === 'th' ? topic.commonProblemsTh?.[0] : topic.commonProblemsEn?.[0]) : null;
  const fullPath = topic ? getGuideTopicPath(topic.topicId) : '/guide';

  return (
    <div className="help-drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="help-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={drawerRef}>
        <div className="help-drawer-head">
          <div>
            <p className="eyebrow">{language === 'th' ? 'วิธีใช้' : 'Help'}</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <Button variant="ghost" icon={<X size={18} />} aria-label={language === 'th' ? 'ปิดวิธีใช้' : 'Close help'} onClick={onClose} />
        </div>
        <div className="help-drawer-body">
          <p>{summary}</p>
          {steps.length ? (
            <ol className="help-drawer-steps">
              {steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          ) : null}
          {problem ? (
            <div className="help-drawer-problem">
              <strong>{problem.problem}</strong>
              <span>{problem.solution}</span>
            </div>
          ) : null}
        </div>
        <div className="help-drawer-actions">
          <Link className="btn btn-primary" to={fullPath} onClick={onClose}>
            {language === 'th' ? 'อ่านวิธีใช้เต็ม' : 'Read full guide'}
            <ArrowRight size={17} />
          </Link>
          <Button type="button" variant="secondary" onClick={onClose}>{language === 'th' ? 'ปิด' : 'Close'}</Button>
        </div>
      </section>
    </div>
  );
}
