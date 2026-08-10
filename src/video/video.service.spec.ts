import { VideoService } from './video.service';

describe('VideoService', () => {
  it('returns a playback url and drm license', async () => {
    const svc = new VideoService();
    const play = await svc.signPlayback('vid-1', 'user-1');
    expect(play.signedUrl).toContain('cdn.example');
    const lic = await svc.requestLicense('vid-1', 'widevine', { client: 'test' });
    expect(lic.license).toBeDefined();
  });
});
