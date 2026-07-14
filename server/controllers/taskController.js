const prisma = require('../config/prisma');

const calculateRiskLevel = (deadline) => {
  if (!deadline) return 'low';
  const hoursLeft = (new Date(deadline) - new Date()) / (1000 * 60 * 60);
  if (hoursLeft < 1) return 'critical';
  if (hoursLeft < 6) return 'high';
  if (hoursLeft < 24) return 'medium';
  if (hoursLeft < 72) return 'low';
  return 'low';
};

const calculateCompletionProbability = (deadline) => {
  if (!deadline) return 100;
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const totalTime = deadlineDate - now;
  if (totalTime <= 0) return 0;
  const hoursLeft = totalTime / (1000 * 60 * 60);
  return Math.round(Math.max(0, Math.min(100, hoursLeft > 72 ? 95 : hoursLeft > 24 ? 75 : hoursLeft > 6 ? 50 : hoursLeft > 1 ? 25 : 10)));
};

const taskInclude = {
  subtasks: { orderBy: { createdAt: 'asc' } },
  notes: { orderBy: { createdAt: 'desc' }, take: 5 }
};

exports.getTasks = async (req, res, next) => {
  try {
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
    const riskLevel = calculateRiskLevel(deadlineDate);
    const completionProbability = calculateCompletionProbability(deadlineDate);

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
        subtasks: subtasks?.length > 0 ? {
          create: subtasks.map(s => ({ title: s.title || s }))
        } : undefined,
        notes: notes?.length > 0 ? {
          create: notes.map(n => ({ content: n.content || n }))
        } : undefined
      },
      include: taskInclude
    });
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
    if (deadline !== undefined) {
      data.deadline = deadline ? new Date(deadline) : null;
      data.riskLevel = calculateRiskLevel(data.deadline);
      data.completionProbability = calculateCompletionProbability(data.deadline);
    }
    if (estimatedDuration) data.estimatedDuration = estimatedDuration;
    if (status) {
      data.status = status;
      if (status === 'completed') data.completedAt = new Date();
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

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: taskInclude
    });
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

    const allTasks = await prisma.task.findMany({ where: { userId } });

    const todayTasks = allTasks.filter(t => t.deadline && new Date(t.deadline) >= today && new Date(t.deadline) < tomorrow);
    const upcomingTasks = allTasks.filter(t => t.deadline && new Date(t.deadline) > tomorrow && t.status !== 'completed').slice(0, 10);
    const completedToday = allTasks.filter(t => t.status === 'completed' && t.completedAt && new Date(t.completedAt) >= today).length;
    const pendingTasks = allTasks.filter(t => t.status === 'pending' || t.status === 'in-progress').length;
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const totalTasks = allTasks.length;
    const missedTasks = allTasks.filter(t => t.status === 'missed').length;
    const productivityScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const criticalTasks = allTasks.filter(t => t.riskLevel === 'critical' && t.status !== 'completed');
    const emergencyTasks = allTasks.filter(t => {
      if (!t.deadline || t.status === 'completed') return false;
      const hoursLeft = (new Date(t.deadline) - now) / (1000 * 60 * 60);
      return hoursLeft < 3 && hoursLeft > 0;
    });

    const nearestDeadline = allTasks
      .filter(t => t.deadline && t.status !== 'completed')
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
