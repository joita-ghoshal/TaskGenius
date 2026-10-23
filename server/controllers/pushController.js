const prisma = require('../config/prisma');
const { isPushConfigured, getPublicKey, sendPushToUser } = require('../utils/push');

exports.getVapidPublicKey = async (req, res) => {
  res.json({
    success: true,
    configured: isPushConfigured(),
    publicKey: getPublicKey()
  });
};

exports.subscribe = async (req, res, next) => {
  try {
    if (!isPushConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'PUSH_NOT_CONFIGURED',
        message: 'Browser push is not configured on the server.'
      });
    }

    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, message: 'A valid push subscription is required' });
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: req.user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.get('user-agent') || null
      },
      create: {
        userId: req.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.get('user-agent') || null
      }
    });

    res.status(201).json({
      success: true,
      subscription: { id: subscription.id, createdAt: subscription.createdAt }
    });
  } catch (error) {
    next(error);
  }
};

exports.unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ success: false, message: 'Endpoint is required' });
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user.id } });
    res.json({ success: true, message: 'Push subscription removed' });
  } catch (error) {
    next(error);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const count = await prisma.pushSubscription.count({ where: { userId: req.user.id } });
    res.json({ success: true, configured: isPushConfigured(), subscriptions: count });
  } catch (error) {
    next(error);
  }
};

exports.sendTest = async (req, res, next) => {
  try {
    if (!isPushConfigured()) {
      return res.status(503).json({ success: false, code: 'PUSH_NOT_CONFIGURED', message: 'Browser push is not configured on the server.' });
    }
    const delivered = await sendPushToUser(req.user.id, {
      title: 'TaskGenius notifications are working',
      body: 'You will receive deadline reminders and rescue alerts here.',
      url: '/dashboard',
      tag: `test-${Date.now()}`
    });
    if (delivered === 0) {
      return res.status(409).json({
        success: false,
        message: 'No active browser subscription was found. Enable notifications on this device first.'
      });
    }
    res.json({ success: true, delivered });
  } catch (error) {
    next(error);
  }
};
