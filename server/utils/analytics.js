const prisma = require('../config/prisma');

/**
 * Increment today's analytics counters for a user. Never throws.
 * Example: bumpAnalytics(userId, { tasksCompleted: 1, focusMinutes: 25 })
 */
async function bumpAnalytics(userId, fields) {
  try {
    if (!userId) return null;
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    const data = {};
    for (const [key, value] of Object.entries(fields)) {
      if (typeof value === 'number' && value !== 0) data[key] = { increment: value };
    }
    if (Object.keys(data).length === 0) return null;

    return await prisma.analytics.upsert({
      where: { userId_date: { userId, date } },
      update: data,
      create: {
        userId,
        date,
        tasksCompleted: Math.max(0, data.tasksCompleted?.increment || 0),
        tasksMissed: Math.max(0, data.tasksMissed?.increment || 0),
        tasksCreated: Math.max(0, data.tasksCreated?.increment || 0),
        focusSessions: Math.max(0, data.focusSessions?.increment || 0),
        focusMinutes: Math.max(0, data.focusMinutes?.increment || 0),
        productivityScore: 0,
        averageCompletionTime: 0,
        aiInteractions: Math.max(0, data.aiInteractions?.increment || 0)
      }
    });
  } catch {
    return null;
  }
}

module.exports = { bumpAnalytics };
