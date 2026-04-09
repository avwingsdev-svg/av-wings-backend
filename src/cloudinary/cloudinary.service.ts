import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { loadCloudinaryEnv } from './cloudinary.config';
import { MAX_UPLOAD_BYTES } from '../common/storage/upload-validation';

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
  resourceType: string;
};

/**
 * Cloudinary SDK wrapper: upload streams from buffers, delete by public id or delivery URL.
 * Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;

  constructor() {
    const env = loadCloudinaryEnv();
    // All three env vars required; partial config is treated as “off” so uploads never half-work.
    if (
      env.cloudName?.trim() &&
      env.apiKey?.trim() &&
      env.apiSecret?.trim()
    ) {
      cloudinary.config({
        cloud_name: env.cloudName.trim(),
        api_key: env.apiKey.trim(),
        api_secret: env.apiSecret.trim(),
      });
      this.configured = true;
    } else {
      this.logger.warn(
        'Cloudinary env not set. Image and document uploads will fail until configured.',
      );
    }
  }

  /**
   * Images (avatars, listing photos). Caller must run validateUploadFile first so MIME and size
   * rules stay centralized.
   */
  async uploadImage(
    buffer: Buffer,
    folderPath: string,
    fileLabel: string,
  ): Promise<CloudinaryUploadResult> {
    this.assertBuffer(buffer);
    return this.uploadStream(buffer, {
      folderPath,
      fileLabel,
      resourceType: 'image',
    });
  }

  /**
   * PDFs and scans (onboarding documents). Uses `resource_type: auto` so PDFs land as raw when needed.
   */
  async uploadFile(
    buffer: Buffer,
    folderPath: string,
    fileLabel: string,
  ): Promise<CloudinaryUploadResult> {
    this.assertBuffer(buffer);
    return this.uploadStream(buffer, {
      folderPath,
      fileLabel,
      resourceType: 'auto',
    });
  }

  /** Removes an asset from Cloudinary CDN cache and storage by stable public id. */
  async deleteByPublicId(
    publicId: string,
    resourceType: 'image' | 'raw' | 'auto' = 'image',
  ): Promise<void> {
    this.requireConfigured();
    await new Promise<void>((resolve, reject) => {
      cloudinary.uploader.destroy(
        publicId,
        { resource_type: resourceType, invalidate: true },
        (err) => (err ? reject(err) : resolve()),
      );
    });
  }

  /**
   * Parses our delivery URLs back to public id + resource type so callers can delete using only
   * the URL stored in Mongo (no separate public id column required).
   */
  async deleteBySecureUrl(secureUrl: string): Promise<void> {
    this.requireConfigured();
    const parsed = this.parseDeliveryUrl(secureUrl);
    if (!parsed) {
      throw new BadRequestException('Not a recognized Cloudinary delivery URL.');
    }
    await this.deleteByPublicId(parsed.publicId, parsed.resourceType);
  }

  private requireConfigured(): void {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      );
    }
  }

  /** Last line of defense before streaming to Cloudinary (empty / oversize buffer). */
  private assertBuffer(buffer: Buffer): void {
    if (!buffer?.length) {
      throw new BadRequestException('Empty file buffer.');
    }
    if (buffer.length > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('File is too large (max 10 MB).');
    }
  }

  /**
   * Builds folder from env prefix + logical path, unique public_id per upload, streams buffer to
   * Cloudinary’s upload API.
   */
  private async uploadStream(
    buffer: Buffer,
    opts: {
      folderPath: string;
      fileLabel: string;
      resourceType: 'image' | 'auto';
    },
  ): Promise<CloudinaryUploadResult> {
    this.requireConfigured();
    const env = loadCloudinaryEnv();
    const folder = `${env.folderPrefix}/${opts.folderPath}`.replace(
      /\/+/g,
      '/',
    );
    const publicId = `${opts.fileLabel}-${randomUUID()}`;

    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: opts.resourceType,
        },
        (err, res) => {
          if (err) {
            reject(err);
            return;
          }
          if (!res) {
            reject(new Error('Cloudinary returned no result'));
            return;
          }
          resolve(res);
        },
      );
      Readable.from(buffer).pipe(stream);
    });

    return {
      secureUrl: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type ?? opts.resourceType,
    };
  }

  /**
   * Reverse-engineers `public_id` from a typical `res.cloudinary.com/.../upload/...` URL, skipping
   * version segments and stripping file extensions.
   */
  private parseDeliveryUrl(url: string): {
    publicId: string;
    resourceType: 'image' | 'raw' | 'auto';
  } | null {
    try {
      const u = new URL(url);
      if (!u.hostname.includes('cloudinary.com')) {
        return null;
      }
      const segments = u.pathname.split('/').filter(Boolean);
      const uploadIdx = segments.indexOf('upload');
      if (uploadIdx < 2) {
        return null;
      }
      const rt = segments[uploadIdx - 1];
      const resourceType: 'image' | 'raw' | 'auto' =
        rt === 'raw' ? 'raw' : rt === 'image' ? 'image' : 'auto';
      let after = segments.slice(uploadIdx + 1);
      if (after[0]?.match(/^v\d+$/)) {
        after = after.slice(1);
      }
      const joined = after.join('/');
      if (!joined) {
        return null;
      }
      const publicId = joined.replace(/\.[^/.]+$/, '');
      return { publicId: decodeURIComponent(publicId), resourceType };
    } catch {
      return null;
    }
  }
}
