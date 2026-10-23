import { describe, it, expect, beforeAll } from 'vitest';
import helpers from './helpers.js';
const { app, prisma, request, registerUser, auth } = helpers;

describe('task lifecycle and missed detection', () => {
  let token;
  let userId;

  beforeAll(async () => {
    const account = await registerUser({ name: 'Task Tester' });
    token = account.token;
    userId = account.user.id;
  });

  it('marks a task created with a past deadline as missed immediately', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .set(auth(token))
      .send({
        title: 'Already overdue assignment',
        deadline: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        priority: 'high',
        category: 'study'
      });

    expect(response.status).toBe(201);
    expect(response.body.task.status).toBe('missed');
    expect(response.body.task.riskLevel).toBe('critical');
    expect(response.body.task.completionProbability).toBe(0);
  });

  it('reports overdue work in the dashboard', async () => {
    const response = await request(app).get('/api/tasks/dashboard').set(auth(token));
    expect(response.status).toBe(200);
    expect(response.body.dashboard.overdueCount).toBeGreaterThanOrEqual(1);
    expect(response.body.dashboard.missedTasks).toBeGreaterThanOrEqual(1);
  });

  it('sweeps a stale pending task to missed and logs it once', async () => {
    const stale = await prisma.task.create({
      data: {
        userId,
        title: 'Stale pending task',
        status: 'pending',
        deadline: new Date(Date.now() - 2 * 60 * 60 * 1000),
        priority: 'medium'
      }
    });

    const firstSweep = await request(app).get('/api/tasks').set(auth(token));
    expect(firstSweep.status).toBe(200);
    const swept = firstSweep.body.tasks.find((task) => task.id === stale.id);
    expect(swept.status).toBe('missed');

    const analyticsBefore = await prisma.analytics.findFirst({ where: { userId } });
    const secondSweep = await request(app).get('/api/tasks').set(auth(token));
    expect(secondSweep.status).toBe(200);
    const analyticsAfter = await prisma.analytics.findFirst({ where: { userId } });
    expect(analyticsAfter.tasksMissed).toBe(analyticsBefore.tasksMissed);
  });

  it('turns a task missed when its deadline is moved into the past, and restores it when moved forward', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .set(auth(token))
      .send({
        title: 'Reschedule me',
        deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      });
    expect(created.status).toBe(201);
    expect(created.body.task.status).toBe('pending');

    const missed = await request(app)
      .put(`/api/tasks/${created.body.task.id}`)
      .set(auth(token))
      .send({ deadline: new Date(Date.now() - 30 * 60 * 1000).toISOString() });
    expect(missed.status).toBe(200);
    expect(missed.body.task.status).toBe('missed');

    const restored = await request(app)
      .put(`/api/tasks/${created.body.task.id}`)
      .set(auth(token))
      .send({ deadline: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() });
    expect(restored.status).toBe(200);
    expect(restored.body.task.status).toBe('pending');
    expect(restored.body.task.completionProbability).toBeGreaterThan(0);
  });

  it('records completion analytics only on the completion transition', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .set(auth(token))
      .send({ title: 'Completion toggle task', deadline: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString() });
    const taskId = created.body.task.id;

    const completed = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set(auth(token))
      .send({ status: 'completed' });
    expect(completed.status).toBe(200);
    expect(completed.body.task.status).toBe('completed');

    const analyticsAfterComplete = await prisma.analytics.findFirst({ where: { userId } });
    const completedCount = analyticsAfterComplete.tasksCompleted;

    const completedAgain = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set(auth(token))
      .send({ status: 'completed' });
    expect(completedAgain.status).toBe(200);

    const analyticsAfterRepeat = await prisma.analytics.findFirst({ where: { userId } });
    expect(analyticsAfterRepeat.tasksCompleted).toBe(completedCount);
  });

  it('rejects task access without authentication', async () => {
    const response = await request(app).get('/api/tasks');
    expect(response.status).toBe(401);
  });
});
