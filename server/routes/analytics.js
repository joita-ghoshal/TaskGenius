const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

router.use(protect);

router.post('/log', analyticsController.logAnalytics);
router.get('/', analyticsController.getAnalytics);
router.get('/stats', analyticsController.getProductivityStats);

module.exports = router;
