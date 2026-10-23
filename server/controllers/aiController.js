const prisma = require('../config/prisma');
const { isGeminiConfigured, generateText, generateJson } = require('../utils/gemini');
const { hoursUntil, sweepMissedTasks } = require('../utils/deadlines');
const { bumpAnalytics } = require('../utils/analytics');

const briefingCache = new Map();
const insightsCache = new Map();
const BRIEFING_TTL_MS = Number(process.env.BRIEFING_CACHE_MS || 30 * 60 * 1000);
const INSIGHTS_TTL_MS = Number(process.env.INSIGHTS_CACHE_MS || 10 * 60 * 1000);

function cacheGet(cache, key, ttl) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ttl) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(cache, key, value) {
  cache.set(key, { at: Date.now(), value });
}

function taskLine(task, now) {
  const left = hoursUntil(task.deadline, now);
  const due = task.deadline ? new Date(task.deadline).toISOString() : 'no deadline';
  const leftLabel = task.deadline
    ? left <= 0
      ? 'OVERDUE'
      : left < 24
        ? `${Math.round(left * 60)} minutes left`
        : `${Math.round(left)} hours left`
    : 'none';
  return `- [${task.status}/${task.priority}/${task.riskLevel}] "${task.title}" | category=${task.category} | due=${due} (${leftLabel}) | estimate=${task.estimatedDuration || 60}m | probability=${task.completionProbability}%`;
}

async function buildUserContext(userId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);

  await sweepMissedTasks({ userId, now });

  const [user, tasks, analytics] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.task.findMany({ where: { userId }, orderBy: { deadline: 'asc' } }),
    prisma.analytics.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 30 })
  ]);

  const pending = tasks.filter((t) => t.status !== 'completed' && t.status !== 'missed');
  const overdue = tasks.filter((t) => t.status === 'missed' || (t.deadline && new Date(t.deadline) < now && t.status !== 'completed'));
  const completedToday = tasks.filter((t) => t.status === 'completed' && t.completedAt && new Date(t.completedAt) >= today);
  const dueToday = tasks.filter((t) => t.deadline && new Date(t.deadline) >= today && new Date(t.deadline) < tomorrow && t.status !== 'completed');
  const completed = tasks.filter((t) => t.status === 'completed');

  const avgProductivity = analytics.length > 0
    ? Math.round(analytics.reduce((a, c) => a + (c.productivityScore || 0), 0) / analytics.length)
    : 0;
  const completionRate = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;
  const focusMinutes = analytics.reduce((a, c) => a + (c.focusMinutes || 0), 0);

  const contextText = [
    `Current time: ${now.toISOString()} (local: ${now.toLocaleString('en-US')})`,
    `User: ${user?.name || 'TaskGenius user'}`,
    `Goals: ${user?.goals || 'not specified'}`,
    `Daily target: ${user?.dailyTarget || 5} tasks | work hours: ${user?.workingHourStart || '09:00'}-${user?.workingHourEnd || '17:00'} | preferred study time: ${user?.preferredStudyTime || 'morning'}`,
    '',
    `Totals: ${tasks.length} tasks, ${pending.length} pending, ${overdue.length} overdue/missed, ${completed.length} completed, ${completedToday.length} completed today, ${dueToday.length} due today.`,
    `Completion rate: ${completionRate}% | 30-day average productivity: ${avgProductivity}/100 | recent focus minutes: ${focusMinutes}.`,
    '',
    'Open and upcoming tasks (highest urgency first):',
    ...(pending.length > 0 ? pending.slice(0, 15).map((t) => taskLine(t, now)) : ['- No open tasks']),
    '',
    `Overdue/missed tasks: ${overdue.length > 0 ? overdue.slice(0, 10).map((t) => `"${t.title}"`).join(', ') : 'none'}`,
    '',
    'Recent daily analytics (newest first):',
    ...(analytics.length > 0
      ? analytics.slice(0, 10).map((a) => `- ${new Date(a.date).toISOString().slice(0, 10)}: completed=${a.tasksCompleted}, missed=${a.tasksMissed}, created=${a.tasksCreated}, focus=${a.focusMinutes}m, score=${a.productivityScore}`)
      : ['- No analytics history yet'])
  ].join('\n');

  return { user, tasks, pending, overdue, completedToday, dueToday, analytics, avgProductivity, completionRate, contextText, now };
}

const CHAT_SYSTEM = `You are TaskGenius AI, a professional productivity coach and deadline-rescue assistant.
Rules:
1. Be concise, warm, direct, and practical.
2. Use ONLY the supplied task and analytics data. Never invent tasks, deadlines, or numbers.
3. Proactively call out overdue and at-risk work, and give a concrete next step.
4. Prefer short paragraphs and at most 5 bullets.
5. If the user has no tasks, help them plan realistic next work.
6. Use emojis sparingly.
7. Never claim an action was performed unless the data says so.`;

exports.chat = async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user.id;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }
    if (!isGeminiConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'AI_NOT_CONFIGURED',
        message: 'AI is not configured on the server. Set a valid GEMINI_API_KEY.'
      });
    }

    const activeSession = sessionId || `chat-${Date.now()}`;
    const history = await prisma.aiHistory.findMany({
      where: { userId, sessionId: activeSession },
      orderBy: { createdAt: 'asc' },
      take: 20
    });

    const { contextText } = await buildUserContext(userId);
    const chatHistory = history.map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));

        const { text: response, model } = await generateText({
      system: `${CHAT_SYSTEM}\n\nLIVE USER DATA:\n${contextText}`,
      history: chatHistory,
      prompt: String(message),
      maxOutputTokens: 3072,
      temperature: 0.7
    });

    await prisma.aiHistory.create({ data: { userId, sessionId: activeSession, role: 'user', content: String(message), type: 'chat' } });
    await prisma.aiHistory.create({
      data: {
        userId,
        sessionId: activeSession,
        role: 'assistant',
        content: response,
        type: 'chat',
        metadata: { model }
      }
    });
    await bumpAnalytics(userId, { aiInteractions: 1 });

    res.json({ success: true, message: response, reply: response, sessionId: activeSession, model });
  } catch (error) {
    console.error('AI Chat Error:', error?.message);
    const status = error?.code === 'GEMINI_NOT_CONFIGURED' ? 503 : 502;
    res.status(status).json({
      success: false,
      code: error?.code || 'AI_ERROR',
      message: status === 503 ? 'AI is not configured on the server.' : 'AI service is temporarily unavailable. Please try again.'
    });
  }
};

function briefingToText(data) {
  const lines = [];
  if (data.greeting) lines.push(data.greeting);
  if (data.summary) lines.push('', data.summary);
  if (Array.isArray(data.priorities) && data.priorities.length > 0) {
    lines.push('', 'Top priorities:');
    data.priorities.slice(0, 5).forEach((item, index) => {
      const title = typeof item === 'string' ? item : item.title;
      const reason = typeof item === 'object' ? item.reason : '';
      lines.push(`${index + 1}. ${title}${reason ? ` — ${reason}` : ''}`);
    });
  }
  if (Array.isArray(data.risks) && data.risks.length > 0) {
    lines.push('', 'Watch out:');
    data.risks.slice(0, 4).forEach((risk) => lines.push(`- ${typeof risk === 'string' ? risk : `${risk.title}: ${risk.risk || risk.reason || ''}`}`));
  }
  if (data.focusTip) lines.push('', `Focus tip: ${data.focusTip}`);
  if (data.motivation) lines.push('', data.motivation);
  return lines.join('\n').trim();
}

exports.getDailyBriefing = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const refresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const now = new Date();
    const cacheKey = `${userId}:${now.toISOString().slice(0, 10)}:${now.getHours()}`;

    if (!refresh) {
      const cached = cacheGet(briefingCache, cacheKey, BRIEFING_TTL_MS);
      if (cached) return res.json({ success: true, ...cached, cached: true });
    }

    if (!isGeminiConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'AI_NOT_CONFIGURED',
        message: 'Daily briefing requires a valid GEMINI_API_KEY on the server.'
      });
    }

    const ctx = await buildUserContext(userId);
    const prompt = `Create a personalized daily briefing for this user using their real data.

Return ONLY a JSON object with this schema:
{
  "greeting": "one short personalized greeting (<= 15 words)",
  "summary": "2-4 sentences summarizing the day, workload, and what matters most",
  "priorities": [{"title": "exact task title from data", "reason": "why it matters now", "recommendedStart": "HH:MM or relative time"}],
  "risks": [{"title": "exact task title from data", "risk": "specific consequence or warning"}],
  "focusTip": "one concrete focus tactic for today",
  "workloadMinutes": 0,
  "motivation": "one short motivating sentence",
  "taskCount": 0
}

Rules:
- priorities: at most 3, only real open tasks from the data, ordered by urgency/impact.
- risks: only real overdue, due-soon, or high-risk tasks; empty array if none.
- workloadMinutes: sum of estimated minutes for tasks due today (use the data; 0 if none).
- taskCount: number of open tasks due today. Use the actual numbers from the data if you want, but you must not invent tasks that aren't listed.
- Do not include markdown fences. Return the JSON object only.

LIVE USER DATA:
${ctx.contextText}`;

    const { data, model } = await generateJson({
      system: 'You are TaskGenius AI, a precise productivity coach. You only use supplied data and always return valid JSON.',
      prompt,
      maxOutputTokens: 6144,
      temperature: 0.4
    });

    const normalized = {
      briefing: briefingToText(data),
      structured: data,
      tasks: ctx.dueToday,
      workload: Number(data.workloadMinutes) || ctx.dueToday.reduce((sum, t) => sum + (t.estimatedDuration || 60), 0),
      stats: {
        openTasks: ctx.pending.length,
        overdueTasks: ctx.overdue.length,
        completedToday: ctx.completedToday.length,
        completionRate: ctx.completionRate,
        averageProductivity: ctx.avgProductivity
      },
      generatedBy: 'gemini',
      model,
      generatedAt: now.toISOString()
    };

    cacheSet(briefingCache, cacheKey, normalized);

    await prisma.aiHistory.create({
      data: {
        userId,
        sessionId: `briefing-${now.toISOString().slice(0, 10)}`,
        role: 'assistant',
        content: JSON.stringify(normalized.structured),
        type: 'briefing',
        metadata: { model, generatedAt: normalized.generatedAt }
      }
    });
    await bumpAnalytics(userId, { aiInteractions: 1 });

    res.json({ success: true, ...normalized, cached: false });
  } catch (error) {
    console.error('Daily Briefing Error:', error?.message);
    const status = error?.code === 'GEMINI_NOT_CONFIGURED' ? 503 : 502;
    res.status(status).json({
      success: false,
      code: error?.code || 'AI_ERROR',
      message: status === 503 ? 'Daily briefing requires a valid GEMINI_API_KEY on the server.' : 'Could not generate the daily briefing right now.'
    });
  }
};

exports.getInsights = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cached = cacheGet(insightsCache, userId, INSIGHTS_TTL_MS);
    if (cached && req.query.refresh !== 'true') return res.json({ success: true, ...cached, cached: true });

    if (!isGeminiConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'AI_NOT_CONFIGURED',
        message: 'AI insights require a valid GEMINI_API_KEY on the server.'
      });
    }

    const ctx = await buildUserContext(userId);
    const prompt = `Generate 3-5 intelligent, personalized productivity insights from the user's real data.

Return ONLY a JSON object:
{
  "insights": [
    { "type": "risk|pattern|recommendation|win", "title": "short title", "message": "one or two specific sentences grounded in the data" }
  ]
}

Rules:
- Each insight must reference actual task titles, counts, deadlines, categories, or analytics from the data.
- Prioritize deadline risk, workload realism, completion patterns, and one actionable recommendation.
- No generic filler, no invented metrics, no markdown.

LIVE USER DATA:
${ctx.contextText}`;

    const { data, model } = await generateJson({
      system: 'You are TaskGenius AI, a data-grounded productivity analyst. Only use supplied data and return valid JSON.',
      prompt,
      maxOutputTokens: 2048,
      temperature: 0.55
    });

    const items = Array.isArray(data.insights) ? data.insights.slice(0, 5) : [];
    const normalized = {
      insights: items.map((item) => (typeof item === 'string' ? item : item.message || item.title)).filter(Boolean),
      items,
      generatedBy: 'gemini',
      model,
      generatedAt: new Date().toISOString()
    };
    cacheSet(insightsCache, userId, normalized);
    await bumpAnalytics(userId, { aiInteractions: 1 });

    res.json({ success: true, ...normalized, cached: false });
  } catch (error) {
    console.error('Insights Error:', error?.message);
    const status = error?.code === 'GEMINI_NOT_CONFIGURED' ? 503 : 502;
    res.status(status).json({
      success: false,
      code: error?.code || 'AI_ERROR',
      message: status === 503 ? 'AI insights require a valid GEMINI_API_KEY on the server.' : 'Could not generate AI insights right now.'
    });
  }
};

exports.analyzeTask = async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.taskId, userId: req.user.id },
      include: { subtasks: true }
    });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (!isGeminiConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'AI_NOT_CONFIGURED',
        message: 'Task analysis requires a valid GEMINI_API_KEY on the server.'
      });
    }

    const ctx = await buildUserContext(req.user.id);
    const prompt = `Analyze this task and build a concrete rescue/execution plan.

TASK:
- title: ${task.title}
- description: ${task.description || '(none)'}
- priority: ${task.priority}
- category: ${task.category}
- status: ${task.status}
- deadline: ${task.deadline ? new Date(task.deadline).toISOString() : 'none'}
- estimatedDuration: ${task.estimatedDuration || 60} minutes
- existing subtasks: ${task.subtasks.map((s) => s.title).join(', ') || '(none)'}

USER CONTEXT:
${ctx.contextText}

Return ONLY JSON:
{
  "estimatedTime": 0,
  "priority": "low|medium|high|critical",
  "risk": "low|medium|high|critical",
  "suggestedTime": "specific time window to start, e.g. 14:00-14:45",
  "reasoning": "2-3 sentences explaining urgency and sequencing",
  "subtasks": ["4-6 concrete, action-oriented steps"],
  "firstAction": "the single first action to take right now"
}
Do not invent facts.`;

    const { data, model } = await generateJson({
      system: 'You are TaskGenius AI, a deadline-rescue planner. Return only valid JSON grounded in the supplied task.',
      prompt,
      maxOutputTokens: 1600,
      temperature: 0.4
    });

    const analysis = {
      estimatedTime: Number(data.estimatedTime) || task.estimatedDuration || 60,
      priority: data.priority || task.priority,
      risk: data.risk || task.riskLevel,
      suggestedTime: data.suggestedTime || 'as soon as possible',
      reasoning: data.reasoning || '',
      subtasks: Array.isArray(data.subtasks) && data.subtasks.length > 0 ? data.subtasks.slice(0, 7) : task.subtasks.map((s) => s.title),
      firstAction: data.firstAction || '',
      generatedBy: 'gemini',
      model
    };

    await prisma.aiHistory.create({
      data: {
        userId: req.user.id,
        sessionId: `task-${task.id}`,
        role: 'assistant',
        content: JSON.stringify(analysis),
        type: 'analysis',
        metadata: { taskId: task.id, model }
      }
    });
    await bumpAnalytics(req.user.id, { aiInteractions: 1 });

    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Task Analysis Error:', error?.message);
    const status = error?.code === 'GEMINI_NOT_CONFIGURED' ? 503 : 502;
    res.status(status).json({
      success: false,
      code: error?.code || 'AI_ERROR',
      message: status === 503 ? 'Task analysis requires a valid GEMINI_API_KEY on the server.' : 'Could not analyze this task right now.'
    });
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    const where = { userId: req.user.id };
    if (sessionId) where.sessionId = sessionId;

    const history = await prisma.aiHistory.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 50
    });

    const allEntries = await prisma.aiHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
      select: { sessionId: true, role: true, content: true, createdAt: true }
    });
    const sessionMap = new Map();
    for (const entry of allEntries) {
      if (!entry.sessionId) continue;
      let s = sessionMap.get(entry.sessionId);
      if (!s) {
        s = { id: entry.sessionId, title: null, messageCount: 0, createdAt: entry.createdAt, updatedAt: entry.createdAt };
        sessionMap.set(entry.sessionId, s);
      }
      s.messageCount += 1;
      s.updatedAt = entry.createdAt;
      if (!s.title && entry.role === 'user' && entry.content) {
        s.title = entry.content.length > 60 ? `${entry.content.slice(0, 60)}...` : entry.content;
      }
    }
    const sessions = [...sessionMap.values()]
      .filter((s) => s.title)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({ success: true, history, sessions });
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
