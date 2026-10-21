const prisma = require('../config/prisma');

/**
 * Safely create a notification row. Never throws — notification failures
 * must not break the main request flow.
 */
async function notify(userId, { type = 'info', title, message, taskId = null, urgency = 'normal', actionUrl = null }) {
  try {
    if (!userId || !title) return null;
    return await prisma.notification.create({
      data: { userId, type, title, message: message || '', taskId, urgency, actionUrl }
    });
  } catch {
    return null;
  }
}

/**
 * Generate deadline-related notifications for a task based on how soon it is due.
 * < 3h  -> urgent alert; < 24h -> deadline reminder; otherwise none.
 */
async function notifyForDeadline(userId, task) {
  if (!task?.deadline || task.status === 'completed') return;
  const hoursLeft = (new Date(task.deadline) - new Date()) / (1000 * 60 * 60);
  if (hoursLeft <= 0) return;
  if (hoursLeft < 3) {
    await notify(userId, {
      type: 'alert',
      title: 'Urgent: deadline within 3 hours',
      message: `"${task.title}" is due soon. Consider starting Rescue Mode.`,
      taskId: task.id,
      urgency: 'high',
      actionUrl: '/dashboard'
    });
  } else if (hoursLeft < 24) {
    await notify(userId, {
      type: 'deadline',
      title: 'Deadline approaching',
      message: `"${task.title}" is due in less than 24 hours.`,
      taskId: task.id,
      urgency: 'medium',
      actionUrl: '/dashboard/tasks'
    });
  }
}

module.exports = { notify, notifyForDeadline };
