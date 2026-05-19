import { getMajorCode, majorLabel } from '../lib/major';
import type { GroupProfile, GroupStats } from '../lib/types';

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

export function exportGroupsCsv(rows: GroupProfile[]) {
  const headers = ['name_th', 'nickname', 'major', 'admission_round', 'main_group', 'subgroup'];
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      [
        row.name_th,
        row.nickname,
        majorLabel(row.major),
        row.admission_round,
        row.group_assignment?.main_group,
        row.group_assignment?.subgroup,
      ]
        .map(csvEscape)
        .join(','),
    ),
  ].join('\n');
  downloadBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }), `group-assignments-${new Date().toISOString().slice(0, 10)}.csv`);
}

export async function exportGroupsXlsx(rows: GroupProfile[], stats: GroupStats[]) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TFBP';

  const participants = workbook.addWorksheet('Full participant list');
  participants.columns = [
    { header: 'Name TH', key: 'name_th', width: 28 },
    { header: 'Nickname', key: 'nickname', width: 16 },
    { header: 'Major', key: 'major', width: 42 },
    { header: 'Admission Round', key: 'admission_round', width: 18 },
    { header: 'Registration Order', key: 'registration_order', width: 18 },
    { header: 'Medical Flags', key: 'medical_flags', width: 16 },
    { header: 'Main Group', key: 'main_group', width: 14 },
    { header: 'Subgroup', key: 'subgroup', width: 10 },
  ];
  rows.forEach((row) =>
    participants.addRow({
      name_th: row.name_th,
      nickname: row.nickname,
      major: majorLabel(row.major),
      admission_round: row.admission_round,
      registration_order: row.registration_order,
      medical_flags: [row.food_allergy, row.disease, row.drug_allergy].filter((value) => value && value !== '-').length,
      main_group: row.group_assignment?.main_group,
      subgroup: row.group_assignment?.subgroup,
    }),
  );

  const summary = workbook.addWorksheet('Group summary');
  summary.addRow(['Group', 'Subgroup', 'Count', 'Warnings']);
  stats.forEach((item) => summary.addRow([item.main_group, item.subgroup, item.count, item.warnings.join(', ')]));

  const majorSheet = workbook.addWorksheet('Major distribution');
  majorSheet.addRow(['Group', 'Subgroup', 'Major', 'Count']);
  stats.forEach((item) => {
    Object.entries(item.majorCounts).forEach(([major, count]) => majorSheet.addRow([item.main_group, item.subgroup, major, count]));
  });

  const admissionSheet = workbook.addWorksheet('Admission distribution');
  admissionSheet.addRow(['Group', 'Subgroup', 'Admission/Registration Bucket', 'Count']);
  stats.forEach((item) => {
    Object.entries(item.registrationCounts).forEach(([round, count]) => admissionSheet.addRow([item.main_group, item.subgroup, round, count]));
  });

  const medicalSheet = workbook.addWorksheet('Medical distribution');
  medicalSheet.addRow(['Group', 'Subgroup', 'Medical Bucket', 'Count']);
  stats.forEach((item) => {
    Object.entries(item.medicalCounts).forEach(([bucket, count]) => medicalSheet.addRow([item.main_group, item.subgroup, bucket, count]));
  });

  const attendance = workbook.addWorksheet('Attendance sheet');
  attendance.addRow(['Group', 'Subgroup', 'Name TH', 'Nickname', 'Major Code', 'Check-in', 'Signature']);
  rows
    .sort((a, b) => `${a.group_assignment?.main_group}-${a.group_assignment?.subgroup}-${a.name_th}`.localeCompare(`${b.group_assignment?.main_group}-${b.group_assignment?.subgroup}-${b.name_th}`))
    .forEach((row) =>
      attendance.addRow([
        row.group_assignment?.main_group,
        row.group_assignment?.subgroup,
        row.name_th,
        row.nickname,
        getMajorCode(row.major),
        '',
        '',
      ]),
    );

  workbook.worksheets.forEach((sheet) => {
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `group-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
