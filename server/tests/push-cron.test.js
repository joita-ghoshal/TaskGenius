import { describe, it, expect, beforeAll } from 'vitest';
import helpers from './helpers.js';
const { app, prisma, request, registerUser, auth } = helpers;

describe('push subscriptions and internal cron', () => {
  let account;

  beforeAll(async () => {
    account = await registerUser({ name: 'Push Tester' });
  });

  it('exposes the VAPID public key and push configuration', async () => {
    const response = await request(app).get('/api/notifications/push/key').set(auth(account.token));
    expect(response.status).toBe(200);
    expect(response.body.configured).toBe(true);
    expect(response.body.publicKey).toBeTruthy();
  });

  it('stores, lists, and removes a push subscription', async () => {
    const endpoint = `https://push.example.test/${Date.now()}`;
    const subscribe = await request(app)
      .post('/api/notifications/push/subscribe')
      .set(auth(account.token))
      .send({ endpoint, keys: { p256dh: 'test-p256dh', auth: 'test-auth' } });
    expect(subscribe.status).toBe(201);

    const status = await request(app).get('/api/notifications/push/status').set(auth(account.token));
    expect(status.status).toBe(200);
    expect(status.body.subscriptions).toBe(1);

    const unsubscribe = await request(app)
      .post('/api/notifications/push/unsubscribe')
      .set(auth(account.token))
      .send({ endpoint });
    expect(unsubscribe.status).toBe(200);

    const after = await request(app).get('/api/notifications/push/status').set(auth(account.token));
    expect(after.body.subscriptions).toBe(0);
  });

  it('rejects invalid push subscriptions', async () => {
    const response = await request(app)
      .post('/api/notifications/push/subscribe')
      .set(auth(account.token))
      .send({ endpoint: 'https://push.example.test/invalid' });
    expect(response.status).toBe(400);
  });

  it('protects the internal cron endpoint', async () => {
    const response = await request(app).post('/api/internal/cron').send({});
    expect(response.status).toBe(401);
  });

  it('runs maintenance through the cron endpoint and marks overdue work missed', async () => {
    const overdue = await prisma.task.create({
      data: {
        userId: account.user.id,
        title: 'Cron should catch this',
        status: 'pending',
        deadline: new Date(Date.now() - 5 * 60 * 1000)
      }
    });

    const response = await request(app)
      .post('/api/internal/cron')
      .set('x-cron-secret', 'test-cron-secret')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.summary.missed).toBeGreaterThanOrEqual(1);

    const updated = await prisma.task.findUnique({ where: { id: overdue.id } });
    expect(updated.status).toBe('missed');
  });

  it('reports service configuration in the health check', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.services.ai).toBe(true);
    expect(response.body.services.push).toBe(true);
  });
});
