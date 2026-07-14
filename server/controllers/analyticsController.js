const prisma = require('../config/prisma');

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

    const avgCompletionTime = analytics.length > 0
      ? Math.round(analytics.reduce((a, c) => a + c.averageCompletionTime, 0) / analytics.length)
      : 0;

    const productivityTrend = analytics.map(a => ({
      date: a.date,
      score: a.productivityScore,
      completed: a.tasksCompleted,
      missed: a.tasksMissed,
      focusMinutes: a.focusMinutes
    }));

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
      acc.productivity += a.productivityScore;
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

    const bestDay = analytics.sort((a, b) => b.productivityScore - a.productivityScore)[0];

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
