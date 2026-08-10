import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDrmAdapter, SimpleDrmAdapter } from './drm.adapter';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);
  private readonly drm: IDrmAdapter;

  constructor() {
    // In production we would DI-inject an adapter; for now choose SimpleDrmAdapter or a provider based on env.
    this.drm = process.env.DRM_PROVIDER === 'simple' ? new SimpleDrmAdapter() : new SimpleDrmAdapter();
  }

  // DRM-aware playback signing
  async signPlayback(videoId: string, userId?: string) {
    // Return a signed playback token/URL placeholder; indicate if DRM is enabled
    // In production, this would generate short-lived URLs or tokens.
    return { signedUrl: `https://cdn.example/videos/${videoId}/master.m3u8?sig=stub`, drm: false };
  }

  async requestLicense(videoId: string, drmType: string, clientData: unknown) {
    try {
      return await this.drm.requestLicense(videoId, drmType, clientData);
    } catch (err) {
      this.logger.warn('DRM adapter failed, returning error token', err as any);
      return { license: 'error', expiresAt: new Date().toISOString() };
    }
  }
}
