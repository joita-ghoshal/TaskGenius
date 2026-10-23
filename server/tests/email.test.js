import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { simpleParser } from 'mailparser';
import helpers from './helpers.js';
const { app, prisma, request, registerUser, auth, startSmtpServer } = helpers;
import emailModule from '../utils/email.js';
const { resetTransporter, isEmailConfigured } = emailModule;
import reminderDispatcherModule from '../utils/reminderDispatcher.js';
const { dispatchDeadlineReminders } = reminderDispatcherModule;

describe('email delivery', () => {
  let smtp;
  let savedEnv;

  beforeAll(async () => {
    savedEnv = {
      EMAIL_HOST: process.env.EMAIL_HOST,
      EMAIL_PORT: process.env.EMAIL_PORT,
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS,
      EMAIL_FROM: process.env.EMAIL_FROM,
      EMAIL_SECURE: process.env.EMAIL_SECURE
    };
    smtp = await startSmtpServer();
    process.env.EMAIL_HOST = '127.0.0.1';
    process.env.EMAIL_PORT = String(smtp.port);
    process.env.EMAIL_SECURE = 'false';
    process.env.EMAIL_USER = 'smtp-user';
    process.env.EMAIL_PASS = 'smtp-pass';
    process.env.EMAIL_FROM = 'TaskGenius <no-reply@taskgenius.test>';
    resetTransporter();
    expect(isEmailConfigured()).toBe(true);
  });

  afterAll(async () => {
    await smtp.close();
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (savedEnv.EMAIL_SECURE === undefined) delete process.env.EMAIL_SECURE;
    else process.env.EMAIL_SECURE = savedEnv.EMAIL_SECURE;
    resetTransporter();
  });

  it('emails a password reset link and resets the password', async () => {
    const account = await registerUser({ name: 'Reset Tester' });
    const forgot = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: account.email });

    expect(forgot.status).toBe(200);
    expect(forgot.body.resetUrl).toBeUndefined();

    const message = await smtp.waitForMessage((mail) => mail.raw.includes(account.email));
    const parsed = await simpleParser(message.raw);
    const resetUrl = `${parsed.text || parsed.html || ''}`.match(/http:\/\/localhost:5173\/reset-password\/[a-f0-9]{64}/)?.[0];
    expect(resetUrl).toBeTruthy();
    const token = resetUrl.split('/').pop();

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'BrandNewPass123!' });
    expect(reset.status).toBe(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: account.email, password: 'BrandNewPass123!' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
  });

  it('sends one deadline reminder email per threshold', async () => {
    const account = await registerUser({ name: 'Reminder Tester' });
    const created = await request(app)
      .post('/api/tasks')
      .set(auth(account.token))
      .send({
        title: 'Email reminder task',
        deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        priority: 'high'
      });

    expect(created.status).toBe(201);

    const message = await smtp.waitForMessage((mail) => mail.raw.includes(account.email));
    const parsed = await simpleParser(message.raw);
    expect(`${parsed.subject}`).toContain('Email reminder task');
    expect(`${parsed.text}`).toContain('within 3 hours');

    const logs = await prisma.reminderLog.findMany({
      where: { taskId: created.body.task.id, kind: 'due_3h', channel: 'email' }
    });
    expect(logs).toHaveLength(1);

    const rerun = await dispatchDeadlineReminders({ userId: account.user.id, taskId: created.body.task.id });
    expect(rerun.email).toBe(0);
  });
});
