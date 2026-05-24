import { ClipboardCheck, RefreshCw } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LineGroupCard } from '../components/events/LineGroupCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { getApplicationStatusLabel, getApplicationStatusTone } from '../lib/applicationStatus';
import { formatBangkokDateTime } from '../lib/dateTime';
import { getEventContent } from '../lib/eventContent';
import { eventPath } from '../lib/eventRoutes';
import { checkStaffApplicationStatus, type StaffApplicationStatusResult } from '../services/events';
import { errorMessage } from '../utils/error';

function assignmentMethodLabel(method: string | null | undefined, t: (key: string) => string) {
  const keys: Record<string, string> = {
    auto_quota: 'assignmentMethods.autoQuota',
    manual_admin: 'assignmentMethods.manualAdmin',
    fallback_general: 'assignmentMethods.fallbackGeneral',
    pending: 'assignmentMethods.pending',
  };
  return method ? (keys[method] ? t(keys[method]) : method) : t('assignmentMethods.notAssigned');
}

export function EventStaffApplicationStatusPage() {
  const { language, t } = useLanguage();
  const { eventSlug = '' } = useParams();
  const content = getEventContent(eventSlug);
  const lineGroup = content?.staffRecruitment?.lineGroup;
  const isParentOrientationStaff = eventSlug === 'parent-orientation-staff-2569';
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StaffApplicationStatusResult | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      setLoading(true);
      setToast(null);
      const nextResult = await checkStaffApplicationStatus({ eventSlug, email, phone });
      setResult(nextResult);
      if (!nextResult.success) {
        setToast({ type: 'error', message: t('staffApplication.noStatusFoundToast') });
      }
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, t('staffApplication.statusCheckFailed')) });
    } finally {
      setLoading(false);
    }
  }

  const eventName = result?.event ? (language === 'th' ? result.event.name_th : result.event.name_en || result.event.name_th) : '';
  const application = result?.success ? result.application : null;
  const statusLabel = application?.status === 'approved' && isParentOrientationStaff
    ? (language === 'th' ? 'ผ่านการคัดเลือกเบื้องต้น' : 'Preliminarily accepted')
    : application ? getApplicationStatusLabel(application.status, language) : '';

  return (
    <section className="events-page narrow-page page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow="Staff Application"
        title={t('staffApplication.checkStatusTitle')}
        description={t('staffApplication.checkStatusDescription')}
        meta={<Link className="btn btn-secondary" to={eventPath(eventSlug)}>{t('common.backToEvent')}</Link>}
      />

      <Card className="event-status-check-card">
        <div>
          <p className="eyebrow">{t('staffApplication.applicantVerification')}</p>
          <h2>{t('staffApplication.checkByEmailPhone')}</h2>
          <p>{t('staffApplication.statusPrivacyHint')}</p>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <Input label={t('staffApplication.applicationEmail')} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input label={t('staffApplication.applicationPhone')} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required />
          <Button type="submit" size="lg" fullWidth loading={loading}>
            {t('staffApplication.checkStatus')}
          </Button>
        </form>
      </Card>

      {application ? (
        <Card className="event-status-result-card" variant={application.status === 'approved' ? 'success' : application.status === 'rejected' ? 'warning' : 'soft'}>
          <ClipboardCheck size={30} />
          <div>
            <p className="eyebrow">{eventName || (language === 'th' ? 'ผลการตรวจสอบ' : 'Status result')}</p>
            <h2>{statusLabel}</h2>
            <div className="badge-row">
              <Badge status={getApplicationStatusTone(application.status)}>{statusLabel}</Badge>
              {application.submitted_at ? <Badge>{formatBangkokDateTime(application.submitted_at, language)}</Badge> : null}
            </div>
            <Card variant="soft">
              <div className="application-detail-grid">
                <span>{t('staffApplication.preliminaryAssignedDuty')}</span>
                <strong>{application.assigned_duty_label_th ?? t('staffApplication.pendingAdminAssignment')}</strong>
                <span>{t('staffApplication.assignmentMethod')}</span>
                <strong>{assignmentMethodLabel(application.assignment_method, t)}</strong>
                {application.assignment_note ? (
                  <>
                    <span>{t('common.note')}</span>
                    <strong>{application.assignment_note}</strong>
                  </>
                ) : null}
              </div>
              <p className="muted">{t('staffApplication.preliminaryAssignmentHint')}</p>
            </Card>
            {application.status === 'approved' && application.final_duty ? (
              <p><strong>{t('staffApplication.finalDuty')}:</strong> {application.final_duty}</p>
            ) : null}
            {application.identity_status && application.identity_status !== 'verified' ? (
              <p className="muted">{t('staffApplication.pendingIdentityReviewNote')}</p>
            ) : null}
            {application.review_note ? <p>{application.review_note}</p> : null}
            {lineGroup ? (
              <LineGroupCard
                label={language === 'th' ? lineGroup.labelTh : lineGroup.labelEn}
                note={language === 'th' ? lineGroup.noteTh : lineGroup.noteEn}
                url={lineGroup.url}
                qrImagePath={lineGroup.qrImagePath}
                language={language}
              />
            ) : null}
          </div>
        </Card>
      ) : null}

      {result && !result.success ? (
        <Card className="event-status-result-card" variant="warning">
          <RefreshCw size={28} />
          <div>
            <p className="eyebrow">{t('common.noResult')}</p>
            <h2>{t('staffApplication.statusNotFoundTitle')}</h2>
            <p>{t('staffApplication.statusNotFoundDescription')}</p>
          </div>
        </Card>
      ) : null}
    </section>
  );
}
