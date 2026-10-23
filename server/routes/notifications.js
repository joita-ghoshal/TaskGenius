const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');
const pushController = require('../controllers/pushController');

router.use(protect);

router.get('/push/key', pushController.getVapidPublicKey);
router.get('/push/status', pushController.getStatus);
router.post('/push/subscribe', pushController.subscribe);
router.post('/push/unsubscribe', pushController.unsubscribe);
router.post('/push/test', pushController.sendTest);
router.post('/', notificationController.createNotification);
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
