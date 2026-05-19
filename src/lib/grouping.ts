import { getMajorCode } from './major';
import { groupKey, mainGroups, subgroups } from './groups';
import type { GroupAssignment, GroupStats, MainGroup, Profile, Subgroup } from './types';

export type AssignmentInput = Pick<
  Profile,
  'id' | 'major' | 'admission_round' | 'gender' | 'registration_order' | 'form_submitted_at' | 'food_allergy' | 'disease' | 'drug_allergy'
>;
export type AssignmentDraft = Pick<GroupAssignment, 'profile_id' | 'main_group' | 'subgroup' | 'notes'>;

const subgroupCapacity = 75;
const sizeWeight = 4.6;
const majorWeight = 9.2;
const registrationWeight = 2.6;
const medicalWeight = 1.8;
const admissionWeight = 1.2;

function allBuckets() {
  return mainGroups.flatMap((mainGroup, mainIndex) => {
    const orderedSubgroups = mainIndex % 2 === 0 ? subgroups : [...subgroups].reverse();
    return orderedSubgroups.map((subgroup) => ({ main_group: mainGroup, subgroup, key: groupKey(mainGroup, subgroup) }));
  });
}

function emptyStats(): GroupStats[] {
  return mainGroups.flatMap((main_group) =>
    subgroups.map((subgroup) => ({
      key: groupKey(main_group, subgroup),
      main_group,
      subgroup,
      count: 0,
      capacity: subgroupCapacity,
      majorCounts: {},
      admissionCounts: {},
      registrationCounts: {},
      medicalCounts: {},
      genderCounts: {},
      warnings: [],
    })),
  );
}

function increment(stats: GroupStats, profile: AssignmentInput) {
  const major = getMajorCode(profile.major) || 'Unknown';
  const admission = profile.admission_round || 'Unknown';
  const registration = registrationBucket(profile);
  const medical = medicalBucket(profile);
  const gender = profile.gender || 'Unknown';
  stats.count += 1;
  stats.majorCounts[major] = (stats.majorCounts[major] ?? 0) + 1;
  stats.admissionCounts[admission] = (stats.admissionCounts[admission] ?? 0) + 1;
  stats.registrationCounts[registration] = (stats.registrationCounts[registration] ?? 0) + 1;
  stats.medicalCounts[medical] = (stats.medicalCounts[medical] ?? 0) + 1;
  stats.genderCounts[gender] = (stats.genderCounts[gender] ?? 0) + 1;
}

function hasValue(value?: string | null) {
  return Boolean(value && value.trim() && !['-', 'ไม่มี', 'none', 'no', 'n/a'].includes(value.trim().toLowerCase()));
}

function medicalBucket(profile: AssignmentInput) {
  const flags = [hasValue(profile.food_allergy), hasValue(profile.disease), hasValue(profile.drug_allergy)].filter(Boolean).length;
  if (flags >= 2) return 'medical-multiple';
  if (flags === 1) return 'medical-one';
  return 'medical-none';
}

function registrationBucket(profile: AssignmentInput) {
  if (profile.registration_order) return `registration-${Math.ceil(profile.registration_order / 25)}`;
  if (profile.form_submitted_at) {
    const date = new Date(profile.form_submitted_at);
    if (!Number.isNaN(date.getTime())) return `hour-${date.getHours()}`;
  }
  return 'registration-unknown';
}

export function calculateGroupStats(profiles: AssignmentInput[], assignments: Pick<GroupAssignment, 'profile_id' | 'main_group' | 'subgroup'>[]): GroupStats[] {
  const stats = emptyStats();
  const byProfile = new Map(profiles.map((profile) => [profile.id, profile]));

  for (const assignment of assignments) {
    const profile = byProfile.get(assignment.profile_id);
    const target = stats.find((item) => item.main_group === assignment.main_group && item.subgroup === assignment.subgroup);
    if (profile && target) increment(target, profile);
  }

  for (const item of stats) {
    const majorMax = Math.max(0, ...Object.values(item.majorCounts));
    const admissionMax = Math.max(0, ...Object.values(item.admissionCounts));
    const registrationMax = Math.max(0, ...Object.values(item.registrationCounts));
    const medicalOne = item.medicalCounts['medical-one'] ?? 0;
    const medicalMultiple = item.medicalCounts['medical-multiple'] ?? 0;
    if (item.count > subgroupCapacity + 8) item.warnings.push('ขนาดกลุ่มเกินเป้าหมายมาก');
    if (item.count < subgroupCapacity - 8 && profiles.length >= subgroupCapacity * 10) item.warnings.push('ขนาดกลุ่มต่ำกว่าเป้าหมาย');
    if (item.count > 0 && majorMax / item.count > 0.34) item.warnings.push('สาขาใดสาขาหนึ่งกระจุกตัวสูง');
    if (item.count > 0 && registrationMax / item.count > 0.48) item.warnings.push('ช่วงเวลาลงทะเบียนกระจุกตัวสูง');
    if (item.count > 0 && admissionMax / item.count > 0.7 && Object.keys(item.admissionCounts).length > 1) item.warnings.push('รอบการรับเข้ากระจุกตัวสูง');
    if (medicalMultiple > 3 || medicalOne + medicalMultiple > Math.max(6, item.count * 0.24)) item.warnings.push('ผู้มีเงื่อนไขด้านการแพทย์กระจุกตัวสูง');
  }

  return stats;
}

export function autoAssignGroups(profiles: AssignmentInput[], existingAssignments: Pick<GroupAssignment, 'profile_id' | 'main_group' | 'subgroup' | 'locked'>[] = []): AssignmentDraft[] {
  const locked = existingAssignments.filter((assignment) => assignment.locked);
  const lockedIds = new Set(locked.map((assignment) => assignment.profile_id));
  const sortable = profiles
    .filter((profile) => !lockedIds.has(profile.id))
    .sort((a, b) =>
      `${getMajorCode(a.major)}-${registrationBucket(a)}-${medicalBucket(a)}-${a.registration_order ?? 999999}-${a.id}`.localeCompare(
        `${getMajorCode(b.major)}-${registrationBucket(b)}-${medicalBucket(b)}-${b.registration_order ?? 999999}-${b.id}`,
      ),
    );

  const buckets = allBuckets();
  const drafts: AssignmentDraft[] = locked.map((assignment) => ({
    profile_id: assignment.profile_id,
    main_group: assignment.main_group,
    subgroup: assignment.subgroup,
    notes: 'locked',
  }));
  const stats = calculateGroupStats(profiles, drafts);

  sortable.forEach((profile, index) => {
    const orderedBuckets = index % 2 === 0 ? buckets : [...buckets].reverse();
    let best = orderedBuckets[0];
    let bestScore = Number.POSITIVE_INFINITY;

    for (const bucket of orderedBuckets) {
      const bucketStats = stats.find((item) => item.key === bucket.key);
      if (!bucketStats) continue;
      const major = getMajorCode(profile.major) || 'Unknown';
      const admission = profile.admission_round || 'Unknown';
      const registration = registrationBucket(profile);
      const medical = medicalBucket(profile);
      const score =
        bucketStats.count * sizeWeight +
        (bucketStats.majorCounts[major] ?? 0) * majorWeight +
        (bucketStats.registrationCounts[registration] ?? 0) * registrationWeight +
        (bucketStats.medicalCounts[medical] ?? 0) * medicalWeight +
        (bucketStats.admissionCounts[admission] ?? 0) * admissionWeight;

      if (score < bestScore) {
        best = bucket;
        bestScore = score;
      }
    }

    drafts.push({ profile_id: profile.id, main_group: best.main_group, subgroup: best.subgroup, notes: 'auto-balanced' });
    const target = stats.find((item) => item.key === best.key);
    if (target) increment(target, profile);
  });

  return drafts;
}

export function rebalanceGroups(profiles: AssignmentInput[], assignments: Pick<GroupAssignment, 'profile_id' | 'main_group' | 'subgroup' | 'locked'>[]) {
  return autoAssignGroups(profiles, assignments);
}

export function lockGroupAssignments(assignments: GroupAssignment[], userId: string, lockedAt = new Date().toISOString()): GroupAssignment[] {
  return assignments.map((assignment) => ({
    ...assignment,
    locked: true,
    locked_by: userId,
    locked_at: lockedAt,
  }));
}

export function groupLabel(mainGroup?: MainGroup | null, subgroup?: Subgroup | null, language: 'th' | 'en' = 'th') {
  if (!mainGroup || !subgroup) return language === 'th' ? 'ยังไม่จัดกลุ่ม' : 'Not assigned';
  const labels: Record<MainGroup, string> = {
    Red: language === 'th' ? 'สีแดง' : 'Red',
    Blue: language === 'th' ? 'สีน้ำเงิน' : 'Blue',
    Yellow: language === 'th' ? 'สีเหลือง' : 'Yellow',
    Green: language === 'th' ? 'สีเขียว' : 'Green',
    Pink: language === 'th' ? 'สีชมพู' : 'Pink',
    Purple: language === 'th' ? 'สีม่วง' : 'Purple',
    Orange: language === 'th' ? 'สีส้ม' : 'Orange',
  };
  return `${labels[mainGroup]} · Group ${subgroup}`;
}
