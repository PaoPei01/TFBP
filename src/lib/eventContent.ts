export type EventContent = {
  slug: string;
  public: {
    titleTh: string;
    titleEn: string;
    summaryTh: string;
    summaryEn?: string;
    targetAudienceTh: string;
    eventDateTh: string;
    eventTimeTh?: string;
    rehearsalDateTh?: string;
    locationTh: string;
    capacityTh?: string;
    dressCodeTh?: string[];
    publicNoteTh?: string;
  };
  participantSummary?: {
    expectedFreshmen: number;
    confirmedEstimate: number;
    staffTotal: number;
    totalExpected: number;
    groupCount: number;
    participantsPerColor: number;
    subgroupsPerColor: number;
    participantsPerSubgroup: number;
    publicCopyTh: string;
  };
  objectives?: Array<{ titleTh: string; descriptionTh: string }>;
  scheduleItems?: Array<{ start: string; end?: string; titleTh: string; type: string }>;
  stations?: Array<{ number: number; locationTh: string; departments: string[]; staffQuota?: number }>;
  staffRoleQuotas?: Array<{ role: string; labelTh: string; quota: number }>;
  registrationPoints?: Array<{ locationTh: string; noteTh: string }>;
  budgetItems?: Array<{ labelTh: string; quantityTh?: string; amount: number }>;
  budgetTotal?: number;
  contingencyPlans?: Array<{ conditionTh: string; publicSummaryTh: string; staffDetailTh: string }>;
  staffRecruitment?: {
    capacity: number;
    eligibleYears: number[];
    workDateTh: string;
    rehearsalDateTh: string;
    rehearsalTimeTh: string;
    dressCodeTh: string;
    clothingNoteTh?: string;
    clothingNoteEn?: string;
    dutiesTh: string[];
    lineGroup?: {
      labelTh: string;
      labelEn: string;
      url: string;
      qrImagePath?: string;
      noteTh: string;
      noteEn: string;
    };
    importantDatesTh: Array<{ dateTh: string; titleTh: string; noteTh?: string }>;
    applicationFields: Array<{
      key: string;
      labelTh: string;
      type: 'text' | 'textarea' | 'select' | 'checkbox' | 'multiselect' | 'radio';
      required?: boolean;
      optionsTh?: string[];
      helpTh?: string;
    }>;
    consentItemsTh: string[];
  };
};

export const eventContentBySlug: Record<string, EventContent> = {
  'entaneer-bonding-69': {
    slug: 'entaneer-bonding-69',
    public: {
      titleTh: 'Entaneer Gear 56',
      titleEn: 'Entaneer Gear 56',
      summaryTh: 'กิจกรรมต้อนรับนักศึกษาใหม่คณะวิศวกรรมศาสตร์ มหาวิทยาลัยเชียงใหม่ เพื่อให้น้องใหม่ได้รู้จักสถานที่ วัฒนธรรมคณะ เพื่อนใหม่ และรุ่นพี่ ผ่านกิจกรรมฐาน 7 ฐาน',
      summaryEn: 'A welcoming activity for new Engineering students at Chiang Mai University through seven station-based activities.',
      targetAudienceTh: 'นักศึกษาใหม่ คณะวิศวกรรมศาสตร์ TCAS69',
      eventDateTh: 'วันเสาร์ที่ 20 มิถุนายน 2569',
      eventTimeTh: '08:00 - 17:15 น.',
      rehearsalDateTh: 'วันศุกร์ที่ 13 มิถุนายน 2569',
      locationTh: 'คณะวิศวกรรมศาสตร์ มหาวิทยาลัยเชียงใหม่',
      dressCodeTh: [
        'รุ่นน้อง: เสื้อยืดสีดำ กางเกงยีนส์ขายาว รองเท้าผ้าใบ',
        'สตาฟ: เสื้อโปโลธีมวิศวฯ มช. กางเกงยีนส์ขายาว รองเท้าผ้าใบ',
      ],
      publicNoteTh: 'ข้อมูลสาธารณะของผู้เข้าร่วมจะแสดงเท่าที่จำเป็น ข้อมูลติดต่อและสุขภาพจะถูกซ่อนไว้',
    },
    participantSummary: {
      expectedFreshmen: 1050,
      confirmedEstimate: 1203,
      staffTotal: 226,
      totalExpected: 1276,
      groupCount: 7,
      participantsPerColor: 150,
      subgroupsPerColor: 2,
      participantsPerSubgroup: 75,
      publicCopyTh: 'คาดการณ์ผู้เข้าร่วมทั้งหมดประมาณ 1,276 คน แบ่งนักศึกษาใหม่ออกเป็น 7 สี สีละประมาณ 150 คน และแบ่งย่อยเป็นกลุ่ม A/B เพื่อความคล่องตัวในการเดินฐาน',
    },
    objectives: [
      { titleTh: 'รู้จักที่', descriptionTh: 'ทำความคุ้นเคยกับสถานที่สำคัญภายในคณะวิศวกรรมศาสตร์ เพื่อให้นักศึกษาใหม่มั่นใจในการใช้ชีวิตและการเรียน' },
      { titleTh: 'รู้จักเรา', descriptionTh: 'เข้าใจวัฒนธรรม อัตลักษณ์ และความเป็นวิศวฯ มช.' },
      { titleTh: 'รู้จักกัน', descriptionTh: 'สร้างความสัมพันธ์ระหว่างเพื่อนใหม่ รุ่นพี่ และทีมงาน ส่งเสริมความสามัคคีและการทำงานเป็นทีม' },
    ],
    staffRoleQuotas: [
      { role: 'management', labelTh: 'ทีมบริหาร', quota: 7 },
      { role: 'group_mentor', labelTh: 'พี่กลุ่ม', quota: 70 },
      { role: 'station_staff', labelTh: 'พี่ฐานประจำกิจกรรม', quota: 112 },
      { role: 'timer', labelTh: 'ฝ่ายไทม์เมอร์', quota: 9 },
      { role: 'medical', labelTh: 'ฝ่ายพยาบาล', quota: 9 },
      { role: 'entertainment', labelTh: 'สตาฟให้ความบันเทิง', quota: 4 },
      { role: 'welfare', labelTh: 'ฝ่ายสวัสดิการ', quota: 8 },
      { role: 'traffic', labelTh: 'ฝ่ายจราจร', quota: 13 },
      { role: 'photographer', labelTh: 'ฝ่ายช่างภาพ', quota: 7 },
    ],
    stations: [
      { number: 1, locationTh: 'อาคารฤทธา', departments: ['CE', 'CIE'], staffQuota: 16 },
      { number: 2, locationTh: 'อาคาร SMC HUB', departments: ['EE', 'EESG'], staffQuota: 16 },
      { number: 3, locationTh: 'โรงอาหาร ชั้น 1', departments: ['ME', 'MEPM'], staffQuota: 16 },
      { number: 4, locationTh: 'อาคารเรียนรวม 3 ชั้น', departments: ['IE', 'IEL'], staffQuota: 16 },
      { number: 5, locationTh: 'อาคาร 30 ปี / ตึก 8 ชั้น', departments: ['ENVI', 'MNP'], staffQuota: 16 },
      { number: 6, locationTh: 'อาคารเรียนรวม 4 ชั้น', departments: ['CPE', 'ISNE'], staffQuota: 16 },
      { number: 7, locationTh: 'โรงอาหาร ชั้น 2', departments: ['RAI', 'IGE', 'IGME'], staffQuota: 16 },
    ],
    registrationPoints: [
      { locationTh: 'อาคารฤทธา', noteTh: 'จุดลงทะเบียนของน้องจำนวน 5 สี' },
      { locationTh: 'โรงอาหาร ชั้น 1', noteTh: 'จุดลงทะเบียนของน้องจำนวน 2 สี' },
    ],
    scheduleItems: [
      { start: '08:00', end: '08:30', titleTh: 'ลงทะเบียนเข้าร่วมงาน', type: 'registration' },
      { start: '08:30', end: '08:45', titleTh: 'กิจกรรม Cover Dance', type: 'performance' },
      { start: '08:45', end: '09:00', titleTh: 'การแสดงต้อนรับจากผู้นำเชียร์คณะฯ', type: 'performance' },
      { start: '09:00', end: '09:20', titleTh: 'กิจกรรมสภาสัญจร และ สโมสัญจร', type: 'briefing' },
      { start: '09:20', end: '09:35', titleTh: 'ชี้แจงรายละเอียดกิจกรรม', type: 'briefing' },
      { start: '09:35', end: '09:45', titleTh: 'เดินแยกย้ายเข้าประจำฐาน', type: 'transition' },
      { start: '09:45', end: '10:25', titleTh: 'กิจกรรมฐานที่ 1', type: 'station' },
      { start: '10:35', end: '11:15', titleTh: 'กิจกรรมฐานที่ 2', type: 'station' },
      { start: '11:25', end: '12:05', titleTh: 'กิจกรรมฐานที่ 3', type: 'station' },
      { start: '12:05', end: '12:55', titleTh: 'พักรับประทานอาหารกลางวัน', type: 'meal' },
      { start: '13:05', end: '13:45', titleTh: 'กิจกรรมฐานที่ 4', type: 'station' },
      { start: '13:55', end: '14:35', titleTh: 'กิจกรรมฐานที่ 5', type: 'station' },
      { start: '14:35', end: '14:55', titleTh: 'พักเบรค รับประทานอาหารว่าง', type: 'break' },
      { start: '15:05', end: '15:45', titleTh: 'กิจกรรมฐานที่ 6', type: 'station' },
      { start: '15:55', end: '16:35', titleTh: 'กิจกรรมฐานที่ 7', type: 'station' },
      { start: '16:45', end: '17:15', titleTh: 'สรุปกิจกรรม ทำแบบประเมิน ถ่ายภาพหมู่ และเสร็จสิ้นโครงการ', type: 'closing' },
    ],
    contingencyPlans: [
      { conditionTh: 'ฝนตกก่อนเริ่มงาน', publicSummaryTh: 'หากฝนตกก่อนเริ่มงาน จะปรับพื้นที่กิจกรรมไปยังอาคารในร่ม และแจ้งจุดรวมพลผ่านประกาศกิจกรรม', staffDetailTh: 'ฝั่งโรงอาหารแบ่งไปใช้โรงอาหารชั้น 1 และ 2 ส่วนฝั่งอาคารฤทธากระจายไปอาคารฤทธาและ SMC HUB โดยให้สตาฟเดินวนไปหาน้อง' },
      { conditionTh: 'ฝนตกเบาระหว่างกิจกรรม', publicSummaryTh: 'กิจกรรมอาจดำเนินต่อโดยมีสตาฟดูแลความปลอดภัยอย่างใกล้ชิด', staffDetailTh: 'พี่สตาฟประจำฐานดูแลความปลอดภัย ตรวจพื้นลื่น จุดเสี่ยง และปรับรูปแบบกิจกรรมตามความเหมาะสม' },
      { conditionTh: 'ฝนตกหนักระหว่างกิจกรรม', publicSummaryTh: 'จะหยุดการเดินเวียนฐานชั่วคราวและให้อยู่ในพื้นที่ปลอดภัย', staffDetailTh: 'ให้น้องหลบฝนในร่มของฐานนั้น ๆ และใช้กิจกรรมสำรองเพื่อรักษาความต่อเนื่อง' },
      { conditionTh: 'ฝนตกหลังเสร็จสิ้นกิจกรรม', publicSummaryTh: 'สตาฟจะดูแลให้อยู่ในอาคารจนกว่าสภาพอากาศปลอดภัย', staffDetailTh: 'ฝ่ายสันทนาการและความบันเทิงจัดกิจกรรมในร่มและดูแลน้องจนกว่าฝนจะหยุดหรือซาลง' },
    ],
    budgetItems: [
      { labelTh: 'ค่าอาหารกลางวัน', quantityTh: '1,276 กล่อง x 40 บาท', amount: 51040 },
      { labelTh: 'ค่าอาหารว่าง', quantityTh: '1,276 ชุด x 10 บาท', amount: 12760 },
      { labelTh: 'น้ำดื่มถ้วย', quantityTh: '30 ลัง x 112 บาท', amount: 3360 },
      { labelTh: 'ค่ากิจกรรมและอุปกรณ์ประจำฐาน', quantityTh: '7 ฐาน x 500 บาท', amount: 3500 },
      { labelTh: 'กระดาษทำป้ายชื่อขนาด A3', quantityTh: '180 แผ่น', amount: 3600 },
      { labelTh: 'อุปกรณ์จิปาถะอื่น ๆ', quantityTh: 'เชือกเกลียวขาว, ถุงขยะ', amount: 650 },
    ],
    budgetTotal: 74910,
  },
  'parent-orientation-staff-2569': {
    slug: 'parent-orientation-staff-2569',
    public: {
      titleTh: 'เปิดรับสตาฟงานปฐมนิเทศนักศึกษาใหม่ ประจำปีการศึกษา 2569',
      titleEn: 'Freshmen Orientation Staff Recruitment 2026',
      summaryTh: 'เปิดรับสมัครสตาฟช่วยงานปฐมนิเทศนักศึกษาใหม่ ประจำปีการศึกษา 2569 สำหรับนักศึกษาชั้นปีที่ 2–3 โดยผู้สมัครเลือกตำแหน่งฝ่ายที่ต้องการสมัคร 1 ตำแหน่ง และผู้ดูแลสามารถปรับเปลี่ยนได้ตามความเหมาะสม',
      summaryEn: 'Staff recruitment for the 2026 Freshmen Orientation event for 2nd- and 3rd-year Engineering students. Applicants choose one preferred duty position, and admins may adjust assignments as needed.',
      targetAudienceTh: 'นักศึกษาชั้นปีที่ 2 และ 3',
      eventDateTh: 'วันที่ 12 มิถุนายน 2569',
      locationTh: 'คณะวิศวกรรมศาสตร์ มหาวิทยาลัยเชียงใหม่',
      capacityTh: 'รับจำนวนประมาณ 130 คน',
      dressCodeTh: ['ชุดช็อปถูกระเบียบ'],
      publicNoteTh: 'มีการจัดสรรฝ่ายเบื้องต้นตามโควต้า และอาจมีการปรับเปลี่ยนตามความเหมาะสม',
    },
    staffRecruitment: {
      capacity: 130,
      eligibleYears: [2, 3],
      workDateTh: 'วันที่ 12 มิถุนายน 2569',
      rehearsalDateTh: '10 มิถุนายน 2569',
      rehearsalTimeTh: '16:00 น.',
      dressCodeTh: 'ชุดช็อปถูกระเบียบ',
      clothingNoteTh: 'หมายเหตุเรื่องชุด: ผู้ที่มีชุดช็อปแล้ว ให้แต่งกายด้วยชุดช็อปถูกระเบียบในวันปฏิบัติงาน สำหรับผู้ที่ได้สั่งซื้อชุดช็อปไว้แล้วแต่ยังไม่ได้รับชุด ขอให้แจ้งสถานะไว้ในหมายเหตุเพิ่มเติม เพื่อให้ผู้ดูแลพิจารณาและประสานแนวทางการแต่งกายที่เหมาะสมอีกครั้ง',
      clothingNoteEn: 'Uniform note: Applicants who already have the workshop uniform should wear the proper workshop uniform on the event day. If you have already ordered the workshop uniform but have not received it yet, please mention this in the additional note so the admin team can coordinate an appropriate dress-code arrangement.',
      lineGroup: {
        labelTh: 'เข้ากลุ่มไลน์สตาฟงานปฐมนิเทศนักศึกษาใหม่',
        labelEn: 'Join the Freshmen Orientation Staff Line group',
        url: 'https://line.me/ti/g/8GpVr69MeL',
        qrImagePath: '/line-parent-orientation-staff-2569.png',
        noteTh: 'หลังส่งใบสมัครแล้ว สามารถเข้ากลุ่มไลน์นี้ได้ทันที เพื่อรับข่าวสาร การนัดหมาย และประกาศเพิ่มเติม',
        noteEn: 'After submitting your application, you may join this Line group immediately for updates, schedules, and announcements.',
      },
      dutiesTh: [
        'ฝ่ายจราจร (10 คน)',
        'ฝ่ายพยาบาล (5 คน)',
        'ฝ่ายลงทะเบียน (15 คน)',
        'ฝ่ายสวัสดิการ (10 คน)',
        'ฝ่ายสิทธิประโยชน์ (5 คน)',
        'ฝ่ายสนับสนุนระบบลงทะเบียน (IT) (3 คน)',
        'ฝ่ายประสานงานเวที (5 คน)',
        'ฝ่ายทั่วไป (77 คน)',
      ],
      importantDatesTh: [
        { dateTh: '30 พฤษภาคม 2569 เวลา 23:59 น.', titleTh: 'ปิดรับสมัครสตาฟ' },
        { dateTh: '10 มิถุนายน 2569 เวลา 16:00 น.', titleTh: 'ซ้อมบูม ร้องเพลงมาร์ชวิศวะ และชี้แจงรายละเอียดงาน', noteTh: 'ณ คณะวิศวกรรมศาสตร์ สถานที่จะแจ้งให้ทราบอีกครั้ง และเวลาอาจมีการเปลี่ยนแปลง' },
        { dateTh: '12 มิถุนายน 2569', titleTh: 'วันปฏิบัติงานจริง' },
      ],
      applicationFields: [
        { key: 'student_id', labelTh: 'รหัสนักศึกษา', type: 'text' },
        { key: 'email', labelTh: 'อีเมล CMU / อีเมลที่ใช้ติดต่อ', type: 'text', required: true },
        { key: 'phone', labelTh: 'เบอร์โทร', type: 'text', required: true },
        { key: 'preferred_duties', labelTh: 'ฝ่ายที่สนใจ', type: 'multiselect', required: true, optionsTh: ['ฝ่ายจราจร', 'ฝ่ายพยาบาล', 'ฝ่ายลงทะเบียน', 'ฝ่ายสวัสดิการ', 'ฝ่ายสิทธิประโยชน์', 'ฝ่ายสนับสนุนระบบลงทะเบียน (IT)', 'ฝ่ายประสานงานเวที', 'ฝ่ายทั่วไป'] },
        { key: 'can_attend_rehearsal', labelTh: 'สามารถเข้าซ้อมวันที่ 10 มิถุนายน 2569 เวลา 16:00 น. ได้หรือไม่', type: 'radio', required: true, optionsTh: ['ได้', 'ไม่ได้', 'ยังไม่แน่ใจ'] },
        { key: 'can_work_event_day', labelTh: 'ยืนยันว่าสามารถปฏิบัติงานวันที่ 12 มิถุนายน 2569 ได้หรือไม่', type: 'radio', required: true, optionsTh: ['ได้', 'ไม่ได้', 'ยังไม่แน่ใจ'] },
        { key: 'staff_experience', labelTh: 'เคยมีประสบการณ์เป็นสตาฟหรือไม่', type: 'textarea' },
        {
          key: 'health_or_limitations',
          labelTh: 'ท่านมีข้อจำกัดด้านสุขภาพ การแพ้อาหาร หรือการแพ้ยาที่จำเป็นต้องแจ้งหรือไม่',
          type: 'radio',
          optionsTh: ['ไม่มี', 'มี'],
          helpTh: 'หากเลือก “มี” ระบบจะแสดงช่องสำหรับระบุโรคประจำตัว การแพ้อาหาร การแพ้ยา หรือข้อจำกัดที่จำเป็นต่อการดูแลความปลอดภัยและการจัดสรรหน้าที่',
        },
        {
          key: 'workshop_uniform_status',
          labelTh: 'สถานะชุดช็อปของท่าน',
          type: 'radio',
          required: true,
          optionsTh: [
            'มีชุดช็อปแล้ว',
            'สั่งซื้อไว้แล้ว แต่ยังไม่ได้รับ',
            'ยังไม่มี / ต้องแจ้งผู้ดูแล',
          ],
          helpTh: 'ใช้สำหรับพิจารณาและประสานแนวทางการแต่งกายในวันปฏิบัติงาน',
        },
        { key: 'note', labelTh: 'หมายเหตุเพิ่มเติม', type: 'textarea' },
      ],
      consentItemsTh: [
        'ยืนยันว่าข้อมูลที่กรอกถูกต้อง',
        'ยินยอมให้ใช้ข้อมูลสำหรับการจัดสรรหน้าที่และติดต่อประสานงานกิจกรรมนี้',
        'รับทราบว่าหน้าที่อาจมีการเปลี่ยนแปลงหลังปิดรับสมัคร',
        'รับทราบว่าต้องแต่งกายด้วยชุดช็อปถูกระเบียบในวันปฏิบัติงาน หากสั่งซื้อชุดช็อปไว้แล้วแต่ยังไม่ได้รับ ให้แจ้งไว้ในหมายเหตุเพิ่มเติม',
      ],
    },
  },
};

export function getEventContent(slug?: string | null) {
  if (!slug) return null;
  return eventContentBySlug[slug] ?? null;
}
