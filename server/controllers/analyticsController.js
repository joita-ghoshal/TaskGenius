const prisma = require('../config/prisma');

exports.logAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { date, tasksCompleted, tasksMissed, tasksCreated, focusSessions, focusMinutes, productivityScore, averageCompletionTime, aiInteractions, increment } = req.body;
    const recordDate = date ? new Date(date) : new Date();
    recordDate.setHours(0, 0, 0, 0);

    const wrap = (v) => (increment && typeof v === 'number' ? { increment: v } : v);

    const analytics = await prisma.analytics.upsert({
      where: { userId_date: { userId, date: recordDate } },
      update: {
        tasksCompleted: tasksCompleted !== undefined ? wrap(tasksCompleted) : undefined,
        tasksMissed: tasksMissed !== undefined ? wrap(tasksMissed) : undefined,
        tasksCreated: tasksCreated !== undefined ? wrap(tasksCreated) : undefined,
        focusSessions: focusSessions !== undefined ? wrap(focusSessions) : undefined,
        focusMinutes: focusMinutes !== undefined ? wrap(focusMinutes) : undefined,
        productivityScore: productivityScore !== undefined ? productivityScore : undefined,
        averageCompletionTime: averageCompletionTime !== undefined ? averageCompletionTime : undefined,
        aiInteractions: aiInteractions !== undefined ? wrap(aiInteractions) : undefined
      },
      create: {
        userId,
        date: recordDate,
        tasksCompleted: tasksCompleted || 0,
        tasksMissed: tasksMissed || 0,
        tasksCreated: tasksCreated || 0,
        focusSessions: focusSessions || 0,
        focusMinutes: focusMinutes || 0,
        productivityScore: productivityScore || 0,
        averageCompletionTime: averageCompletionTime || 0,
        aiInteractions: aiInteractions || 0
      }
    });
    res.json({ success: true, analytics });
  } catch (error) {
    next(error);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { period } = req.query;
    const now = new Date();
    let startDate;

    switch (period) {
      case 'weekly': startDate = new Date(now.getTime() - 7 * 86400000); break;
      case 'monthly': startDate = new Date(now.getTime() - 30 * 86400000); break;
      default: startDate = new Date(now.getTime() - 7 * 86400000);
    }

    const [analytics, tasks] = await Promise.all([
      prisma.analytics.findMany({ where: { userId, date: { gte: startDate } }, orderBy: { date: 'asc' } }),
      prisma.task.findMany({ where: { userId } })
    ]);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const missedTasks = tasks.filter(t => t.status === 'missed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in-progress');

    const completedWithTimes = tasks.filter(t => t.status === 'completed' && t.completedAt && t.createdAt);
    const avgCompletionTime = completedWithTimes.length > 0
      ? Math.round(completedWithTimes.reduce((a, t) => a + (new Date(t.completedAt) - new Date(t.createdAt)), 0) / completedWithTimes.length / 60000)
      : 0;

    const productivityTrend = analytics.map(a => {
      const denom = a.tasksCompleted + a.tasksMissed;
      const score = denom > 0 ? Math.round((a.tasksCompleted / denom) * 100) : (a.productivityScore || 0);
      return {
        date: a.date,
        score,
        completed: a.tasksCompleted,
        missed: a.tasksMissed,
        focusMinutes: a.focusMinutes
      };
    });

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      success: true,
      analytics: {
        summary: {
          totalTasks, completedTasks, missedTasks,
          pendingTasks: pendingTasks.length, completionRate,
          avgCompletionTime,
          totalFocusMinutes: analytics.reduce((a, c) => a + c.focusMinutes, 0)
        },
        productivityTrend, period
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getProductivityStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 86400000);

    const [analytics, tasks] = await Promise.all([
      prisma.analytics.findMany({ where: { userId, date: { gte: startDate } }, orderBy: { date: 'asc' } }),
      prisma.task.findMany({ where: { userId } })
    ]);

    const dailyAverages = analytics.reduce((acc, a) => {
      const denom = a.tasksCompleted + a.tasksMissed;
      const score = denom > 0 ? Math.round((a.tasksCompleted / denom) * 100) : (a.productivityScore || 0);
      acc.productivity += score;
      acc.completed += a.tasksCompleted;
      acc.focusMinutes += a.focusMinutes;
      return acc;
    }, { productivity: 0, completed: 0, focusMinutes: 0 });

    const daysCount = analytics.length || 1;

    const categoryMap = {};
    tasks.forEach(t => {
      if (!categoryMap[t.category]) categoryMap[t.category] = { category: t.category, total: 0, completed: 0, pending: 0 };
      categoryMap[t.category].total++;
      if (t.status === 'completed') categoryMap[t.category].completed++;
      else categoryMap[t.category].pending++;
    });
    const categoryBreakdown = Object.values(categoryMap);

    const scored = analytics.map(a => {
      const denom = a.tasksCompleted + a.tasksMissed;
      return { ...a, computedScore: denom > 0 ? Math.round((a.tasksCompleted / denom) * 100) : (a.productivityScore || 0) };
    });
    const bestDay = scored.sort((a, b) => b.computedScore - a.computedScore)[0];

    res.json({
      success: true,
      stats: {
        averageProductivity: Math.round(dailyAverages.productivity / daysCount),
        averageCompleted: Math.round(dailyAverages.completed / daysCount),
        averageFocusMinutes: Math.round(dailyAverages.focusMinutes / daysCount),
        bestDay: bestDay?.date || null,
        categoryBreakdown,
        totalAnalyticsDays: analytics.length
      }
    });
  } catch (error) {
    next(error);
  }
};
