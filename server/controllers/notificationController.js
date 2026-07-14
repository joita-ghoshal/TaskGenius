const prisma = require('../config/prisma');

exports.getNotifications = async (req, res, next) => {
  try {
    const { read, limit } = req.query;
    const where = { userId: req.user.id };
    if (read !== undefined) where.read = read === 'true';

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit) || 50,
      include: { task: { select: { id: true, title: true, deadline: true, priority: true } } }
    });
    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { read: true }
    });
    if (notification.count === 0) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true }
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, read: false }
    });
    res.json({ success: true, count });
  } catch (error) {
    next(error);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    await prisma.notification.deleteMany({
      where: { id: req.params.id, userId: req.user.id }
    });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};
