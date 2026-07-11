import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ForbiddenError } from '@connectpro/common';

@Injectable()
export class MediaService {
  async getUploadUrl(userId: string, filename: string, contentType: string) {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const key = `uploads/${userId}/${randomUUID()}-${safeName}`;
    // In production: generate S3 presigned URL via AWS SDK
    return {
      uploadUrl: `https://storage.connectpro.local/${key}?presigned=true`,
      publicUrl: `https://cdn.connectpro.com/${key}`,
      key,
      contentType,
      expiresIn: 3600,
    };
  }

  async getDeliveryUrl(key: string, userId: string) {
    const expectedPrefix = `uploads/${userId}/`;
    if (!key.startsWith(expectedPrefix) || key.includes('..')) {
      throw new ForbiddenError('Not allowed to access this media key');
    }
    return {
      url: `https://cdn.connectpro.com/${key}`,
    };
  }
}
