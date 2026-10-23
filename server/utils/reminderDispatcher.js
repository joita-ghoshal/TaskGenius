const prisma = require('../config/prisma');
const { hoursUntil } = require('./deadlines');
const { notify } = require('./notify');
const { wasReminderSent, markReminderSent } = require('./reminders');
const { sendDeadlineReminderEmail } = require('./email');
const { sendPushToUser } = require('./push');

const THRESHOLDS = [
  { kind: 'due_24h', maxHours: 24, minHours: 3, label: 'within 24 hours' },
  { kind: 'due_3h', maxHours: 3, minHours: 1, label: 'within 3 hours' },
  { kind: 'due_1h', maxHours: 1, minHours: 0, label: 'within 1 hour' }
];

function thresholdsFor(hoursLeft) {
  return THRESHOLDS.filter((t) => hoursLeft <= t.maxHours && hoursLeft > t.minHours);
}

/**
 * Send all due deadline reminders for one user (or every user) exactly once per
 * task/threshold/channel. Returns per-channel delivery counters.
 */
async function dispatchDeadlineReminders({ userId = null, taskId = null, now = new Date() } = {}) {
  const where = {
    status: { in: ['pending', 'in-progress'] },
    deadline: { not: null, gt: now, lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) }
  };
  if (userId) where.userId = userId;
  if (taskId) where.id = taskId;

  const tasks = await prisma.task.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { deadline: 'asc' }
  });

  const result = { tasks: tasks.length, inApp: 0, email: 0, push: 0 };

  for (const task of tasks) {
    const hoursLeft = hoursUntil(task.deadline, now);
    const dueThresholds = thresholdsFor(hoursLeft);
    if (dueThresholds.length === 0) continue;

    for (const threshold of dueThresholds) {
      if (!(await wasReminderSent(task.id, threshold.kind, 'inapp'))) {
        await notify(task.userId, {
          type: threshold.kind === 'due_24h' ? 'deadline' : 'alert',
          title: threshold.kind === 'due_24h' ? 'Deadline approaching' : 'Deadline is close',
          message: `"${task.title}" is due ${threshold.label}.`,
          taskId: task.id,
          urgency: threshold.kind === 'due_24h' ? 'medium' : 'high',
          actionUrl: '/dashboard/tasks'
        });
        await markReminderSent(task.userId, task.id, threshold.kind, 'inapp');
        result.inApp += 1;
      }

      if (!(await wasReminderSent(task.id, threshold.kind, 'email'))) {
        const delivery = await sendDeadlineReminderEmail(task.user, task, threshold.kind);
        if (delivery.sent) {
          await markReminderSent(task.userId, task.id, threshold.kind, 'email');
          result.email += 1;
        }
      }

      if (!(await wasReminderSent(task.id, threshold.kind, 'push'))) {
        const delivered = await sendPushToUser(task.userId, {
          title: threshold.kind === 'due_24h' ? 'Deadline approaching' : 'Deadline is close',
          body: `"${task.title}" is due ${threshold.label}.`,
          url: '/dashboard/tasks',
          tag: `${threshold.kind}-${task.id}`,
          urgency: threshold.kind === 'due_24h' ? 'normal' : 'high'
        });
        if (delivered > 0) {
          await markReminderSent(task.userId, task.id, threshold.kind, 'push');
          result.push += delivered;
        }
      }
    }
  }

  return result;
}

module.exports = { dispatchDeadlineReminders, THRESHOLDS };
