import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import type { GuideFieldNote, GuideProblem } from '../lib/guideContent';
import {
  categoryTitle,
  getGuideCategory,
  getGuideTopicByRoute,
  getGuideTopicPath,
  getRelatedTopics,
  topicSummary,
  topicTitle,
} from '../lib/guideRegistry';

const audienceLabels = {
  participant: { th: 'ผู้เข้าร่วม', en: 'Participant' },
  staff: { th: 'ทีมงาน', en: 'Staff' },
  admin: { th: 'แอดมิน', en: 'Admin' },
  emergency: { th: 'ทีมฉุกเฉิน', en: 'Emergency' },
} as const;

export function GuideTopicPage() {
  const { category = '', topic: slug = '' } = useParams();
  const { language } = useLanguage();
  const guideTopic = getGuideTopicByRoute(category, slug);
  const guideCategory = getGuideCategory(category);

  if (!guideTopic) {
    return (
      <section className="guide-page page-stack">
        <EmptyState
          title={language === 'th' ? 'ไม่พบหัวข้อวิธีใช้' : 'Guide topic not found'}
          description={language === 'th' ? 'หัวข้อนี้อาจถูกย้ายหรือยังไม่ได้สร้าง' : 'This topic may have moved or has not been created yet.'}
          action={<Link className="btn btn-primary" to="/guide">{language === 'th' ? 'กลับศูนย์คู่มือ' : 'Back to Guide Center'}</Link>}
        />
      </section>
    );
  }

  const title = topicTitle(guideTopic, language);
  const summary = topicSummary(guideTopic, language);
  const whenToUse = language === 'th' ? guideTopic.whenToUseTh ?? [] : guideTopic.whenToUseEn ?? [];
  const steps = language === 'th' ? guideTopic.stepsTh : guideTopic.stepsEn;
  const fieldNotes = language === 'th' ? guideTopic.fieldNotesTh ?? [] : guideTopic.fieldNotesEn ?? [];
  const tips = language === 'th' ? guideTopic.tipsTh ?? [] : guideTopic.tipsEn ?? [];
  const problems = language === 'th' ? guideTopic.commonProblemsTh ?? [] : guideTopic.commonProblemsEn ?? [];
  const related = getRelatedTopics(guideTopic.topicId);
  const categoryName = guideCategory ? categoryTitle(guideCategory, language) : category;

  return (
    <section className="guide-page page-stack guide-topic-page">
      <nav className="guide-breadcrumbs" aria-label={language === 'th' ? 'ตำแหน่งในคู่มือ' : 'Guide breadcrumbs'}>
        <Link to="/guide">{language === 'th' ? 'คู่มือ' : 'Guide'}</Link>
        <span>/</span>
        <Link to={`/guide/${category}`}>{categoryName}</Link>
        <span>/</span>
        <span>{title}</span>
      </nav>

      <PageHeader
        eyebrow={guideTopic.topicId}
        title={title}
        description={summary}
        actions={<Link className="btn btn-secondary" to={`/guide/${category}`}><ArrowLeft size={17} />{language === 'th' ? 'กลับหมวดนี้' : 'Back to category'}</Link>}
      />

      <div className="guide-audience-row" aria-label={language === 'th' ? 'เหมาะสำหรับ' : 'Audience'}>
        {guideTopic.audience.map((audience) => (
          <span className="status-pill" key={audience}>{audienceLabels[audience][language]}</span>
        ))}
      </div>

      <div className="guide-topic-layout">
        <aside className="guide-topic-toc" aria-label={language === 'th' ? 'หัวข้อในหน้านี้' : 'On this page'}>
          <strong>{language === 'th' ? 'ในหน้านี้' : 'On this page'}</strong>
          <a href="#when">{language === 'th' ? 'ใช้เมื่อไหร่' : 'When to use'}</a>
          <a href="#steps">{language === 'th' ? 'ขั้นตอน' : 'Steps'}</a>
          {fieldNotes.length ? <a href="#fields">{language === 'th' ? 'ความหมายของช่อง/ปุ่ม' : 'Fields and buttons'}</a> : null}
          {problems.length ? <a href="#problems">{language === 'th' ? 'ปัญหาที่พบบ่อย' : 'Common problems'}</a> : null}
          {related.length ? <a href="#related">{language === 'th' ? 'หัวข้อที่เกี่ยวข้อง' : 'Related topics'}</a> : null}
        </aside>

        <div className="guide-topic-content">
          <Card id="when" className="guide-topic-section">
            <h2>{language === 'th' ? 'ใช้เมื่อไหร่' : 'When to use this'}</h2>
            {whenToUse.length ? <BulletList items={whenToUse} /> : <p>{summary}</p>}
            {guideTopic.relatedRoutes?.length ? (
              <div className="guide-cta-row">
                {guideTopic.relatedRoutes.map((route) => (
                  <Link className="btn btn-secondary" to={route} key={route}>
                    {language === 'th' ? 'ไปหน้าที่เกี่ยวข้อง' : 'Open related page'}
                    <ExternalLink size={16} />
                  </Link>
                ))}
              </div>
            ) : null}
          </Card>

          <Card id="steps" className="guide-topic-section">
            <h2>{language === 'th' ? 'ขั้นตอนใช้งาน' : 'Step-by-step'}</h2>
            <ol className="guide-step-list">
              {steps.map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </Card>

          {fieldNotes.length ? (
            <Card id="fields" className="guide-topic-section">
              <h2>{language === 'th' ? 'ความหมายของช่อง/ปุ่มสำคัญ' : 'Important fields and buttons'}</h2>
              <FieldNotes notes={fieldNotes} />
            </Card>
          ) : null}

          {tips.length ? (
            <Card className="guide-topic-section" variant="soft">
              <h2>{language === 'th' ? 'ข้อควรจำ' : 'Tips'}</h2>
              <BulletList items={tips} icon />
            </Card>
          ) : null}

          {problems.length ? (
            <Card id="problems" className="guide-topic-section">
              <h2>{language === 'th' ? 'ปัญหาที่พบบ่อยและวิธีแก้' : 'Common problems and fixes'}</h2>
              <div className="guide-problem-list">
                {problems.map((problem) => <ProblemItem problem={problem} key={problem.problem} />)}
              </div>
            </Card>
          ) : null}

          {related.length ? (
            <Card id="related" className="guide-topic-section">
              <h2>{language === 'th' ? 'หัวข้อที่เกี่ยวข้อง' : 'Related topics'}</h2>
              <div className="guide-related-grid">
                {related.map((item) => (
                  <Link className="guide-related-card" to={getGuideTopicPath(item.topicId)} key={item.topicId}>
                    <strong>{topicTitle(item, language)}</strong>
                    <small>{topicSummary(item, language)}</small>
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}

          <div className="guide-cta-row">
            <Link className="btn btn-secondary" to="/guide">{language === 'th' ? 'กลับศูนย์คู่มือ' : 'Back to Guide Center'}</Link>
            {guideTopic.relatedRoutes?.[0] ? (
              <Link className="btn btn-primary" to={guideTopic.relatedRoutes[0]}>
                {language === 'th' ? 'ไปหน้าจริง' : 'Go to feature'}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function BulletList({ items, icon = false }: { items: string[]; icon?: boolean }) {
  return (
    <ul className={icon ? 'guide-check-list' : 'guide-bullet-list'}>
      {items.map((item) => (
        <li key={item}>{icon ? <CheckCircle2 size={17} aria-hidden="true" /> : null}<span>{item}</span></li>
      ))}
    </ul>
  );
}

function FieldNotes({ notes }: { notes: GuideFieldNote[] }) {
  return (
    <div className="guide-field-grid">
      {notes.map((note) => (
        <div className="guide-field-note" key={note.label}>
          <strong>{note.label}</strong>
          <span>{note.description}</span>
        </div>
      ))}
    </div>
  );
}

function ProblemItem({ problem }: { problem: GuideProblem }) {
  return (
    <details className="guide-problem-item">
      <summary>{problem.problem}</summary>
      <p>{problem.solution}</p>
    </details>
  );
}
