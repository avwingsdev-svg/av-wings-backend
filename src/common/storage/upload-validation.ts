import { BadRequestException } from '@nestjs/common';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const AVATAR_MIMES = new Set(['image/jpeg', 'image/png', 'image/jpg']);
const DOCUMENT_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
]);

/**
 * Central upload policy: max 10 MB, non-empty buffer, and MIME allow-lists differ for faces
 * (strict images) vs compliance docs (PDF + images).
 */
export function validateUploadFile(
  file: Express.Multer.File | undefined,
  kind: 'avatar' | 'document',
): asserts file is Express.Multer.File {
  if (!file?.buffer?.length) {
    throw new BadRequestException('A non-empty file is required.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new BadRequestException('File is too large (max 10 MB).');
  }
  const allowed = kind === 'avatar' ? AVATAR_MIMES : DOCUMENT_MIMES;
  if (!allowed.has(file.mimetype)) {
    throw new BadRequestException(
      kind === 'avatar'
        ? 'Profile photo must be JPG or PNG.'
        : 'Only PDF, JPG, and PNG are allowed.',
    );
  }
}
