// All data in this file is fake and for Feature Lab preview only. Do not put real personal data here.

export type LabStationStatus = 'ready' | 'warning' | 'needs_attention';
export type LabEquipmentStatus = 'ready' | 'missing' | 'checking';
export type LabAreaStatus = 'ready' | 'crowded' | 'rain_risk' | 'checking';
export type LabIncidentPriority = 'low' | 'medium' | 'high';
export type LabIncidentStatus = 'open' | 'in_progress' | 'resolved';
export type LabRoundStatus = 'doing_activity' | 'preparing_to_move' | 'arrived' | 'delayed';

export const featureLabEvent = {
  name_th: 'Entaneer Gear 56',
  secondary_name_th: 'สานสัมพันธ์ 69',
  date_th: 'วันเสาร์ที่ 20 มิถุนายน 2569',
  location_th: 'คณะวิศวกรรมศาสตร์ มหาวิทยาลัยเชียงใหม่',
  group_count: 7,
  station_count: 7,
  staff_total: 226,
  total_expected: 1276,
} as const;

export const featureLabStations = [
  { station_number: 1, location_th: 'อาคารฤทธา', departments: ['CE', 'CIE'], required_staff: 16, checked_in_staff: 15, equipment_status: 'ready', area_status: 'ready', overall_status: 'ready', note_th: 'ทีมฐานพร้อม เหลือเช็กป้ายทางเข้าอีกครั้ง' },
  { station_number: 2, location_th: 'อาคาร SMC HUB', departments: ['EE', 'EESG'], required_staff: 16, checked_in_staff: 13, equipment_status: 'checking', area_status: 'ready', overall_status: 'warning', note_th: 'รอทีมงานเพิ่มและตรวจอุปกรณ์เสียง' },
  { station_number: 3, location_th: 'โรงอาหาร ชั้น 1', departments: ['ME', 'MEPM'], required_staff: 16, checked_in_staff: 16, equipment_status: 'ready', area_status: 'crowded', overall_status: 'warning', note_th: 'พื้นที่เริ่มหนาแน่น ควรจัดทางเดินให้ชัด' },
  { station_number: 4, location_th: 'อาคารเรียนรวม 3 ชั้น', departments: ['IE', 'IEL'], required_staff: 16, checked_in_staff: 12, equipment_status: 'missing', area_status: 'checking', overall_status: 'needs_attention', note_th: 'ขาดอุปกรณ์หลัก 1 รายการและต้องเช็กพื้นที่' },
  { station_number: 5, location_th: 'อาคาร 30 ปี / ตึก 8 ชั้น', departments: ['ENVI', 'MNP'], required_staff: 16, checked_in_staff: 10, equipment_status: 'checking', area_status: 'rain_risk', overall_status: 'needs_attention', note_th: 'ต้องเตรียมแผนสำรองในร่ม' },
  { station_number: 6, location_th: 'อาคารเรียนรวม 4 ชั้น', departments: ['CPE', 'ISNE'], required_staff: 16, checked_in_staff: 14, equipment_status: 'ready', area_status: 'rain_risk', overall_status: 'warning', note_th: 'พร้อมกิจกรรม แต่เสี่ยงฝนด้านนอก' },
  { station_number: 7, location_th: 'โรงอาหาร ชั้น 2', departments: ['RAI', 'IGE', 'IGME'], required_staff: 16, checked_in_staff: 15, equipment_status: 'ready', area_status: 'ready', overall_status: 'ready', note_th: 'ฐานพร้อมและพื้นที่ไหลเวียนดี' },
] as const satisfies Array<{
  station_number: number;
  location_th: string;
  departments: string[];
  required_staff: number;
  checked_in_staff: number;
  equipment_status: LabEquipmentStatus;
  area_status: LabAreaStatus;
  overall_status: LabStationStatus;
  note_th: string;
}>;

export const featureLabIncidents = [
  { id: 'incident-1', title_th: 'น้องหากลุ่มไม่เจอ', location_th: 'หน้าอาคารฤทธา', forward_to: 'พี่กลุ่ม', priority: 'medium', status: 'open', created_at: '08:42', updated_at: '08:44' },
  { id: 'incident-2', title_th: 'ผู้เข้าร่วมรู้สึกไม่สบาย', location_th: 'โรงอาหาร ชั้น 1', forward_to: 'ฝ่ายพยาบาล', priority: 'high', status: 'in_progress', created_at: '09:10', updated_at: '09:16' },
  { id: 'incident-3', title_th: 'ฝนตกบริเวณฐานกิจกรรม', location_th: 'อาคารเรียนรวม 4 ชั้น', forward_to: 'ทีมระบบ / หัวหน้าฐาน', priority: 'medium', status: 'open', created_at: '10:05', updated_at: '10:07' },
  { id: 'incident-4', title_th: 'จุดลงทะเบียนแออัด', location_th: 'โรงอาหาร ชั้น 1', forward_to: 'ฝ่ายลงทะเบียน / จราจร', priority: 'medium', status: 'resolved', created_at: '08:18', updated_at: '08:35' },
] as const satisfies Array<{
  id: string;
  title_th: string;
  location_th: string;
  forward_to: string;
  priority: LabIncidentPriority;
  status: LabIncidentStatus;
  created_at: string;
  updated_at: string;
}>;

export const featureLabRounds = ['รอบลงทะเบียน', 'รอบฐานช่วงเช้า', 'พักกลางวัน', 'รอบฐานช่วงบ่าย', 'สรุปกิจกรรม'] as const;

export const featureLabGroups = ['แดง A/B', 'น้ำเงิน A/B', 'เขียว A/B', 'เหลือง A/B', 'ส้ม A/B', 'ม่วง A/B', 'ชมพู A/B'] as const;

export const featureLabBroadcasts = [
  'อีก 5 นาทีเตรียมย้ายฐาน',
  'ฐาน 3 ให้ชะลอการปล่อยกลุ่ม',
  'ฝนเริ่มตก ให้ทุกฐานเตรียมแผนในร่ม',
  'ทีมงานที่ยังไม่เช็กชื่อ กรุณาเช็กชื่อก่อนเริ่มกิจกรรม',
] as const;

export const featureLabChecklistItems = [
  'ทีมงานประจำฐานมาครบ',
  'อุปกรณ์กิจกรรมพร้อม',
  'ป้าย/สื่อพร้อม',
  'พื้นที่ปลอดภัย',
  'น้ำดื่ม/ของจำเป็นพร้อม',
  'แผนสำรองกรณีฝนตกพร้อม',
] as const;
