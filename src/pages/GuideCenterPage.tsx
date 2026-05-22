import { BookOpen, ClipboardCheck, FileText, HeartPulse, Search, ShieldCheck, UserCheck, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { guideCategories } from '../lib/guideContent';
import type { GuideTopic } from '../lib/guideContent';
import {
  categoryDescription,
  categoryTitle,
  getGuideTopicPath,
  popularGuideTopics,
  searchGuideTopics,
  topicSummary,
  topicTitle,
} from '../lib/guideRegistry';

const categoryIcons = {
  participant: UsersRound,
  events: BookOpen,
  staff: UserCheck,
  'staff-attendance': ClipboardCheck,
  admin: ShieldCheck,
  'admin-attendance': ClipboardCheck,
  documents: FileText,
  emergency: HeartPulse,
  faq: BookOpen,
} as const;

export function GuideCenterPage() {
  const { language } = useLanguage();
  const [query, setQuery] = useState('');
  const matches = useMemo(() => searchGuideTopics(query, language), [language, query]);
  const popular = useMemo(() => popularGuideTopics(), []);
  const hasQuery = Boolean(query.trim());
  const suggested = hasQuery && matches.length === 0 ? popular.slice(0, 4) : [];

  return (
    <section className="guide-page page-stack">
      <PageHeader
        eyebrow="Guide Center"
        title={language === 'th' ? 'คู่มือการใช้งานระบบ' : 'Guide Center'}
        description={language === 'th'
          ? 'ค้นหาวิธีใช้งานแบบสั้น เข้าใจง่าย และเปิดหัวข้อที่ตรงกับงานที่กำลังทำ'
          : 'Find short, practical help for the exact task you are doing.'}
      />

      <Card className="guide-search-card">
        <div className="search-shell">
          <Search size={18} aria-hidden="true" />
          <Input
            label={language === 'th' ? 'ค้นหาคู่มือ' : 'Search guides'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={language === 'th' ? 'ค้นหาวิธีใช้งาน เช่น เช็กชื่อ, QR, แก้ไขข้อมูล' : 'Search guide topics...'}
          />
        </div>
      </Card>

      {hasQuery ? (
        <section className="guide-section">
          <div className="guide-section-head">
            <p className="eyebrow">{language === 'th' ? 'ผลการค้นหา' : 'Search results'}</p>
            <h2>{language === 'th' ? `พบ ${matches.length} หัวข้อ` : `${matches.length} topics found`}</h2>
          </div>
          {matches.length ? <TopicGrid topics={matches} language={language} /> : <EmptyState title={language === 'th' ? 'ไม่พบหัวข้อที่เกี่ยวข้อง' : 'No matching guide topics'} description={language === 'th' ? 'ลองค้นหาด้วยคำว่า เช็กชื่อ, QR, แก้ไขข้อมูล หรือเอกสาร' : 'Try attendance, QR, edit info, or documents.'} />}
          {suggested.length ? (
            <>
              <div className="guide-section-head">
                <h2>{language === 'th' ? 'หัวข้อยอดนิยม' : 'Popular topics'}</h2>
              </div>
              <TopicGrid topics={suggested} language={language} />
            </>
          ) : null}
        </section>
      ) : (
        <>
          <section className="guide-section">
            <div className="guide-section-head">
              <p className="eyebrow">{language === 'th' ? 'เลือกบทบาท' : 'Choose a role'}</p>
              <h2>{language === 'th' ? 'อยากดูวิธีใช้งานส่วนไหน' : 'What do you need help with?'}</h2>
            </div>
            <div className="guide-category-grid">
              {guideCategories.map((category) => {
                const Icon = categoryIcons[category.id as keyof typeof categoryIcons] ?? BookOpen;
                return (
                  <Link className="guide-category-card" to={`/guide/${category.id}`} key={category.id}>
                    <Icon size={24} aria-hidden="true" />
                    <span>{categoryTitle(category, language)}</span>
                    <small>{categoryDescription(category, language)}</small>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="guide-section">
            <div className="guide-section-head">
              <p className="eyebrow">{language === 'th' ? 'หัวข้อยอดนิยม' : 'Popular topics'}</p>
              <h2>{language === 'th' ? 'เริ่มจากหัวข้อที่ใช้บ่อย' : 'Start with common tasks'}</h2>
            </div>
            <TopicGrid topics={popular} language={language} />
          </section>
        </>
      )}
    </section>
  );
}

function TopicGrid({ topics, language }: { topics: GuideTopic[]; language: 'th' | 'en' }) {
  return (
    <div className="guide-topic-grid">
      {topics.map((topic) => (
        <Link className="guide-topic-card" to={getGuideTopicPath(topic.topicId)} key={topic.topicId}>
          <span className="guide-topic-category">{topic.category}</span>
          <strong>{topicTitle(topic, language)}</strong>
          <small>{topicSummary(topic, language)}</small>
        </Link>
      ))}
    </div>
  );
}
