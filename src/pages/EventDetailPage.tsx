import { CalendarDays, MapPin, RefreshCw, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { useAsync } from '../hooks/useAsync';
import { getEventContent } from '../lib/eventContent';
import { formatBangkokDate } from '../lib/dateTime';
import { eventRegisterPath, eventStaffApplyPath, legacyDefaultEventRoute } from '../lib/eventRoutes';
import { fetchEventBySlug } from '../services/events';

function statusLabel(status: string, language: 'th' | 'en') {
  const labels: Record<string, { th: string; en: string }> = {
    active: { th: 'กำลังใช้งาน', en: 'Active' },
    published: { th: 'เผยแพร่แล้ว', en: 'Published' },
    registration_open: { th: 'เปิดรับสมัคร', en: 'Registration open' },
    staff_recruiting: { th: 'เปิดรับสตาฟ', en: 'Staff recruiting' },
    draft: { th: 'แบบร่าง', en: 'Draft' },
    completed: { th: 'จบกิจกรรมแล้ว', en: 'Completed' },
    archived: { th: 'เก็บถาวร', en: 'Archived' },
  };
  return labels[status]?.[language] ?? status;
}

function eventDate(start?: string | null, end?: string | null, language: 'th' | 'en' = 'th') {
  if (!start && !end) return language === 'th' ? 'ยังไม่ระบุวันกิจกรรม' : 'Date to be announced';
  if (start && end && start !== end) return `${formatBangkokDate(start, language)} - ${formatBangkokDate(end, language)}`;
  return formatBangkokDate(start ?? end, language);
}

export function EventDetailPage() {
  const { language } = useLanguage();
  const { eventSlug = '' } = useParams();
  const state = useAsync(() => fetchEventBySlug(eventSlug), [eventSlug]);
  const event = state.data;
  const content = getEventContent(event?.slug ?? eventSlug);
  const title = event ? (language === 'th' ? event.name_th : event.name_en || event.name_th) : (language === 'th' ? 'รายละเอียดกิจกรรม' : 'Event details');

  return (
    <section className="events-page page-stack">
      <PageHeader
        eyebrow="Event"
        title={title}
        description={content?.public.summaryTh ?? (language === 'th'
          ? 'ดูรายละเอียดกิจกรรมและขั้นตอนที่เกี่ยวข้อง'
          : 'View event details and related actions.')}
        actions={<Button variant="secondary" icon={<RefreshCw size={18} />} onClick={state.reload}>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</Button>}
      />

      {state.loading ? <LoadingSkeleton /> : null}
      {state.error ? (
        <EmptyState
          title={language === 'th' ? 'โหลดรายละเอียดกิจกรรมไม่สำเร็จ' : 'Could not load event'}
          description={language === 'th' ? 'กรุณาลองใหม่ หรือกลับไปหน้ากิจกรรมทั้งหมด' : 'Please retry or return to the events list.'}
          action={<Link className="btn btn-secondary" to="/events">{language === 'th' ? 'กลับไปหน้ากิจกรรม' : 'Back to events'}</Link>}
        />
      ) : null}
      {!state.loading && !state.error && !event ? (
        <EmptyState
          title={language === 'th' ? 'ไม่พบกิจกรรมนี้' : 'Event not found'}
          description={language === 'th' ? 'ลิงก์นี้อาจไม่ถูกต้อง หรือกิจกรรมยังไม่เปิดเผย' : 'This link may be incorrect or the event is not public yet.'}
          action={<Link className="btn btn-primary" to="/events">{language === 'th' ? 'ดูกิจกรรมทั้งหมด' : 'View events'}</Link>}
        />
      ) : null}

      {event ? (
        <>
          <Card className="event-detail-card">
            <div className="event-card-head">
              <span className={`status-pill status-${event.status}`}>{statusLabel(event.status, language)}</span>
              <span className={`status-pill status-${event.visibility}`}>{event.visibility}</span>
            </div>
            <div className="event-detail-meta">
              <span><CalendarDays size={18} /> {eventDate(event.start_date, event.end_date, language)}</span>
              <span><MapPin size={18} /> {event.location || (language === 'th' ? 'ยังไม่ระบุสถานที่' : 'Location to be announced')}</span>
            </div>
            {event.description ? <p>{event.description}</p> : null}
            {content ? (
              <div className="event-fact-grid">
                <span><strong>{language === 'th' ? 'กลุ่มเป้าหมาย' : 'Audience'}</strong>{content.public.targetAudienceTh}</span>
                {content.public.eventTimeTh ? <span><strong>{language === 'th' ? 'เวลา' : 'Time'}</strong>{content.public.eventTimeTh}</span> : null}
                {content.public.rehearsalDateTh ? <span><strong>{language === 'th' ? 'ซ้อม/เตรียมงาน' : 'Prep'}</strong>{content.public.rehearsalDateTh}</span> : null}
              </div>
            ) : null}
          </Card>

          {content?.objectives?.length ? (
            <Card className="event-detail-card">
              <div>
                <p className="eyebrow">{language === 'th' ? 'เป้าหมายกิจกรรม' : 'Objectives'}</p>
                <h2>{language === 'th' ? 'สิ่งที่ผู้เข้าร่วมจะได้รับ' : 'What this event supports'}</h2>
              </div>
              <div className="event-mini-grid">
                {content.objectives.map((item) => (
                  <div className="event-mini-card" key={item.titleTh}>
                    <strong>{item.titleTh}</strong>
                    <span>{item.descriptionTh}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {content?.staffRecruitment ? (
            <Card className="event-detail-card">
              <div>
                <p className="eyebrow">{language === 'th' ? 'เปิดรับสตาฟ' : 'Staff Recruitment'}</p>
                <h2>{language === 'th' ? 'รายละเอียดการสมัครสตาฟ' : 'Staff application details'}</h2>
              </div>
              <div className="event-fact-grid">
                <span><strong>{language === 'th' ? 'จำนวนรับ' : 'Capacity'}</strong>{content.staffRecruitment.capacity.toLocaleString()} คน</span>
                <span><strong>{language === 'th' ? 'ชั้นปี' : 'Years'}</strong>{content.staffRecruitment.eligibleYears.join(', ')}</span>
                <span><strong>{language === 'th' ? 'วันปฏิบัติงาน' : 'Work date'}</strong>{content.staffRecruitment.workDateTh}</span>
                <span><strong>{language === 'th' ? 'ชุด' : 'Dress code'}</strong>{content.staffRecruitment.dressCodeTh}</span>
              </div>
              <div className="event-list-section">
                <h3>{language === 'th' ? 'หน้าที่ที่อาจได้รับมอบหมาย' : 'Possible duties'}</h3>
                <div className="chip-list">
                  {content.staffRecruitment.dutiesTh.map((duty) => <span className="chip" key={duty}>{duty}</span>)}
                </div>
              </div>
              <div className="event-list-section">
                <h3>{language === 'th' ? 'วันสำคัญ' : 'Important dates'}</h3>
                <div className="event-timeline compact">
                  {content.staffRecruitment.importantDatesTh.map((item) => (
                    <div className="event-timeline-item" key={`${item.dateTh}-${item.titleTh}`}>
                      <time>{item.dateTh}</time>
                      <strong>{item.titleTh}</strong>
                      {item.noteTh ? <span>{item.noteTh}</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ) : null}

          {content?.participantSummary ? (
            <Card className="event-detail-card">
              <div>
                <p className="eyebrow">{language === 'th' ? 'การแบ่งกลุ่ม' : 'Grouping'}</p>
                <h2>{language === 'th' ? 'ภาพรวมผู้เข้าร่วม' : 'Participant overview'}</h2>
                <p className="muted">{content.participantSummary.publicCopyTh}</p>
              </div>
              <div className="event-stat-grid">
                <span><Users size={18} /><strong>{content.participantSummary.totalExpected.toLocaleString()}</strong>{language === 'th' ? 'คนโดยประมาณ' : 'expected'}</span>
                <span><strong>{content.participantSummary.groupCount}</strong>{language === 'th' ? 'สี' : 'groups'}</span>
                <span><strong>{content.participantSummary.participantsPerColor}</strong>{language === 'th' ? 'คน/สี' : 'per color'}</span>
                <span><strong>{content.participantSummary.subgroupsPerColor}</strong>{language === 'th' ? 'กลุ่มย่อย/สี' : 'subgroups/color'}</span>
              </div>
            </Card>
          ) : null}

          {content?.scheduleItems?.length ? (
            <Card className="event-detail-card">
              <div>
                <p className="eyebrow">{language === 'th' ? 'กำหนดการ' : 'Schedule'}</p>
                <h2>{language === 'th' ? 'กำหนดการโดยสรุป' : 'Schedule preview'}</h2>
              </div>
              <div className="event-timeline">
                {content.scheduleItems.map((item) => (
                  <div className="event-timeline-item" key={`${item.start}-${item.titleTh}`}>
                    <time>{item.start}{item.end ? ` - ${item.end}` : ''}</time>
                    <strong>{item.titleTh}</strong>
                    <span>{item.type}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {content?.stations?.length ? (
            <Card className="event-detail-card">
              <div>
                <p className="eyebrow">{language === 'th' ? 'ฐานกิจกรรม' : 'Stations'}</p>
                <h2>{language === 'th' ? 'พื้นที่ฐาน 7 ฐาน' : 'Seven station areas'}</h2>
              </div>
              <div className="event-mini-grid">
                {content.stations.map((station) => (
                  <div className="event-mini-card" key={station.number}>
                    <strong>{station.number}. {station.locationTh}</strong>
                    <span>{station.departments.join(', ')}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {content?.public.dressCodeTh?.length || content?.registrationPoints?.length || content?.contingencyPlans?.length ? (
            <Card className="event-detail-card">
              <div>
                <p className="eyebrow">{language === 'th' ? 'ข้อมูลสำคัญ' : 'Key info'}</p>
                <h2>{language === 'th' ? 'การเตรียมตัวและแผนสำรอง' : 'Preparation and public contingency notes'}</h2>
              </div>
              {content.public.dressCodeTh?.length ? (
                <div className="event-list-section">
                  <h3>{language === 'th' ? 'การแต่งกาย' : 'Dress code'}</h3>
                  <ul>{content.public.dressCodeTh.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              ) : null}
              {content.registrationPoints?.length ? (
                <div className="event-list-section">
                  <h3>{language === 'th' ? 'จุดลงทะเบียน' : 'Registration points'}</h3>
                  <div className="event-mini-grid">
                    {content.registrationPoints.map((point) => (
                      <div className="event-mini-card" key={point.locationTh}>
                        <strong>{point.locationTh}</strong>
                        <span>{point.noteTh}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {content.contingencyPlans?.length ? (
                <div className="event-list-section">
                  <h3>{language === 'th' ? 'แผนกรณีฝนตก' : 'Rain plan'}</h3>
                  <div className="event-mini-grid">
                    {content.contingencyPlans.map((plan) => (
                      <div className="event-mini-card" key={plan.conditionTh}>
                        <strong>{plan.conditionTh}</strong>
                        <span>{plan.publicSummaryTh}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>
          ) : null}

          {/* Budget and staffDetailTh are intentionally not rendered on this public page. They are reserved for admin/document workflows. */}

          <Card className="event-actions-card" variant="soft">
            <div>
              <p className="eyebrow">{language === 'th' ? 'การดำเนินการ' : 'Actions'}</p>
              <h2>{event.status === 'staff_recruiting' ? (language === 'th' ? 'สมัครเป็นสตาฟกิจกรรมนี้' : 'Apply as staff') : (language === 'th' ? 'ดูข้อมูลกิจกรรมปัจจุบัน' : 'Open current event tools')}</h2>
              <p>{event.slug === 'entaneer-bonding-69'
                ? (language === 'th' ? 'หน้ารายชื่อและแก้ไขข้อมูลเดิมยังใช้งานได้ตามปกติ' : 'The existing participant list and edit flow continue to work normally.')
                : (language === 'th' ? 'ใบสมัครนี้เป็น pilot ของระบบหลายกิจกรรม และต้องรอผู้ดูแลตรวจสอบ' : 'This is a multi-event pilot application and requires admin review.')}</p>
            </div>
            <div className="event-card-actions">
              {event.status === 'staff_recruiting' ? (
                <Link className="btn btn-primary" to={eventStaffApplyPath(event.slug)}>{language === 'th' ? 'สมัครเป็นสตาฟ' : 'Apply as staff'}</Link>
              ) : (
                <Link className="btn btn-secondary" to={eventRegisterPath(event.slug)}>{language === 'th' ? 'ลงทะเบียนเข้าร่วม' : 'Register'}</Link>
              )}
              <Link className="btn btn-primary" to={legacyDefaultEventRoute('edit')}>{language === 'th' ? 'ตรวจสอบข้อมูลของฉัน' : 'Check my info'}</Link>
              {event.slug === 'entaneer-bonding-69' ? <Link className="btn btn-secondary" to={legacyDefaultEventRoute('home')}>{language === 'th' ? 'ดูรายชื่อ' : 'Participant list'}</Link> : null}
            </div>
          </Card>
        </>
      ) : null}
    </section>
  );
}
