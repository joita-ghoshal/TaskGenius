const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const taskController = require('../controllers/taskController');

router.use(protect);

router.get('/', taskController.getTasks);
router.get('/dashboard', taskController.getDashboard);
router.get('/:id', taskController.getTask);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
