import { Database, FileSpreadsheet, PlayCircle, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { HelpButton } from '../components/help/HelpButton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { PageHeader } from '../components/ui/PageHeader';
import { ResponsiveDataTable } from '../components/ui/ResponsiveDataTable';
import { Toast, ToastState } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import {
  importYear2PeopleFromStaging,
  previewYear2PeopleImport,
  type Year2ImportPreview,
  type Year2ImportResult,
  type Year2ImportWarningItem,
} from '../services/peopleImport';
import { errorMessage } from '../utils/error';

type MappingRow = {
  excel: string;
  staging: string;
  people: string;
};

const mappingRows: MappingRow[] = [
  { excel: 'ON', staging: 'source_order', people: 'metadata.source_order' },
  { excel: 'Email', staging: 'email_raw', people: 'email' },
  { excel: 'StudentID', staging: 'student_id_raw', people: 'student_id' },
  { excel: 'FullNameEN / nameEN', staging: 'name_en_raw', people: 'name_en' },
  { excel: 'FullNameTH / nameTH', staging: 'name_th_raw', people: 'name_th' },
  { excel: 'NicknameEN', staging: 'nickname_en_raw', people: 'nickname_en' },
  { excel: 'NicknameTH', staging: 'nickname_th_raw', people: 'nickname, nickname_th' },
  { excel: 'PhoneNumber', staging: 'phone_raw', people: 'phone' },
  { excel: 'Instagram', staging: 'instagram_raw', people: 'instagram' },
  { excel: 'Facebook', staging: 'facebook_raw', people: 'facebook' },
  { excel: 'IDLine', staging: 'line_id_raw', people: 'line_id' },
  { excel: 'MajorTH', staging: 'major_th_raw', people: 'major' },
  { excel: 'MajorEN', staging: 'major_en_raw', people: 'metadata.major_en' },
  { excel: 'CurriculumTypeEN', staging: 'curriculum_type_en_raw', people: 'metadata.curriculum_type_en' },
  { excel: 'CurriculumTypeTH', staging: 'curriculum_type_th_raw', people: 'metadata.curriculum_type_th' },
  { excel: 'ProgramType', staging: 'program_type_raw', people: 'metadata.program_type' },
  { excel: 'MedicalCondition', staging: 'medical_condition_raw', people: 'not imported' },
  { excel: 'DrugAllergy', staging: 'drug_allergy_raw', people: 'not imported' },
  { excel: 'FoodAllergy', staging: 'food_allergy_raw', people: 'not imported' },
];

function numberValue(value: number | undefined) {
  return (value ?? 0).toLocaleString();
}

function WarningList({ title, rows, kind }: { title: string; rows?: Year2ImportWarningItem[]; kind: 'duplicate' | 'phone' | 'email' }) {
  if (!rows?.length) return null;
  return (
    <div className="import-warning-list">
      <strong>{title}</strong>
      <ul>
        {rows.map((row, index) => (
          <li key={`${title}-${index}`}>
            {kind === 'duplicate' ? `${row.student_id ?? '-'} (${row.count ?? 0})` : `#${row.source_order ?? '-'}: ${kind === 'phone' ? row.phone : row.email}`}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Year2PeopleImportPage() {
  const { language } = useLanguage();
  const [preview, setPreview] = useState<Year2ImportPreview | null>(null);
  const [result, setResult] = useState<Year2ImportResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  async function runPreview() {
    setPreviewLoading(true);
    try {
      const data = await previewYear2PeopleImport();
      setPreview(data);
      setToast({ type: 'success', message: language === 'th' ? 'ตรวจสอบ staging สำเร็จ' : 'Staging preview loaded' });
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'ตรวจสอบ staging ไม่สำเร็จ' : 'Preview failed') });
    } finally {
      setPreviewLoading(false);
    }
  }

  async function runImport() {
    setImportLoading(true);
    try {
      const data = await importYear2PeopleFromStaging();
      setResult(data);
      setToast({ type: 'success', message: language === 'th' ? 'นำเข้าฐานข้อมูลปี 2 สำเร็จ' : 'Year 2 import completed' });
      await runPreview();
    } catch (err) {
      setToast({ type: 'error', message: errorMessage(err, language === 'th' ? 'นำเข้า people ไม่สำเร็จ' : 'Import failed') });
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <section className="page-stack">
      <Toast toast={toast} />
      <PageHeader
        eyebrow={language === 'th' ? 'นำเข้าข้อมูลกลาง' : 'Central Records Import'}
        title={language === 'th' ? 'นำเข้าข้อมูลนักศึกษาปี 2' : 'Import Year 2 Student Data'}
        description={language === 'th' ? 'นำเข้าฐานข้อมูลนักศึกษาวิศวกรรมปี 2 ผ่าน staging table ก่อน upsert เข้า people อย่างปลอดภัย' : 'Safely stage Engineering year 2 student data before upserting into the central people table.'}
        meta={<Badge status="pending">{language === 'th' ? 'Admin only' : 'Admin only'}</Badge>}
        actions={<HelpButton topicId="admin.people-import" variant="link" />}
      />

      <Card variant="soft">
        <div className="section-heading">
          <FileSpreadsheet size={22} />
          <div>
            <h2>{language === 'th' ? 'ขั้นตอนนำเข้า' : 'Import workflow'}</h2>
            <p>{language === 'th' ? 'แปลง Excel เป็น CSV แล้ว import CSV เข้า staging table ใน Supabase ก่อนกด preview และ import' : 'Convert Excel to CSV, import the CSV into the Supabase staging table, then preview before importing.'}</p>
          </div>
        </div>
        <ol className="compact-list">
          <li>{language === 'th' ? 'แปลงไฟล์ Excel เป็น CSV โดยคงชื่อคอลัมน์ตามคู่มือ' : 'Convert the Excel file to CSV while keeping the expected column names.'}</li>
          <li>{language === 'th' ? 'นำ CSV เข้า public.people_import_year2_2569 ผ่าน Supabase Table Editor' : 'Upload the CSV into public.people_import_year2_2569 with Supabase Table Editor.'}</li>
          <li>{language === 'th' ? 'กดตรวจสอบข้อมูลใน staging และแก้แถวที่ถูกเตือนก่อน import' : 'Run the staging preview and fix warning rows before importing.'}</li>
          <li>{language === 'th' ? 'กดนำเข้า people เพื่อ upsert เฉพาะข้อมูล identity/contact ที่ปลอดภัย' : 'Import into people to upsert only safe identity/contact fields.'}</li>
        </ol>
        <p className="muted">{language === 'th' ? 'ข้อมูลสุขภาพจะไม่ถูก import เข้า people หรือ metadata ในรอบนี้' : 'Health data is not imported into people or people.metadata in this pass.'}</p>
      </Card>

      <Card>
        <div className="section-heading">
          <Database size={22} />
          <div>
            <h2>{language === 'th' ? 'Column mapping' : 'Column mapping'}</h2>
            <p>{language === 'th' ? 'ตรวจชื่อคอลัมน์ก่อน upload CSV เข้า staging' : 'Review column names before uploading CSV to staging.'}</p>
          </div>
        </div>
        <ResponsiveDataTable
          rows={mappingRows}
          getKey={(row) => `${row.excel}-${row.staging}`}
          emptyText="-"
          mobileTitle={(row) => row.excel}
          mobileSubtitle={(row) => `${row.staging} -> ${row.people}`}
          columns={[
            { key: 'excel', header: 'Excel column', render: (row) => row.excel },
            { key: 'staging', header: 'Staging column', render: (row) => row.staging },
            { key: 'people', header: 'People field', render: (row) => row.people === 'not imported' ? <Badge status="rejected">not imported</Badge> : row.people },
          ]}
        />
      </Card>

      <Card>
        <div className="split-panel">
          <div>
            <div className="section-heading">
              <ShieldCheck size={22} />
              <div>
                <h2>{language === 'th' ? 'Preview staging' : 'Preview staging'}</h2>
                <p>{language === 'th' ? 'ตรวจจำนวนแถว ความพร้อม duplicate และตัวอย่างข้อมูลที่ควรแก้' : 'Check row counts, readiness, duplicates, and warning samples.'}</p>
              </div>
            </div>
          </div>
          <Button variant="secondary" icon={<RefreshCw size={18} />} loading={previewLoading} onClick={runPreview}>
            {language === 'th' ? 'ตรวจสอบข้อมูลใน staging' : 'Preview staging data'}
          </Button>
        </div>

        {preview ? (
          <>
            <div className="stats-grid">
              <DashboardStatCard label={language === 'th' ? 'ทั้งหมด' : 'Total rows'} value={numberValue(preview.total_rows)} icon={<Database size={20} />} />
              <DashboardStatCard label={language === 'th' ? 'พร้อมนำเข้า' : 'Ready rows'} value={numberValue(preview.rows_ready_to_import)} icon={<ShieldCheck size={20} />} />
              <DashboardStatCard label={language === 'th' ? 'รหัสซ้ำ' : 'Duplicate IDs'} value={numberValue(preview.duplicate_student_id_count)} icon={<TriangleAlert size={20} />} />
              <DashboardStatCard label={language === 'th' ? 'มีข้อมูลสุขภาพ' : 'Health rows'} value={numberValue(preview.rows_with_health_data)} icon={<TriangleAlert size={20} />} />
            </div>
            <div className="stats-grid stats-grid-compact">
              <DashboardStatCard label={language === 'th' ? 'ไม่มี student ID' : 'Missing student ID'} value={numberValue(preview.rows_missing_student_id)} />
              <DashboardStatCard label={language === 'th' ? 'ไม่มี email' : 'Missing email'} value={numberValue(preview.rows_missing_email)} />
              <DashboardStatCard label={language === 'th' ? 'ไม่มี phone' : 'Missing phone'} value={numberValue(preview.rows_missing_phone)} />
              <DashboardStatCard label={language === 'th' ? 'เบอร์ถูกต้อง' : 'Valid phones'} value={numberValue(preview.valid_phone_count)} />
            </div>
            <div className="warning-grid">
              <WarningList title={language === 'th' ? 'ตัวอย่าง student ID ซ้ำ' : 'Duplicate student ID samples'} rows={preview.warnings?.duplicate_student_ids} kind="duplicate" />
              <WarningList title={language === 'th' ? 'ตัวอย่างเบอร์ไม่ถูกต้อง' : 'Invalid phone samples'} rows={preview.warnings?.invalid_phone_examples} kind="phone" />
              <WarningList title={language === 'th' ? 'ตัวอย่างอีเมลไม่ถูกต้อง' : 'Invalid email samples'} rows={preview.warnings?.invalid_email_examples} kind="email" />
            </div>
          </>
        ) : null}
      </Card>

      <Card variant="warning">
        <div className="split-panel">
          <div>
            <div className="section-heading">
              <PlayCircle size={22} />
              <div>
                <h2>{language === 'th' ? 'Import people' : 'Import people'}</h2>
                <p>{language === 'th' ? 'คำสั่งนี้จะ upsert people records จาก staging เท่านั้น ไม่แตะ legacy profiles หรือ staff_profiles โดยตรง' : 'This upserts people records from staging only. It does not directly affect legacy profiles or staff_profiles.'}</p>
              </div>
            </div>
            <p className="muted">{language === 'th' ? 'ระบบจะไม่ import medical condition, drug allergy, food allergy เข้า people' : 'Medical condition, drug allergy, and food allergy are intentionally not imported into people.'}</p>
          </div>
          <Button icon={<PlayCircle size={18} />} loading={importLoading} disabled={!preview || preview.rows_ready_to_import === 0} onClick={runImport}>
            {language === 'th' ? 'นำเข้า people' : 'Import people'}
          </Button>
        </div>
      </Card>

      {result ? (
        <Card variant={result.errors_count ? 'danger' : 'success'}>
          <div className="section-heading">
            <ShieldCheck size={22} />
            <div>
              <h2>{language === 'th' ? 'ผลลัพธ์' : 'Result'}</h2>
              <p>{language === 'th' ? 'ผลจาก RPC import_year2_people_from_staging' : 'Result from import_year2_people_from_staging RPC.'}</p>
            </div>
          </div>
          <div className="stats-grid">
            <DashboardStatCard label={language === 'th' ? 'เพิ่มใหม่' : 'Inserted'} value={numberValue(result.inserted_count)} />
            <DashboardStatCard label={language === 'th' ? 'อัปเดต' : 'Updated'} value={numberValue(result.updated_count)} />
            <DashboardStatCard label={language === 'th' ? 'ข้าม' : 'Skipped'} value={numberValue(result.skipped_count)} />
            <DashboardStatCard label={language === 'th' ? 'สุขภาพไม่ถูกนำเข้า' : 'Health not imported'} value={numberValue(result.health_data_not_imported_count)} />
            <DashboardStatCard label={language === 'th' ? 'Errors' : 'Errors'} value={numberValue(result.errors_count)} />
          </div>
        </Card>
      ) : null}
    </section>
  );
}
