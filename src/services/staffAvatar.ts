import { supabase } from '../lib/supabase';
import type { StaffPublicProfile } from '../lib/types';

export const AVATAR_BUCKET = 'staff-avatars';
export const MAX_AVATAR_ORIGINAL_BYTES = 5 * 1024 * 1024;
export const AVATAR_MAX_DIMENSION = 800;
export const AVATAR_WEBP_QUALITY = 0.85;

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type AvatarUploadResult = {
  avatar_path: string;
  signedUrl: string | null;
  bytes: number;
};

export function staffAvatarPath(staffProfileId: string) {
  return `staff/${staffProfileId}/avatar.webp`;
}

export function validateAvatarFile(file: File) {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw new Error('ประเภทไฟล์ไม่รองรับ รองรับเฉพาะ JPG, PNG, WEBP');
  }
  if (file.size > MAX_AVATAR_ORIGINAL_BYTES) {
    throw new Error('ไฟล์รูปใหญ่เกินไป รองรับขนาดไม่เกิน 5 MB');
  }
}

async function blobToImage(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('ไม่สามารถบีบอัดรูปได้'));
      else resolve(blob);
    }, type, quality);
  });
}

export async function resizeAvatarToWebp(
  file: File,
  options: { maxDimension?: number; quality?: number } = {},
) {
  validateAvatarFile(file);
  const maxDimension = options.maxDimension ?? AVATAR_MAX_DIMENSION;
  const quality = options.quality ?? AVATAR_WEBP_QUALITY;
  const image = await blobToImage(file);
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('ไม่สามารถเตรียมรูปสำหรับอัปโหลดได้');
  context.drawImage(image, 0, 0, width, height);

  try {
    return await canvasToBlob(canvas, 'image/webp', quality);
  } catch (error) {
    if (file.type === 'image/webp' && file.size <= 300 * 1024) return file;
    throw error;
  }
}

export async function getStaffAvatarUrl(avatarPath?: string | null) {
  if (!avatarPath) return null;
  const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(avatarPath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function resolveStaffAvatarUrl(publicProfile?: Partial<Pick<StaffPublicProfile, 'avatar_path' | 'avatar_url'>> | null) {
  if (publicProfile?.avatar_path) {
    try {
      return await getStaffAvatarUrl(publicProfile.avatar_path);
    } catch {
      return publicProfile.avatar_url ?? null;
    }
  }
  return publicProfile?.avatar_url ?? null;
}

export async function uploadStaffAvatar(staffProfileId: string, file: File) {
  if (!staffProfileId) throw new Error('ไม่พบรหัสโปรไฟล์ทีมงาน');
  validateAvatarFile(file);
  let uploadBlob: Blob;
  try {
    uploadBlob = await resizeAvatarToWebp(file);
  } catch (error) {
    if (file.size <= 300 * 1024) uploadBlob = file;
    else throw error;
  }

  const avatar_path = staffAvatarPath(staffProfileId);
  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(avatar_path, uploadBlob, {
    cacheControl: '3600',
    contentType: uploadBlob.type || 'image/webp',
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.rpc('update_staff_avatar_path', {
    input_staff_profile_id: staffProfileId,
    input_avatar_path: avatar_path,
  });
  if (error) {
    await supabase.storage.from(AVATAR_BUCKET).remove([avatar_path]);
    throw error;
  }

  return {
    avatar_path: (data as StaffPublicProfile).avatar_path ?? avatar_path,
    signedUrl: await getStaffAvatarUrl(avatar_path),
    bytes: uploadBlob.size,
  } satisfies AvatarUploadResult;
}

export async function removeStaffAvatar(staffProfileId: string, avatarPath?: string | null) {
  if (!staffProfileId) throw new Error('ไม่พบรหัสโปรไฟล์ทีมงาน');
  const path = avatarPath ?? staffAvatarPath(staffProfileId);
  const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  if (removeError) throw removeError;
  const { data, error } = await supabase.rpc('clear_staff_avatar_path', {
    input_staff_profile_id: staffProfileId,
  });
  if (error) throw error;
  return data as StaffPublicProfile;
}
