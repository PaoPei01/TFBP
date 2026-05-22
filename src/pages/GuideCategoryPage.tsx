import { ArrowLeft, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import type { GuideTopic } from '../lib/guideContent';
import {
  categoryDescription,
  categoryTitle,
  getGuideCategory,
  getGuideTopicPath,
  getTopicsByCategory,
  searchGuideTopics,
  topicSummary,
  topicTitle,
} from '../lib/guideRegistry';

export function GuideCategoryPage() {
  const { category = '' } = useParams();
  const { language } = useLanguage();
  const [query, setQuery] = useState('');
  const guideCategory = getGuideCategory(category);
  const categoryTopics = useMemo(() => getTopicsByCategory(category), [category]);
  const topics = useMemo(() => {
    if (!query.trim()) return categoryTopics;
    const ids = new Set(categoryTopics.map((topic) => topic.topicId));
    return searchGuideTopics(query, language).filter((topic) => ids.has(topic.topicId));
  }, [categoryTopics, language, query]);

  if (!guideCategory) {
    return (
      <section className="guide-page page-stack">
        <EmptyState
          title={language === 'th' ? 'ไม่พบหมวดคู่มือ' : 'Guide category not found'}
          description={language === 'th' ? 'กลับไปศูนย์คู่มือเพื่อเลือกหมวดอื่น' : 'Go back to the Guide Center and choose another category.'}
          action={<Link className="btn btn-primary" to="/guide">{language === 'th' ? 'กลับศูนย์คู่มือ' : 'Back to Guide Center'}</Link>}
        />
      </section>
    );
  }

  return (
    <section className="guide-page page-stack">
      <nav className="guide-breadcrumbs" aria-label={language === 'th' ? 'ตำแหน่งในคู่มือ' : 'Guide breadcrumbs'}>
        <Link to="/guide">{language === 'th' ? 'คู่มือ' : 'Guide'}</Link>
        <span>/</span>
        <span>{categoryTitle(guideCategory, language)}</span>
      </nav>
      <PageHeader
        eyebrow="Guide Category"
        title={categoryTitle(guideCategory, language)}
        description={categoryDescription(guideCategory, language)}
        actions={<Link className="btn btn-secondary" to="/guide"><ArrowLeft size={17} />{language === 'th' ? 'ศูนย์คู่มือ' : 'Guide Center'}</Link>}
      />

      <Card className="guide-search-card">
        <div className="search-shell">
          <Search size={18} aria-hidden="true" />
          <Input
            label={language === 'th' ? 'ค้นหาในหมวดนี้' : 'Search this category'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={language === 'th' ? 'ค้นหาหัวข้อในหมวดนี้' : 'Search topics in this category'}
          />
        </div>
      </Card>

      {topics.length ? (
        <div className="guide-topic-grid">
          {topics.map((topic) => <TopicCard topic={topic} language={language} key={topic.topicId} />)}
        </div>
      ) : (
        <EmptyState title={language === 'th' ? 'ไม่พบหัวข้อในหมวดนี้' : 'No topics found'} description={language === 'th' ? 'ลองใช้คำค้นอื่น หรือล้างช่องค้นหา' : 'Try another query or clear the search.'} />
      )}
    </section>
  );
}

function TopicCard({ topic, language }: { topic: GuideTopic; language: 'th' | 'en' }) {
  return (
    <Link className="guide-topic-card" to={getGuideTopicPath(topic.topicId)}>
      <span className="guide-topic-category">{topic.topicId}</span>
      <strong>{topicTitle(topic, language)}</strong>
      <small>{topicSummary(topic, language)}</small>
    </Link>
  );
}
