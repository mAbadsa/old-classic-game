// End-to-end checks for accounts, admin controls, banner, email and image upload.
// Runs against the database in DATABASE_URL (the dev DB), so it creates its own
// user and game with unique names and removes them at the end. Needs the admin
// account from `npm run seed:admin`.
import 'dotenv/config';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Read at module load by the local storage provider, so set before importing the app.
const uploadsDir = mkdtempSync(join(tmpdir(), 'e2e-uploads-'));
process.env.UPLOADS_DIR = uploadsDir;
process.env.MAIL_DRIVER = 'log';

const suffix = Date.now().toString(36);
const userEmail = `e2e-${suffix}@example.test`;
const userPassword = 'e2e-password-123';
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe('admin e2e', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let adminToken: string;
  let userToken: string;
  let userId: string;
  let gameId: string;
  let bannerBefore: unknown;

  const adminEmail = process.env.ADMIN_EMAIL!;
  const adminPassword = process.env.ADMIN_PASSWORD!;

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module.js');
    const { db } = await import('../src/prisma/db.js');
    bannerBefore = (await db.orm.public.SystemSetting.first({ key: 'announcement' }))?.value ?? null;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    server = app.getHttpServer();

    const adminLogin = await request(server).post('/auth/login').send({ email: adminEmail, password: adminPassword });
    adminToken = adminLogin.body.accessToken;

    const signup = await request(server)
      .post('/auth/signup')
      .send({ email: userEmail, username: `e2e_${suffix}`, password: userPassword });
    userToken = signup.body.accessToken;
    userId = signup.body.user.id;
  });

  afterAll(async () => {
    if (gameId) await request(server).delete(`/admin/games/${gameId}`).set('Authorization', `Bearer ${adminToken}`);
    if (userId) await request(server).delete(`/admin/users/${userId}`).set('Authorization', `Bearer ${adminToken}`);
    const { db } = await import('../src/prisma/db.js');
    if (bannerBefore === null) {
      await db.orm.public.SystemSetting.where((s) => s.key.eq('announcement')).delete();
    } else {
      await db.orm.public.SystemSetting.where((s) => s.key.eq('announcement')).update({ value: bannerBefore as any });
    }
    await app?.close();
    rmSync(uploadsDir, { recursive: true, force: true });
  });

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  it('admin can log in and reach the admin area', async () => {
    expect(adminToken).toBeTruthy();
    const res = await request(server).get('/admin/users').set(as(adminToken));
    expect(res.status).toBe(200);
  });

  it('regular users cannot reach the admin area', async () => {
    const res = await request(server).get('/admin/users').set(as(userToken));
    expect(res.status).toBe(403);
  });

  it('admin can suspend a user; suspended tokens and logins are rejected', async () => {
    const suspend = await request(server)
      .patch(`/admin/users/${userId}/status`)
      .set(as(adminToken))
      .send({ status: 'suspended' });
    expect(suspend.status).toBe(200);

    expect((await request(server).get('/auth/me').set(as(userToken))).status).toBe(401);
    expect((await request(server).post('/auth/login').send({ email: userEmail, password: userPassword })).status).toBe(403);
  });

  it('admin can restore a user; logout ends that session', async () => {
    await request(server).patch(`/admin/users/${userId}/status`).set(as(adminToken)).send({ status: 'active' });

    const login = await request(server).post('/auth/login').send({ email: userEmail, password: userPassword });
    expect(login.status).toBe(200);
    const freshToken = login.body.accessToken;

    expect((await request(server).get('/auth/me').set(as(freshToken))).status).toBe(200);
    expect((await request(server).post('/auth/logout').set(as(freshToken))).status).toBe(204);
    expect((await request(server).get('/auth/me').set(as(freshToken))).status).toBe(401);

    userToken = (await request(server).post('/auth/login').send({ email: userEmail, password: userPassword })).body
      .accessToken;
  });

  it('admin can force-logout a user', async () => {
    const res = await request(server).post(`/admin/users/${userId}/force-logout`).set(as(adminToken));
    expect(res.status).toBe(204);
    expect((await request(server).get('/auth/me').set(as(userToken))).status).toBe(401);

    userToken = (await request(server).post('/auth/login').send({ email: userEmail, password: userPassword })).body
      .accessToken;
  });

  it('admin cannot suspend or demote their own account', async () => {
    const me = await request(server).get('/auth/me').set(as(adminToken));
    const suspend = await request(server)
      .patch(`/admin/users/${me.body.id}/status`)
      .set(as(adminToken))
      .send({ status: 'suspended' });
    expect(suspend.status).toBe(400);

    const demote = await request(server)
      .patch(`/admin/users/${me.body.id}/role`)
      .set(as(adminToken))
      .send({ role: 'user' });
    expect(demote.status).toBe(400);
  });

  it('admin banner is public only while active', async () => {
    const put = (active: boolean) =>
      request(server)
        .put('/admin/announcement')
        .set(as(adminToken))
        .send({ text: `E2E banner ${suffix}`, tone: 'info', active });

    expect((await put(true)).status).toBe(200);
    expect((await request(server).get('/announcement')).body.announcement).toMatchObject({
      text: `E2E banner ${suffix}`,
      active: true,
    });

    await put(false);
    expect((await request(server).get('/announcement')).body).toEqual({ announcement: null });
  });

  it('admin can email selected users (log driver)', async () => {
    const res = await request(server)
      .post('/admin/emails')
      .set(as(adminToken))
      .send({ audience: 'selected', userIds: [userId], subject: 'E2E', body: 'Hello from the test' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ recipients: 1, sent: 1, failed: 0 });
  });

  it('admin can create a game and replace its cover and thumbnail', async () => {
    const created = await request(server)
      .post('/admin/games')
      .set(as(adminToken))
      .field('title', `E2E game ${suffix}`)
      .field('emulator', 'nes')
      .attach('file', Buffer.from('not-a-real-rom'), { filename: 'e2e.nes', contentType: 'application/octet-stream' });
    expect(created.status).toBe(201);
    gameId = created.body.id;

    const cover = await request(server)
      .post(`/admin/games/${gameId}/images/cover`)
      .set(as(adminToken))
      .attach('file', PNG_1X1, { filename: 'cover.png', contentType: 'image/png' });
    expect(cover.status).toBe(201);
    expect(cover.body.cover).toMatch(/\.png$/);

    const thumb = await request(server)
      .post(`/admin/games/${gameId}/images/thumbnail`)
      .set(as(adminToken))
      .attach('file', PNG_1X1, { filename: 'thumb.png', contentType: 'image/png' });
    expect(thumb.status).toBe(201);
    expect(thumb.body.thumbnail).toMatch(/\.png$/);
  });

  it('rejects unsupported image types and unknown image kinds', async () => {
    const gif = await request(server)
      .post(`/admin/games/${gameId}/images/cover`)
      .set(as(adminToken))
      .attach('file', PNG_1X1, { filename: 'x.gif', contentType: 'image/gif' });
    expect(gif.status).toBe(400);

    const badKind = await request(server)
      .post(`/admin/games/${gameId}/images/poster`)
      .set(as(adminToken))
      .attach('file', PNG_1X1, { filename: 'x.png', contentType: 'image/png' });
    expect(badKind.status).toBe(400);
  });

  it('admin can read all game data, including unpublished fields', async () => {
    const res = await request(server).get(`/admin/games/${gameId}`).set(as(adminToken));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: gameId, title: `E2E game ${suffix}` });
  });
});
