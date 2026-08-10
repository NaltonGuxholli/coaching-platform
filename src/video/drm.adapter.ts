export interface DrmLicenseResponse {
  license: string;
  expiresAt?: string;
}

export interface IDrmAdapter {
  requestLicense(videoId: string, drmType: string, clientData: unknown): Promise<DrmLicenseResponse>;
}

export class SimpleDrmAdapter implements IDrmAdapter {
  async requestLicense(videoId: string, drmType: string, clientData: unknown) {
    // Simple stub: return a base64 token including videoId and drmType
    const token = Buffer.from(JSON.stringify({ videoId, drmType, ts: Date.now() })).toString('base64');
    return { license: token, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
  }
}
