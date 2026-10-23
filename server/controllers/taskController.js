const prisma = require('../config/prisma');
const { notify } = require('../utils/notify');
const { bumpAnalytics } = require('../utils/analytics');
const {
  calculateRiskLevel,
  calculateCompletionProbability,
  sweepMissedTasks
} = require('../utils/deadlines');
const { dispatchDeadlineReminders } = require('../utils/reminderDispatcher');

const taskInclude = {
  subtasks: { orderBy: { createdAt: 'asc' } },
  notes: { orderBy: { createdAt: 'desc' }, take: 5 }
};

exports.getTasks = async (req, res, next) => {
  try {
    await sweepMissedTasks({ userId: req.user.id });
    const { status, priority, category, search, sort } = req.query;
    const where = { userId: req.user.id };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (search) where.title = { contains: search, mode: 'insensitive' };

    let orderBy = [{ deadline: 'asc' }];
    if (sort === 'priority') orderBy = [{ priority: 'desc' }, { deadline: 'asc' }];
    if (sort === 'created') orderBy = [{ createdAt: 'desc' }];
    if (sort === 'title') orderBy = [{ title: 'asc' }];

    const tasks = await prisma.task.findMany({ where, orderBy, include: taskInclude });
    res.json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    next(error);
  }
};

exports.getTask = async (req, res, next) => {
  try {
    await sweepMissedTasks({ userId: req.user.id });
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: taskInclude
    });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const { title, description, priority, category, deadline, estimatedDuration, subtasks, notes } = req.body;
    const deadlineDate = deadline ? new Date(deadline) : null;
    const isOverdue = Boolean(deadlineDate && deadlineDate <= new Date());
    const riskLevel = calculateRiskLevel(deadlineDate);
    const completionProbability = calculateCompletionProbability(deadlineDate);

    const noteList = Array.isArray(notes)
      ? notes
      : (notes && String(notes).trim() ? [{ content: String(notes) }] : []);

    const task = await prisma.task.create({
      data: {
        userId: req.user.id,
        title,
        description: description || '',
        priority: priority || 'medium',
        category: category || 'general',
        deadline: deadlineDate,
        estimatedDuration: estimatedDuration || 60,
        riskLevel,
        completionProbability,
        status: isOverdue ? 'missed' : 'pending',
        subtasks: subtasks?.length > 0 ? {
          create: subtasks.map(s => ({ title: s.title || s }))
        } : undefined,
        notes: noteList.length > 0 ? {
          create: noteList.map(n => ({ content: n.content || n }))
        } : undefined
      },
      include: taskInclude
    });

    bumpAnalytics(req.user.id, { tasksCreated: 1 });
    if (isOverdue) {
      bumpAnalytics(req.user.id, { tasksMissed: 1 });
      await notify(req.user.id, {
        type: 'alert',
        title: 'Deadline missed',
        message: `"${task.title}" was created with a deadline that has already passed.`,
        taskId: task.id,
        urgency: 'high',
        actionUrl: '/dashboard/tasks?status=missed'
      });
    } else {
      await dispatchDeadlineReminders({ userId: req.user.id, taskId: task.id });
    }
    res.status(201).json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Task not found' });

    const { title, description, priority, category, deadline, estimatedDuration, status, subtasks, notes, completionProbability } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (priority) data.priority = priority;
    if (category) data.category = category;
    const now = new Date();
    if (deadline !== undefined) {
      data.deadline = deadline ? new Date(deadline) : null;
      data.riskLevel = calculateRiskLevel(data.deadline, now);
      data.completionProbability = calculateCompletionProbability(data.deadline, now);
      if (!status && existing.status === 'missed' && data.deadline && data.deadline > now) {
        data.status = 'pending';
        data.completedAt = null;
      }
    }
    if (estimatedDuration) data.estimatedDuration = estimatedDuration;
    if (status) {
      data.status = status;
      if (status === 'completed') data.completedAt = now;
      else if (existing.status === 'completed') data.completedAt = null;
    }
    if (completionProbability !== undefined) data.completionProbability = completionProbability;

    if (subtasks) {
      await prisma.taskSubtask.deleteMany({ where: { taskId: req.params.id } });
      if (subtasks.length > 0) {
        await prisma.taskSubtask.createMany({
          data: subtasks.map(s => ({ taskId: req.params.id, title: s.title || s }))
        });
      }
    }

    if (notes !== undefined) {
      await prisma.taskNote.deleteMany({ where: { taskId: req.params.id } });
      const noteList = Array.isArray(notes)
        ? notes
        : (notes ? [{ content: String(notes) }] : []);
      if (noteList.length > 0) {
        await prisma.taskNote.createMany({
          data: noteList.map(n => ({ taskId: req.params.id, content: n.content || String(n) }))
        });
      }
    }

    await prisma.task.update({
      where: { id: req.params.id },
      data
    });

    await sweepMissedTasks({ userId: req.user.id, now: new Date() });
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: taskInclude
    });

    const taskWasCompleted = existing.status === 'completed';
    const taskIsCompleted = task.status === 'completed';

    if (!taskWasCompleted && taskIsCompleted) {
      bumpAnalytics(req.user.id, { tasksCompleted: 1 });
      await notify(req.user.id, {
        type: 'success',
        title: 'Task completed',
        message: `"${task.title}" marked as completed. Great work!`,
        taskId: task.id,
        urgency: 'low',
        actionUrl: '/dashboard/analytics'
      });
    } else if (taskWasCompleted && !taskIsCompleted) {
      bumpAnalytics(req.user.id, { tasksCompleted: -1 });
    }

    if (!taskIsCompleted && (deadline !== undefined || data.status === 'pending')) {
      await dispatchDeadlineReminders({ userId: req.user.id, taskId: task.id });
    }

    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    await prisma.task.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await sweepMissedTasks({ userId, now });
    const allTasks = await prisma.task.findMany({ where: { userId } });

    const todayTasks = allTasks.filter(t => t.deadline && new Date(t.deadline) >= today && new Date(t.deadline) < tomorrow);
    const upcomingTasks = allTasks.filter(t => t.deadline && new Date(t.deadline) > tomorrow && t.status !== 'completed' && t.status !== 'missed').slice(0, 10);
    const completedToday = allTasks.filter(t => t.status === 'completed' && t.completedAt && new Date(t.completedAt) >= today).length;
    const pendingTasks = allTasks.filter(t => t.status === 'pending' || t.status === 'in-progress').length;
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const totalTasks = allTasks.length;
    const missedTasks = allTasks.filter(t => t.status === 'missed').length;
    const overdueTasks = allTasks.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== 'completed');
    const scoredTasks = completedTasks + missedTasks;
    const productivityScore = scoredTasks > 0 ? Math.round((completedTasks / scoredTasks) * 100) : 0;

    const criticalTasks = allTasks.filter(t => t.status !== 'completed' && t.status !== 'missed' && (
      t.riskLevel === 'critical' || (t.deadline && (new Date(t.deadline) - now) / 3600000 < 1)
    ));
    const emergencyTasks = allTasks.filter(t => {
      if (!t.deadline || t.status === 'completed' || t.status === 'missed') return false;
      const hoursLeft = (new Date(t.deadline) - now) / (1000 * 60 * 60);
      return hoursLeft < 3 && hoursLeft > 0;
    });

    const nearestDeadline = allTasks
      .filter(t => t.deadline && t.status !== 'completed' && t.status !== 'missed')
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];

    const categoryMap = {};
    allTasks.forEach(t => {
      if (!categoryMap[t.category]) categoryMap[t.category] = { category: t.category, count: 0, completed: 0 };
      categoryMap[t.category].count++;
      if (t.status === 'completed') categoryMap[t.category].completed++;
    });
    const tasksByCategory = Object.values(categoryMap);

    res.json({
      success: true,
      dashboard: {
        todayTasks,
        upcomingTasks,
        completedToday,
        pendingTasks,
        totalTasks,
        completedTasks,
        missedTasks,
        overdueTasks,
        overdueCount: overdueTasks.length,
        productivityScore,
        criticalTasks,
        emergencyTasks,
        nearestDeadline: nearestDeadline || null,
        tasksByCategory
      }
    });
  } catch (error) {
    next(error);
  }
};
