const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const authController = require('../controllers/authController');

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate
], authController.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], authController.login);

router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);
router.put('/password', protect, authController.updatePassword);
router.put('/voice-settings', protect, authController.updateVoiceSettings);

module.exports = router;
