const nodemailer = require('nodemailer');

let transporter = null;

function getEmailConfig() {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const port = Number(process.env.EMAIL_PORT || 587);
  const secure = process.env.EMAIL_SECURE === 'true' || port === 465;
  return {
    host,
    port,
    secure,
    user,
    pass,
    from: process.env.EMAIL_FROM || user,
    replyTo: process.env.EMAIL_REPLY_TO || undefined
  };
}

function isEmailConfigured() {
  const { host, user, pass, from } = getEmailConfig();
  return Boolean(host && user && pass && from);
}

function getTransporter() {
  if (transporter) return transporter;
  const cfg = getEmailConfig();
  if (!isEmailConfigured()) return null;

  const options = {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass }
  };

  if (process.env.EMAIL_REQUIRE_TLS === 'true') {
    options.requireTLS = true;
  }
  if (process.env.EMAIL_TLS_REJECT_UNAUTHORIZED === 'false') {
    options.tls = { rejectUnauthorized: false };
  }

  transporter = nodemailer.createTransport(options);
  return transporter;
}

function resetTransporter() {
  transporter = null;
}

async function sendMail({ to, subject, text, html, headers }) {
  const cfg = getEmailConfig();
  const tx = getTransporter();
  if (!tx) return { sent: false, reason: 'not_configured' };
  if (!to) return { sent: false, reason: 'missing_recipient' };

  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const info = await tx.sendMail({
        from: cfg.from,
        replyTo: cfg.replyTo,
        to,
        subject,
        text,
        html,
        headers
      });
      return { sent: true, messageId: info.messageId, accepted: info.accepted };
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  console.error('Email delivery failed:', lastError?.message || 'unknown error');
  return { sent: false, reason: 'delivery_failed' };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendPasswordResetEmail(user, resetUrl) {
  const name = user.name || 'there';
  const subject = 'Reset your TaskGenius password';
  const text = [
    `Hi ${name},`,
    '',
    'We received a request to reset your TaskGenius password.',
    `Reset it here (valid for 1 hour): ${resetUrl}`,
    '',
    'If you did not request this, you can safely ignore this email.'
  ].join('\n');
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="color:#2563eb">Reset your TaskGenius password</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>We received a request to reset your password. This link is valid for one hour.</p>
      <p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Reset password</a></p>
      <p style="color:#64748b;font-size:13px">If you did not request this, you can safely ignore this email.</p>
    </div>`;
  return sendMail({ to: user.email, subject, text, html });
}

async function sendDeadlineReminderEmail(user, task, kind) {
  const due = task.deadline ? new Date(task.deadline).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'soon';
  const windowLabel = kind === 'due_1h'
    ? 'in about an hour'
    : kind === 'due_3h'
      ? 'within 3 hours'
      : 'within 24 hours';
  const subject = kind === 'due_1h'
    ? `Due soon: ${task.title}`
    : `Deadline reminder: ${task.title}`;
  const text = [
    `Hi ${user.name || 'there'},`,
    '',
    `"${task.title}" is due ${windowLabel} (${due}).`,
    `Priority: ${task.priority}. Estimated effort: ${task.estimatedDuration || 60} minutes.`,
    '',
    'Open TaskGenius to review the task or start Rescue Mode:',
    `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/tasks`
  ].join('\n');
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="color:#2563eb">Deadline reminder</h2>
      <p>Hi ${escapeHtml(user.name || 'there')},</p>
      <p><strong>${escapeHtml(task.title)}</strong> is due ${escapeHtml(windowLabel)}.</p>
      <p style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px">
        <span style="display:block">Due: <strong>${escapeHtml(due)}</strong></span>
        <span style="display:block">Priority: <strong>${escapeHtml(task.priority || 'medium')}</strong></span>
        <span style="display:block">Estimated effort: <strong>${task.estimatedDuration || 60} minutes</strong></span>
      </p>
      <p><a href="${escapeHtml(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/tasks`)}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Open TaskGenius</a></p>
    </div>`;
  return sendMail({ to: user.email, subject, text, html });
}

module.exports = {
  isEmailConfigured,
  getEmailConfig,
  resetTransporter,
  sendMail,
  sendPasswordResetEmail,
  sendDeadlineReminderEmail
};
