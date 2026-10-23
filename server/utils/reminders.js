const prisma = require('../config/prisma');

async function wasReminderSent(taskId, kind, channel) {
  if (!taskId) return false;
  try {
    const row = await prisma.reminderLog.findUnique({
      where: { taskId_kind_channel: { taskId, kind, channel } }
    });
    return Boolean(row);
  } catch {
    return false;
  }
}

async function markReminderSent(userId, taskId, kind, channel) {
  if (!userId || !taskId) return null;
  try {
    return await prisma.reminderLog.upsert({
      where: { taskId_kind_channel: { taskId, kind, channel } },
      update: { sentAt: new Date() },
      create: { userId, taskId, kind, channel }
    });
  } catch {
    return null;
  }
}

module.exports = { wasReminderSent, markReminderSent };
