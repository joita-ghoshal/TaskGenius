const prisma = require('../config/prisma');
const { bumpAnalytics } = require('./analytics');
const { notify } = require('./notify');
const { markReminderSent, wasReminderSent } = require('./reminders');
const { sendPushToUser } = require('./push');

function hoursUntil(deadline, now = new Date()) {
  if (!deadline) return Infinity;
  return (new Date(deadline) - now) / (1000 * 60 * 60);
}

function calculateRiskLevel(deadline, now = new Date()) {
  if (!deadline) return 'low';
  const hoursLeft = hoursUntil(deadline, now);
  if (hoursLeft <= 0) return 'critical';
  if (hoursLeft < 1) return 'critical';
  if (hoursLeft < 6) return 'high';
  if (hoursLeft < 24) return 'medium';
  return 'low';
}

function calculateCompletionProbability(deadline, now = new Date()) {
  if (!deadline) return 100;
  const hoursLeft = hoursUntil(deadline, now);
  if (hoursLeft <= 0) return 0;
  return Math.round(Math.max(0, Math.min(100, hoursLeft > 72 ? 95 : hoursLeft > 24 ? 75 : hoursLeft > 6 ? 50 : hoursLeft > 1 ? 25 : 10)));
}

/**
 * Flip every overdue, unfinished task to `missed` and record it once per task.
 * Safe to run repeatedly: only tasks that are still pending/in-progress are touched.
 */
async function sweepMissedTasks({ userId = null, now = new Date() } = {}) {
  const where = {
    deadline: { lt: now, not: null },
    status: { notIn: ['completed', 'missed'] }
  };
  if (userId) where.userId = userId;

  const overdue = await prisma.task.findMany({
    where,
    select: { id: true, userId: true, title: true, deadline: true, status: true }
  });

  if (overdue.length === 0) return { count: 0, tasks: [] };

  const missedByUser = new Map();
  const confirmed = [];

  for (const task of overdue) {
    const result = await prisma.task.updateMany({
      where: { id: task.id, status: { notIn: ['completed', 'missed'] } },
      data: { status: 'missed', riskLevel: 'critical', completionProbability: 0 }
    });
    if (result.count === 0) continue;

    confirmed.push(task);
    missedByUser.set(task.userId, (missedByUser.get(task.userId) || 0) + 1);

    const alreadyLogged = await wasReminderSent(task.id, 'missed', 'inapp');
    if (!alreadyLogged) {
      await notify(task.userId, {
        type: 'alert',
        title: 'Deadline missed',
        message: `"${task.title}" passed its deadline without being completed.`,
        taskId: task.id,
        urgency: 'high',
        actionUrl: '/dashboard/tasks?status=missed'
      });
      await markReminderSent(task.userId, task.id, 'missed', 'inapp');
    }

    if (!(await wasReminderSent(task.id, 'missed', 'push'))) {
      const delivered = await sendPushToUser(task.userId, {
        title: 'Deadline missed',
        body: `"${task.title}" is now overdue. Open TaskGenius to reschedule or complete it.`,
        url: '/dashboard/tasks?status=missed',
        tag: `missed-${task.id}`
      });
      if (delivered > 0) await markReminderSent(task.userId, task.id, 'missed', 'push');
    }
  }

  for (const [id, count] of missedByUser) {
    await bumpAnalytics(id, { tasksMissed: count });
  }

  return { count: confirmed.length, tasks: confirmed };
}

/**
 * Keep riskLevel/completionProbability accurate as deadlines approach.
 */
async function refreshTaskRisks({ userId = null, now = new Date() } = {}) {
  const where = {
    status: { notIn: ['completed', 'missed'] },
    deadline: { not: null, gte: now }
  };
  if (userId) where.userId = userId;

  const tasks = await prisma.task.findMany({ where, select: { id: true, deadline: true, riskLevel: true, completionProbability: true } });
  let updated = 0;
  for (const task of tasks) {
    const riskLevel = calculateRiskLevel(task.deadline, now);
    const completionProbability = calculateCompletionProbability(task.deadline, now);
    if (riskLevel !== task.riskLevel || completionProbability !== task.completionProbability) {
      await prisma.task.update({
        where: { id: task.id },
        data: { riskLevel, completionProbability }
      });
      updated += 1;
    }
  }
  return { updated };
}

module.exports = {
  hoursUntil,
  calculateRiskLevel,
  calculateCompletionProbability,
  sweepMissedTasks,
  refreshTaskRisks
};
