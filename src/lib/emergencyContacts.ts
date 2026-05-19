export type EmergencyPriority = 'critical' | 'high' | 'medium';

export type EmergencyContact = {
  name: string;
  nameTh: string;
  category: 'medical' | 'university' | 'police' | 'fire' | 'mental_health' | 'rescue';
  phone: string;
  priority: EmergencyPriority;
  available_24h: boolean;
  description?: string;
  descriptionTh?: string;
};

type EmergencySection = {
  title: string;
  titleTh: string;
  description: string;
  descriptionTh: string;
  categories: EmergencyContact['category'][];
  priorities: EmergencyPriority[];
};

export const emergencyContacts: EmergencyContact[] = [
  {
    name: 'Head Medic Staff',
    nameTh: 'หัวหน้าทีมพยาบาล',
    category: 'medical',
    phone: '0636510902',
    priority: 'critical',
    available_24h: true,
    description: 'Primary medical escalation for event operations',
    descriptionTh: 'ผู้ประสานงานการแพทย์หลักของกิจกรรม',
  },
  {
    name: 'EMS',
    nameTh: 'หน่วยแพทย์ฉุกเฉิน',
    category: 'medical',
    phone: '1669',
    priority: 'critical',
    available_24h: true,
    description: 'National emergency medical service',
    descriptionTh: 'บริการแพทย์ฉุกเฉินแห่งชาติ',
  },
  {
    name: 'University Hospital',
    nameTh: 'โรงพยาบาลมหาวิทยาลัย',
    category: 'university',
    phone: '053936150',
    priority: 'critical',
    available_24h: true,
    description: 'University hospital emergency contact',
    descriptionTh: 'เบอร์ติดต่อฉุกเฉินโรงพยาบาลมหาวิทยาลัย',
  },
  {
    name: 'Police',
    nameTh: 'ตำรวจ',
    category: 'police',
    phone: '191',
    priority: 'high',
    available_24h: true,
  },
  {
    name: 'Fire Department',
    nameTh: 'ดับเพลิง',
    category: 'fire',
    phone: '199',
    priority: 'high',
    available_24h: true,
  },
  {
    name: 'Poison Center',
    nameTh: 'ศูนย์พิษวิทยา',
    category: 'medical',
    phone: '1367',
    priority: 'medium',
    available_24h: true,
  },
  {
    name: 'Mental Health Hotline',
    nameTh: 'สายด่วนสุขภาพจิต',
    category: 'mental_health',
    phone: '1323',
    priority: 'medium',
    available_24h: true,
  },
  {
    name: 'Chiang Mai Municipal Special Rescue Station',
    nameTh: 'สถานีหน่วยกู้ภัยพิเศษเทศบาลนครเชียงใหม่',
    category: 'rescue',
    phone: '053232974',
    priority: 'medium',
    available_24h: true,
    description: 'Local rescue service for Chiang Mai city area. Alternate numbers: 053-259-353-5.',
    descriptionTh: 'ให้บริการในเขตตัวเมือง เบอร์สำรอง: 053-259-353-5',
  },
];

export const emergencySections: EmergencySection[] = [
  {
    title: 'Critical Emergency',
    titleTh: 'เหตุฉุกเฉินวิกฤต',
    description: 'Life-threatening symptoms, loss of consciousness, severe allergic reaction, chest pain, major injury.',
    descriptionTh: 'อาการอันตรายถึงชีวิต หมดสติ แพ้รุนแรง เจ็บหน้าอก หรือบาดเจ็บหนัก',
    categories: ['medical', 'university'],
    priorities: ['critical'],
  },
  {
    title: 'Medical Support',
    titleTh: 'สนับสนุนทางการแพทย์',
    description: 'Medical advice, poisoning, allergy follow-up, non-life-threatening symptoms.',
    descriptionTh: 'ปรึกษาอาการ พิษ แพ้ยา/อาหาร หรืออาการที่ยังไม่ถึงขั้นวิกฤต',
    categories: ['medical'],
    priorities: ['high', 'medium'],
  },
  {
    title: 'Security Support',
    titleTh: 'ความปลอดภัยและเหตุการณ์',
    description: 'Crowd safety, violence, traffic incident, fire, lost participant, or campus security escalation.',
    descriptionTh: 'ความปลอดภัยฝูงชน เหตุรุนแรง จราจร ไฟไหม้ ผู้เข้าร่วมหาย หรือประสานความปลอดภัย',
    categories: ['police', 'fire', 'rescue'],
    priorities: ['high', 'medium'],
  },
  {
    title: 'Mental Health Support',
    titleTh: 'สนับสนุนสุขภาพจิต',
    description: 'Panic attack, severe stress, self-harm concern, or urgent psychological support.',
    descriptionTh: 'แพนิค เครียดรุนแรง เสี่ยงทำร้ายตัวเอง หรือขอความช่วยเหลือด้านจิตใจเร่งด่วน',
    categories: ['mental_health'],
    priorities: ['medium'],
  },
];

export const priorityRank: Record<EmergencyPriority, number> = {
  critical: 1,
  high: 2,
  medium: 3,
};

export const priorityLabel: Record<EmergencyPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
};
