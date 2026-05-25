import { groupLabel } from '../lib/grouping';
import { majorLabel } from '../lib/major';
import type { StaffManagementRow } from '../lib/types';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

const headers = ['student_id', 'email', 'name_th', 'name_en', 'nickname', 'nickname_th', 'nickname_en', 'phone', 'major', 'position', 'role', 'main_group', 'subgroup', 'instagram', 'line_id', 'facebook'];

export function exportStaffCsv(rows: StaffManagementRow[]) {
  const csv = [
    headers.join(','),
    ...rows.map((row) => [
      row.student_id,
      row.email,
      row.name_th,
      row.name_en,
      row.nickname,
      row.nickname_th,
      row.nickname_en,
      row.phone,
      majorLabel(row.major),
      row.position,
      row.assignment?.role,
      row.assignment?.main_group,
      row.assignment?.subgroup,
      row.instagram,
      row.line_id,
      row.facebook,
    ].map(csvEscape).join(',')),
  ].join('\n');
  downloadBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }), `staff-list-${new Date().toISOString().slice(0, 10)}.csv`);
}

export async function exportStaffXlsx(rows: StaffManagementRow[]) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Entaneer Gear 56';

  const staff = workbook.addWorksheet('Staff list');
  staff.columns = [
    { header: 'Student ID', key: 'student_id', width: 14 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Name TH', key: 'name_th', width: 28 },
    { header: 'Name EN', key: 'name_en', width: 28 },
    { header: 'Nickname', key: 'nickname', width: 14 },
    { header: 'Nickname TH', key: 'nickname_th', width: 14 },
    { header: 'Nickname EN', key: 'nickname_en', width: 14 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Major', key: 'major', width: 36 },
    { header: 'Position', key: 'position', width: 20 },
    { header: 'Role', key: 'role', width: 16 },
    { header: 'Group', key: 'group', width: 18 },
    { header: 'Instagram', key: 'instagram', width: 18 },
    { header: 'Line ID', key: 'line_id', width: 18 },
    { header: 'Facebook', key: 'facebook', width: 18 },
  ];
  rows.forEach((row) => staff.addRow({
    student_id: row.student_id,
    email: row.email,
    name_th: row.name_th,
    name_en: row.name_en,
    nickname: row.nickname,
    nickname_th: row.nickname_th,
    nickname_en: row.nickname_en,
    phone: row.phone,
    major: majorLabel(row.major),
    position: row.position,
    role: row.assignment?.role,
    group: groupLabel(row.assignment?.main_group, row.assignment?.subgroup),
    instagram: row.instagram,
    line_id: row.line_id,
    facebook: row.facebook,
  }));

  const medical = workbook.addWorksheet('Medical admin only');
  medical.columns = [
    { header: 'Student ID', key: 'student_id', width: 14 },
    { header: 'Name', key: 'name', width: 28 },
    { header: 'Disease', key: 'disease', width: 26 },
    { header: 'Drug allergy', key: 'drug_allergy', width: 26 },
    { header: 'Food allergy', key: 'food_allergy', width: 26 },
    { header: 'Medical note', key: 'medical_note', width: 32 },
  ];
  rows.forEach((row) => medical.addRow({
    student_id: row.student_id,
    name: row.name_th,
    disease: row.medical_info?.disease,
    drug_allergy: row.medical_info?.drug_allergy,
    food_allergy: row.medical_info?.food_allergy,
    medical_note: row.medical_info?.medical_note,
  }));

  workbook.worksheets.forEach((sheet) => {
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  });
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `staff-list-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
