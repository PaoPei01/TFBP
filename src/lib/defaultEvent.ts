import type { ActivityEvent } from './eventTypes';

export const DEFAULT_EVENT_SLUG = 'entaneer-bonding-69';
export const DEFAULT_EVENT_NAME_TH = 'สานสัมพันธ์ 69';
export const DEFAULT_EVENT_NAME_EN = 'Entaneer Bonding 69';

export const DEFAULT_EVENT: ActivityEvent = {
  name_th: DEFAULT_EVENT_NAME_TH,
  name_en: DEFAULT_EVENT_NAME_EN,
  slug: DEFAULT_EVENT_SLUG,
  event_type: 'activity',
  academic_year: '2569',
  status: 'active',
  visibility: 'public',
  description: 'กิจกรรมสานสัมพันธ์วิศวกรรมศาสตร์',
};

export const MULTI_EVENT_PLATFORM_MODE = false;

export function defaultEventName(language: 'th' | 'en') {
  return language === 'th' ? DEFAULT_EVENT.name_th : DEFAULT_EVENT.name_en;
}
