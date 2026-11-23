import { type INestApplication } from '@nestjs/common';
import sharp from 'sharp';

import type { OrgSettingsResponse } from '@app/shared';
import { DEFAULT_MENU_THEME, PLAN_IDS } from '@app/shared';

import { MENU_CACHE_PURGER, type MenuCachePurger } from '../src/core/cache/menu-cache-purger';
import { JwtAccessService } from '../src/core/auth/jwt.service';

import { SubscriptionService } from '../src/modules/billing/subscription.service';

import { createTestApp } from './create-test-app';
import { signupFreshOrg, type FreshOrg } from './staff-settings-helpers';

const THEME = {
  preset: 'forest',
  layout: 'grid',
  hero: { enabled: true, headline: { en: 'Welcome', ar: 'أهلاً' }, subline: { en: 'Eat well' } },
  showSearch: true,
};

describe('Menu look (e2e)', () => {
  let app: INestApplication;
  let fresh: FreshOrg;
  let purgeOrg: jest.SpyInstance;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    fresh = await signupFreshOrg(app, app.get(JwtAccessService));
    purgeOrg = jest.spyOn(app.get<MenuCachePurger>(MENU_CACHE_PURGER), 'purgeOrg');
  });

  afterAll(async () => {
    await app.close();
  });

  async function waitForPurges(count: number): Promise<void> {
    for (let i = 0; i < 50 && purgeOrg.mock.calls.length < count; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  it('starts with the default look', async () => {
    const res = await fresh.ownerAgent.get('/v1/org/settings');
    expect(res.status).toBe(200);
    expect((res.body as OrgSettingsResponse).menuTheme).toEqual(DEFAULT_MENU_THEME);
  });

  it('rejects an unknown preset', async () => {
    const res = await fresh.ownerAgent
      .patch('/v1/org/settings')
      .send({ menuTheme: { ...THEME, preset: 'neon' } });
    expect(res.status).toBe(400);
    expect(purgeOrg).not.toHaveBeenCalled();
  });

  it('saves the look and clears the menu cache like a menu edit', async () => {
    const res = await fresh.ownerAgent.patch('/v1/org/settings').send({ menuTheme: THEME });
    expect(res.status).toBe(200);
    expect((res.body as OrgSettingsResponse).menuTheme).toMatchObject(THEME);
    await waitForPurges(1);
    expect(purgeOrg).toHaveBeenCalledTimes(1);

    const again = await fresh.ownerAgent.get('/v1/org/settings');
    expect((again.body as OrgSettingsResponse).menuTheme).toMatchObject(THEME);
  });

  it('serves the saved look on the public menu', async () => {
    const settings = await fresh.ownerAgent.get('/v1/org/settings');
    const { slug } = settings.body as OrgSettingsResponse;
    const res = await fresh.ownerAgent.get(`/v1/public/menus/${slug}`);
    expect(res.status).toBe(200);
    expect((res.body as { org: { theme: unknown } }).org.theme).toMatchObject(THEME);
  });

  it('does not clear the cache when the look is not part of the save', async () => {
    purgeOrg.mockClear();
    const res = await fresh.ownerAgent.patch('/v1/org/settings').send({});
    expect(res.status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(purgeOrg).not.toHaveBeenCalled();
  });

  describe('cover photo', () => {
    let cover: Buffer;
    let slug: string;

    beforeAll(async () => {
      cover = await sharp({ create: { width: 800, height: 1000, channels: 3, background: '#385' } })
        .png()
        .toBuffer();
      const settings = await fresh.ownerAgent.get('/v1/org/settings');
      slug = (settings.body as OrgSettingsResponse).slug;
    });

    it('has no cover by default, on settings and on the public menu', async () => {
      const settings = await fresh.ownerAgent.get('/v1/org/settings');
      expect((settings.body as OrgSettingsResponse).menuCoverUrls).toBeNull();
      const menu = await fresh.ownerAgent.get(`/v1/public/menus/${slug}`);
      expect((menu.body as { org: { coverUrls: unknown } }).org.coverUrls).toBeNull();
    });

    it('uploads a cover, shows it on the menu and clears the menu cache', async () => {
      purgeOrg.mockClear();
      const up = await fresh.ownerAgent
        .post('/v1/org/menu-cover')
        .attach('file', cover, { filename: 'cover.png', contentType: 'image/png' });
      expect(up.status).toBe(201);
      const urls = (up.body as { menuCoverUrls: { url480: string; url960: string } }).menuCoverUrls;
      expect(urls.url960).toMatch(/-960\.webp$/);
      expect(urls.url480).toMatch(/-480\.webp$/);
      await waitForPurges(1);
      expect(purgeOrg).toHaveBeenCalledTimes(1);

      const settings = await fresh.ownerAgent.get('/v1/org/settings');
      expect((settings.body as OrgSettingsResponse).menuCoverUrls).toEqual(urls);
      const menu = await fresh.ownerAgent.get(`/v1/public/menus/${slug}`);
      expect((menu.body as { org: { coverUrls: unknown } }).org.coverUrls).toEqual(urls);
    });

    it('replaces the cover with a new file', async () => {
      const before = (await fresh.ownerAgent.get('/v1/org/settings')).body as OrgSettingsResponse;
      const up = await fresh.ownerAgent
        .post('/v1/org/menu-cover')
        .attach('file', cover, { filename: 'cover2.png', contentType: 'image/png' });
      expect(up.status).toBe(201);
      const after = (up.body as { menuCoverUrls: { url960: string } }).menuCoverUrls;
      expect(after.url960).not.toBe(before.menuCoverUrls?.url960);
    });

    it('keeps the cover when the look is saved', async () => {
      const res = await fresh.ownerAgent.patch('/v1/org/settings').send({ menuTheme: THEME });
      expect((res.body as OrgSettingsResponse).menuCoverUrls).not.toBeNull();
    });

    it('rejects a file that is not an image', async () => {
      const res = await fresh.ownerAgent
        .post('/v1/org/menu-cover')
        .attach('file', Buffer.from('nope'), { filename: 'x.bin' });
      expect(res.status).toBe(400);
    });

    it('rejects a cover image smaller than 480x600', async () => {
      const small = await sharp({ create: { width: 400, height: 500, channels: 3, background: '#385' } })
        .png()
        .toBuffer();
      const res = await fresh.ownerAgent
        .post('/v1/org/menu-cover')
        .attach('file', small, { filename: 'small.png', contentType: 'image/png' });
      expect(res.status).toBe(400);
      expect((res.body as { error: { code: string } }).error.code).toBe('IMAGE_TOO_SMALL');
    });

    it('removes the cover and clears the menu cache', async () => {
      purgeOrg.mockClear();
      const del = await fresh.ownerAgent.delete('/v1/org/menu-cover');
      expect(del.status).toBe(200);
      expect((del.body as { menuCoverUrls: null }).menuCoverUrls).toBeNull();
      await waitForPurges(1);
      expect(purgeOrg).toHaveBeenCalledTimes(1);
      const settings = await fresh.ownerAgent.get('/v1/org/settings');
      expect((settings.body as OrgSettingsResponse).menuCoverUrls).toBeNull();
    });
  });

  describe('brand colour and plan gating', () => {
    let owner: FreshOrg;
    let png: Buffer;
    let slug: string;

    const toFree = async () =>
      app.get(SubscriptionService).applySubscriptionPatch(owner.orgId, {
        planId: PLAN_IDS.free,
        status: 'active',
        provider: null,
        trialEndsAt: null,
      });
    const toPaid = async () =>
      app.get(SubscriptionService).applySubscriptionPatch(owner.orgId, {
        planId: PLAN_IDS.menu,
        status: 'active',
        provider: null,
        trialEndsAt: null,
      });
    const publicOrg = async () =>
      ((await owner.ownerAgent.get(`/v1/public/menus/${slug}`)).body as {
        org: { theme: unknown; coverUrls: unknown };
      }).org;

    beforeAll(async () => {
      owner = await signupFreshOrg(app, app.get(JwtAccessService));
      png = await sharp({ create: { width: 800, height: 1000, channels: 3, background: '#385' } })
        .png()
        .toBuffer();
      slug = ((await owner.ownerAgent.get('/v1/org/settings')).body as OrgSettingsResponse).slug;
    });

    it('rejects a brand colour that is not #rrggbb', async () => {
      const res = await owner.ownerAgent
        .patch('/v1/org/settings')
        .send({ menuTheme: { ...THEME, brandColor: 'red' } });
      expect(res.status).toBe(400);
    });

    it('lets a plan with menu.branding (the trial) save the look, a brand colour and a cover', async () => {
      const res = await owner.ownerAgent
        .patch('/v1/org/settings')
        .send({ menuTheme: { ...THEME, brandColor: '#8a1c1c' } });
      expect(res.status).toBe(200);
      expect((res.body as OrgSettingsResponse).menuLookAllowed).toBe(true);
      const up = await owner.ownerAgent
        .post('/v1/org/menu-cover')
        .attach('file', png, { filename: 'c.png', contentType: 'image/png' });
      expect(up.status).toBe(201);
      expect((await publicOrg()).theme).toMatchObject({ brandColor: '#8a1c1c' });
      expect((await publicOrg()).coverUrls).not.toBeNull();
    });

    it('on Free: saving a non-default look or a cover fails with MENU_THEME_NOT_IN_PLAN', async () => {
      await toFree();
      const settings = await owner.ownerAgent.get('/v1/org/settings');
      expect((settings.body as OrgSettingsResponse).menuLookAllowed).toBe(false);

      const patch = await owner.ownerAgent.patch('/v1/org/settings').send({ menuTheme: THEME });
      expect(patch.status).toBe(403);
      expect((patch.body as { error: { code: string } }).error.code).toBe('MENU_THEME_NOT_IN_PLAN');

      const brandOnly = await owner.ownerAgent
        .patch('/v1/org/settings')
        .send({ menuTheme: { ...DEFAULT_MENU_THEME, brandColor: '#8a1c1c' } });
      expect(brandOnly.status).toBe(403);

      const cover = await owner.ownerAgent
        .post('/v1/org/menu-cover')
        .attach('file', png, { filename: 'c.png', contentType: 'image/png' });
      expect(cover.status).toBe(403);
      expect((cover.body as { error: { code: string } }).error.code).toBe('MENU_THEME_NOT_IN_PLAN');
    });

    it('on Free: the default look can still be saved, other settings are unaffected', async () => {
      const reset = await owner.ownerAgent
        .patch('/v1/org/settings')
        .send({ menuTheme: DEFAULT_MENU_THEME });
      expect(reset.status).toBe(200);
      const name = await owner.ownerAgent.patch('/v1/org/settings').send({ name: 'Renamed' });
      expect(name.status).toBe(200);
    });

    it('keeps the saved look through a downgrade: guests get the default, an upgrade restores it', async () => {
      await toPaid();
      const saved = await owner.ownerAgent
        .patch('/v1/org/settings')
        .send({ menuTheme: { ...THEME, brandColor: '#8a1c1c' } });
      expect(saved.status).toBe(200);
      expect((await publicOrg()).theme).toMatchObject({ preset: 'forest', brandColor: '#8a1c1c' });

      await toFree();
      const downgraded = await publicOrg();
      expect(downgraded.theme).toEqual(DEFAULT_MENU_THEME);
      expect(downgraded.coverUrls).toBeNull();
      const settings = (await owner.ownerAgent.get('/v1/org/settings')).body as OrgSettingsResponse;
      expect(settings.menuTheme).toMatchObject({ preset: 'forest', brandColor: '#8a1c1c' });
      expect(settings.menuCoverUrls).not.toBeNull();

      await toPaid();
      const restored = await publicOrg();
      expect(restored.theme).toMatchObject({ preset: 'forest', brandColor: '#8a1c1c' });
      expect(restored.coverUrls).not.toBeNull();
    });

    it('on Free: the cover can still be removed', async () => {
      await toFree();
      const del = await owner.ownerAgent.delete('/v1/org/menu-cover');
      expect(del.status).toBe(200);
    });
  });
});
