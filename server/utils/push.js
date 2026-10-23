const prisma = require('../config/prisma');
const webpush = require('web-push');

let configured = false;

function isPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function getPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function ensureConfigured() {
  if (configured) return true;
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@taskgenius.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  configured = true;
  return true;
}

async function sendPushToSubscription(subscription, payload) {
  if (!ensureConfigured()) return { delivered: false, reason: 'not_configured' };
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth }
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 12, urgency: payload.urgency || 'normal' }
    );
    return { delivered: true };
  } catch (error) {
    const status = error?.statusCode;
    if (status === 404 || status === 410) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: subscription.endpoint } }).catch(() => {});
      return { delivered: false, reason: 'expired', removed: true };
    }
    console.error('Push delivery failed:', status || error?.message);
    return { delivered: false, reason: 'delivery_failed', status };
  }
}

async function sendPushToUser(userId, payload) {
  if (!userId || !ensureConfigured()) return 0;
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } }).catch(() => []);
  let delivered = 0;
  for (const subscription of subscriptions) {
    const result = await sendPushToSubscription(subscription, payload);
    if (result.delivered) delivered += 1;
  }
  return delivered;
}

async function sendPushToAll(payload) {
  if (!ensureConfigured()) return 0;
  const subscriptions = await prisma.pushSubscription.findMany().catch(() => []);
  let delivered = 0;
  for (const subscription of subscriptions) {
    const result = await sendPushToSubscription(subscription, payload);
    if (result.delivered) delivered += 1;
  }
  return delivered;
}

module.exports = {
  isPushConfigured,
  getPublicKey,
  sendPushToUser,
  sendPushToSubscription,
  sendPushToAll
};
