const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const aiController = require('../controllers/aiController');

router.use(protect);

router.post('/chat', aiController.chat);
router.get('/briefing', aiController.getDailyBriefing);
router.get('/insights', aiController.getInsights);
router.get('/analyze/:taskId', aiController.analyzeTask);
router.get('/history', aiController.getHistory);
router.delete('/history', aiController.clearHistory);

module.exports = router;
