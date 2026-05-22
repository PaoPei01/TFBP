import { guideCategories, guideTopics, type GuideCategory, type GuideTopic } from './guideContent';

export type GuideLanguage = 'th' | 'en';

const topicById = new Map(guideTopics.map((topic) => [topic.topicId, topic]));
const categoryById = new Map(guideCategories.map((category) => [category.id, category]));

const synonymGroups = [
  ['เช็กชื่อ', 'เช็คชื่อ', 'attendance', 'check-in', 'checkin'],
  ['qr', 'คิวอาร์', 'QR', 'qrcode'],
  ['แอดมิน', 'ผู้ดูแล', 'admin'],
  ['ทีมงาน', 'พี่กลุ่ม', 'สตาฟ', 'staff'],
  ['แก้ข้อมูล', 'แก้ไขข้อมูล', 'edit', 'update'],
  ['เข้าสู่ระบบ', 'ล็อกอิน', 'login', 'sign in'],
  ['สาย', 'มาสาย', 'late'],
  ['กล้อง', 'สแกน', 'camera', 'scan'],
  ['เอกสาร', 'docx', 'document', 'template', 'เทมเพลต'],
  ['เวลา', 'timezone', 'เวลาไทย', 'UTC'],
];

export function getGuideTopicById(topicId: string): GuideTopic | null {
  return topicById.get(topicId) ?? null;
}

export function getGuideTopicByRoute(category: string, slug: string): GuideTopic | null {
  return guideTopics.find((topic) => topic.category === category && topic.slug === slug) ?? null;
}

export function getGuideCategory(category: string): GuideCategory | null {
  return categoryById.get(category) ?? null;
}

export function getTopicsByCategory(category: string): GuideTopic[] {
  return guideTopics.filter((topic) => topic.category === category);
}

export function getRelatedTopics(topicId: string): GuideTopic[] {
  const topic = getGuideTopicById(topicId);
  if (!topic?.relatedTopicIds?.length) return [];
  return topic.relatedTopicIds
    .map((relatedId) => getGuideTopicById(relatedId))
    .filter((related): related is GuideTopic => Boolean(related));
}

export function getGuideTopicPath(topicId: string): string {
  const topic = getGuideTopicById(topicId);
  return topic ? `/guide/${topic.category}/${topic.slug}` : '/guide';
}

export function searchGuideTopics(query: string, language: GuideLanguage): GuideTopic[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];
  const terms = expandTerms(normalizedQuery);
  return guideTopics
    .map((topic) => ({ topic, score: scoreTopic(topic, terms, language) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.topic.titleTh.localeCompare(b.topic.titleTh, 'th'))
    .map((item) => item.topic);
}

export function topicTitle(topic: GuideTopic, language: GuideLanguage): string {
  return language === 'th' ? topic.titleTh : topic.titleEn;
}

export function topicSummary(topic: GuideTopic, language: GuideLanguage): string {
  return language === 'th' ? topic.summaryTh : topic.summaryEn;
}

export function categoryTitle(category: GuideCategory, language: GuideLanguage): string {
  return language === 'th' ? category.titleTh : category.titleEn;
}

export function categoryDescription(category: GuideCategory, language: GuideLanguage): string {
  return language === 'th' ? category.descriptionTh : category.descriptionEn;
}

export function popularGuideTopics(): GuideTopic[] {
  return [
    'events.overview',
    'staff-attendance.overview',
    'staff.personal-qr',
    'participant.edit-info',
    'admin-attendance.create-session',
    'admin-attendance.scan-staff-qr',
    'documents.generate',
  ]
    .map((topicId) => getGuideTopicById(topicId))
    .filter((topic): topic is GuideTopic => Boolean(topic));
}

function normalize(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

function expandTerms(query: string): string[] {
  const baseTerms = query.split(' ').filter(Boolean);
  const expanded = new Set(baseTerms);
  for (const group of synonymGroups) {
    if (group.some((word) => query.includes(normalize(word)))) {
      group.forEach((word) => expanded.add(normalize(word)));
    }
  }
  return [...expanded];
}

function scoreTopic(topic: GuideTopic, terms: string[], language: GuideLanguage): number {
  const primary = language === 'th'
    ? [topic.titleTh, topic.summaryTh, ...(topic.keywordsTh ?? [])]
    : [topic.titleEn, topic.summaryEn, ...(topic.keywordsEn ?? [])];
  const secondary = language === 'th'
    ? [topic.titleEn, topic.summaryEn, ...(topic.keywordsEn ?? [])]
    : [topic.titleTh, topic.summaryTh, ...(topic.keywordsTh ?? [])];
  const problemText = [
    ...(topic.commonProblemsTh ?? []).flatMap((item) => [item.problem, item.solution]),
    ...(topic.commonProblemsEn ?? []).flatMap((item) => [item.problem, item.solution]),
  ];
  const haystackPrimary = normalize(primary.join(' '));
  const haystackSecondary = normalize([...secondary, ...problemText, topic.category, topic.slug, topic.topicId].join(' '));
  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    if (normalize(topic.titleTh) === term || normalize(topic.titleEn) === term) score += 8;
    if (haystackPrimary.includes(term)) score += 5;
    if (haystackSecondary.includes(term)) score += 2;
  }
  return score;
}
