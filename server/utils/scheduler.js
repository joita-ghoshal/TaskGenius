const { sweepMissedTasks, refreshTaskRisks } = require('./deadlines');
const { dispatchDeadlineReminders } = require('./reminderDispatcher');

let timer = null;
let running = false;

async function runMaintenance({ userId = null, now = new Date(), log = true } = {}) {
  if (running) return { skipped: true };
  running = true;
  const startedAt = Date.now();
  try {
    const missed = await sweepMissedTasks({ userId, now });
    const risks = await refreshTaskRisks({ userId, now });
    const reminders = await dispatchDeadlineReminders({ userId, now });
    const summary = {
      missed: missed.count,
      risksUpdated: risks.updated,
      reminders,
      durationMs: Date.now() - startedAt
    };
    if (log) console.log('Maintenance run:', JSON.stringify(summary));
    return summary;
  } catch (error) {
    console.error('Maintenance run failed:', error.message);
    return { error: error.message };
  } finally {
    running = false;
  }
}

function startScheduler() {
  if (process.env.DISABLE_SCHEDULER === 'true') {
    console.log('Background scheduler disabled');
    return;
  }
  if (timer) return;

  const intervalMs = Number(process.env.SCHEDULER_INTERVAL_MS || 5 * 60 * 1000);
  setTimeout(() => { runMaintenance().catch(() => {}); }, 10000).unref?.();
  timer = setInterval(() => { runMaintenance().catch(() => {}); }, intervalMs);
  timer.unref?.();
  console.log(`Background maintenance scheduler started (every ${Math.round(intervalMs / 60000)} min)`);
}

function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { runMaintenance, startScheduler, stopScheduler };
