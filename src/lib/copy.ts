export const copy = {
  th: {
    hiddenForPrivacy: 'ซ่อนเพื่อความเป็นส่วนตัว',
    tryNicknameOrMajor: 'ลองค้นด้วยชื่อเล่นหรือสาขา',
    importCommit: 'นำเข้าข้อมูลจริง',
    syncStaffRoster: 'ซิงค์ข้อมูลทีมงาน',
    generatedRememberSave: 'จัดกลุ่มใหม่แล้ว อย่าลืมกดบันทึก',
    medicalVisible: 'ข้อมูลสุขภาพที่มองเห็น',
    clearGroups: 'ลบการจัดกลุ่มทั้งหมด',
  },
  en: {
    hiddenForPrivacy: 'Hidden for privacy',
    tryNicknameOrMajor: 'Try searching by nickname or major',
    importCommit: 'Commit import',
    syncStaffRoster: 'Sync staff roster',
    generatedRememberSave: 'Groups regenerated. Remember to save.',
    medicalVisible: 'Visible medical data',
    clearGroups: 'Clear all groups',
  },
};

export type CopyLanguage = keyof typeof copy;
