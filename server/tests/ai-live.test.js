import { describe, it, expect, beforeAll } from 'vitest';
import helpers from './helpers.js';
const { app, request, registerUser, auth } = helpers;

const live = process.env.RUN_LIVE_AI_TESTS === 'true' && Boolean(process.env.GEMINI_API_KEY);

(live ? describe : describe.skip)('live Gemini integration', () => {
  let account;
  let taskId;

  beforeAll(async () => {
    account = await registerUser({ name: 'AI Tester' });
    const task = await request(app)
      .post('/api/tasks')
      .set(auth(account.token))
      .send({
        title: 'Finish the physics lab report',
        description: 'Write the analysis and conclusion for the pendulum experiment.',
        deadline: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        category: 'study'
      });
    taskId = task.body.task.id;
  });

  it('generates a real daily briefing', async () => {
    const response = await request(app).get('/api/ai/briefing?refresh=true').set(auth(account.token));
    expect(response.status).toBe(200);
    expect(response.body.generatedBy).toBe('gemini');
    expect(typeof response.body.briefing).toBe('string');
    expect(response.body.briefing.length).toBeGreaterThan(20);
    expect(response.body.structured).toBeTruthy();
    expect(Array.isArray(response.body.tasks)).toBe(true);
  });

  it('generates grounded insights', async () => {
    const response = await request(app).get('/api/ai/insights?refresh=true').set(auth(account.token));
    expect(response.status).toBe(200);
    expect(response.body.generatedBy).toBe('gemini');
    expect(Array.isArray(response.body.insights)).toBe(true);
    expect(response.body.insights.length).toBeGreaterThan(0);
  });

  it('analyzes a real task', async () => {
    const response = await request(app).get(`/api/ai/analyze/${taskId}`).set(auth(account.token));
    expect(response.status).toBe(200);
    expect(response.body.analysis.generatedBy).toBe('gemini');
    expect(response.body.analysis.firstAction).toBeTruthy();
    expect(response.body.analysis.subtasks.length).toBeGreaterThan(0);
  });

  it('answers a chat message with live data', async () => {
    const response = await request(app)
      .post('/api/ai/chat')
      .set(auth(account.token))
      .send({ message: 'What should I focus on first today?' });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message.length).toBeGreaterThan(10);
  });
});
