const prisma = require('../config/prisma');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const generateSystemPrompt = async (userId) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tasks = await prisma.task.findMany({ where: { userId }, orderBy: { deadline: 'asc' } });
  const analytics = await prisma.analytics.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 30 });

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const todayTasks = tasks.filter(t => t.deadline && new Date(t.deadline) >= today && new Date(t.deadline) < new Date(today.getTime() + 86400000));
  const criticalTasks = tasks.filter(t => t.riskLevel === 'critical' && t.status !== 'completed');
  const missedTasks = tasks.filter(t => t.status === 'missed');

  const avgProductivity = analytics.length > 0
    ? Math.round(analytics.reduce((a, c) => a + c.productivityScore, 0) / analytics.length)
    : 0;

  return `You are TaskGenius AI, a professional productivity coach and intelligent assistant. 
Current time: ${now.toISOString()}
User's task overview:
- Total tasks: ${tasks.length}
- Pending: ${pendingTasks.length}
- Completed today: ${completedTasks.filter(t => t.completedAt && new Date(t.completedAt) >= today).length}
- Missed: ${missedTasks.length}
- Critical tasks: ${criticalTasks.length}
- Tasks due today: ${todayTasks.length}

Average productivity score: ${avgProductivity}/100

${criticalTasks.length > 0 ? `URGENT: User has ${criticalTasks.length} critical tasks that need immediate attention!` : ''}

You must:
1. Be concise, professional, and motivational
2. Analyze tasks and provide actionable advice
3. Proactively warn about risks and deadlines
4. Suggest priorities and schedules
5. Help users stay productive
6. Be empathetic but direct
7. Use emojis sparingly and professionally
8. NEVER make up fake data about tasks
9. If user has no tasks, help them plan their day
10. Provide specific, personalized recommendations based on their actual task data`;
};

exports.chat = async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user.id;

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'dummy-key-for-development') {
      const dummyResponse = `I understand you're asking about "${message.substring(0, 50)}..." 

As your TaskGenius productivity coach, I'd recommend checking your dashboard for your current tasks. To use the full AI features, please configure a valid Gemini API key in the server environment variables.

In the meantime, here's some general advice:
- Break large tasks into smaller subtasks
- Set realistic deadlines
- Focus on high-priority items first
- Take regular breaks using the Focus Mode

Is there anything specific about your tasks I can help you with?`;
      
      await prisma.aiHistory.create({ data: { userId, sessionId, role: 'user', content: message, type: 'chat' } });
      await prisma.aiHistory.create({ data: { userId, sessionId, role: 'assistant', content: dummyResponse, type: 'chat' } });
      
      return res.json({ success: true, message: dummyResponse, sessionId });
    }

    const history = await prisma.aiHistory.findMany({
      where: { userId, sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20
    });

    const systemPrompt = await generateSystemPrompt(userId);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const chatHistory = history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'I understand my role as TaskGenius AI productivity coach.' }] },
        ...chatHistory
      ],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    await prisma.aiHistory.create({ data: { userId, sessionId, role: 'user', content: message, type: 'chat' } });
    await prisma.aiHistory.create({ data: { userId, sessionId, role: 'assistant', content: response, type: 'chat' } });

    res.json({ success: true, message: response, sessionId });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ success: false, message: 'AI service error. Please try again.' });
  }
};

exports.getDailyBriefing = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(today.getTime() + 86400000);

    const todayTasks = await prisma.task.findMany({
      where: { userId, deadline: { gte: today, lt: todayEnd } },
      orderBy: { deadline: 'asc' }
    });

    const allPending = await prisma.task.findMany({
      where: { userId, status: { notIn: ['completed'] } },
      orderBy: { deadline: 'asc' }
    });

    const analytics = await prisma.analytics.findFirst({
      where: { userId, date: today }
    });

    const totalEstimated = todayTasks.reduce((sum, t) => sum + (t.estimatedDuration || 60), 0);
    const highPriorityCount = todayTasks.filter(t => t.priority === 'high' || t.priority === 'critical').length;
    const riskTasks = allPending.filter(t => t.riskLevel === 'high' || t.riskLevel === 'critical');

    let briefing = `Good morning! Here's your daily briefing for ${now.toDateString()}.\n\n`;
    briefing += `Today's Priorities:\n`;
    if (todayTasks.length === 0) {
      briefing += `No tasks due today. A great day to get ahead on upcoming work!\n`;
    } else {
      todayTasks.slice(0, 3).forEach((t, i) => {
        briefing += `${i + 1}. ${t.title} (${t.priority})\n`;
      });
    }
    briefing += `\nEstimated workload: ${totalEstimated} minutes\n`;
    briefing += `High priority tasks: ${highPriorityCount}\n`;
    if (riskTasks.length > 0) {
      briefing += `\n⚠️ Warning: ${riskTasks.length} task(s) at risk of missing deadlines.\n`;
    }
    briefing += `\nSuggested start time: 9:00 AM\n`;
    briefing += `Previous productivity: ${analytics?.productivityScore || 'N/A'}/100\n`;
    briefing += `\nLet's make today productive! 🎯`;

    res.json({ success: true, briefing, tasks: todayTasks, workload: totalEstimated });
  } catch (error) {
    console.error('Daily Briefing Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate briefing' });
  }
};

exports.getInsights = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const tasks = await prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    const analytics = await prisma.analytics.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 30 });

    const now = new Date();
    const pending = tasks.filter(t => t.status !== 'completed');
    const completed = tasks.filter(t => t.status === 'completed');
    const atRisk = tasks.filter(t => (t.riskLevel === 'critical' || t.riskLevel === 'high') && t.status !== 'completed');
    const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== 'completed');

    const avgProductivity = analytics.length > 0
      ? Math.round(analytics.reduce((a, c) => a + c.productivityScore, 0) / analytics.length)
      : 0;
    const completionRate = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

    const insights = [
      atRisk.length > 0
        ? `⚠️ ${atRisk.length} task(s) need immediate attention. Prioritize them to avoid missed deadlines.`
        : `✅ All tasks are on track. Great job staying ahead!`,
      `📊 Your completion rate is ${completionRate}%. ${completionRate > 70 ? 'Keep up the excellent work!' : 'Focus on completing more tasks each day.'}`,
      overdue.length > 0
        ? `⏰ You have ${overdue.length} overdue task(s). Consider rescheduling or reprioritizing.`
        : `📅 No overdue tasks. You're on top of your deadlines!`,
      pending.length > 0
        ? `🎯 You have ${pending.length} pending tasks. Start with the highest priority first.`
        : `🎉 All tasks completed! Time to plan new ones.`,
      avgProductivity > 0 ? `📈 Average productivity score: ${avgProductivity}/100. ${avgProductivity > 70 ? 'You are very productive!' : 'There is room for improvement.'}` : null
    ].filter(Boolean);

    res.json({ success: true, insights });
  } catch (error) {
    console.error('Insights Error:', error);
    res.json({ success: true, insights: ['Unable to generate AI insights right now.'] });
  }
};

exports.analyzeTask = async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.taskId, userId: req.user.id },
      include: { subtasks: true }
    });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const analysis = {
      estimatedTime: task.estimatedDuration || 60,
      priority: task.priority,
      subtasks: task.subtasks?.map(s => s.title) || ['Review requirements', 'Break down into steps', 'Start working'],
      risk: task.riskLevel,
      suggestedTime: 'morning'
    };

    await prisma.aiHistory.create({
      data: {
        userId: req.user.id,
        sessionId: `task-${task.id}`,
        role: 'assistant',
        content: JSON.stringify(analysis),
        type: 'analysis',
        metadata: { taskId: task.id }
      }
    });

    res.json({ success: true, analysis });
  } catch (error) {
    next(error);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    const where = { userId: req.user.id };
    if (sessionId) where.sessionId = sessionId;

    const history = await prisma.aiHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
};

exports.clearHistory = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const where = { userId: req.user.id };
    if (sessionId) where.sessionId = sessionId;

    await prisma.aiHistory.deleteMany({ where });
    res.json({ success: true, message: 'History cleared' });
  } catch (error) {
    next(error);
  }
};
