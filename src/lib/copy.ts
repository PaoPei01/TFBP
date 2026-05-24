export const copy = {
  th: {
    hiddenForPrivacy: 'ซ่อนเพื่อความเป็นส่วนตัว',
    tryNicknameOrMajor: 'ลองค้นด้วยชื่อเล่น สาขา หรือคำที่ใกล้เคียง',
    tryPublicSearch: 'ยังไม่พบรายชื่อที่ตรงกัน ลองล้างตัวกรองหรือค้นหาด้วยชื่อเล่น สาขา หรือชื่อภาษาอังกฤษ',
    importCommit: 'นำเข้าข้อมูลจริง',
    syncStaffRoster: 'ซิงค์ข้อมูลทีมงาน',
    staffLogin: 'เข้าสู่ระบบทีมงาน',
    staffAccount: 'บัญชีทีมงาน',
    staffHome: 'หน้าทีมงาน',
    adminDashboard: 'แดชบอร์ดแอดมิน',
    clearFilters: 'ล้างตัวกรอง',
    generatedRememberSave: 'จัดกลุ่มใหม่แล้ว อย่าลืมกดบันทึก',
    medicalVisible: 'ข้อมูลที่ต้องดูแลเป็นพิเศษ',
    clearGroups: 'ลบการจัดกลุ่มทั้งหมด',
  },
  en: {
    hiddenForPrivacy: 'Hidden for privacy',
    tryNicknameOrMajor: 'Try a nickname, major, or similar keyword.',
    tryPublicSearch: 'No matching participants found. Try clearing filters or searching by nickname, major, or English name.',
    importCommit: 'Commit import',
    syncStaffRoster: 'Sync staff roster',
    staffLogin: 'Staff Login',
    staffAccount: 'Staff Account',
    staffHome: 'Staff Home',
    adminDashboard: 'Admin Dashboard',
    clearFilters: 'Clear filters',
    generatedRememberSave: 'Groups regenerated. Remember to save.',
    medicalVisible: 'Needs special care',
    clearGroups: 'Clear all groups',
  },
};

export type CopyLanguage = keyof typeof copy;
