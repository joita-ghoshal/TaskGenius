const crypto = require('crypto');

const generateToken = () => crypto.randomBytes(20).toString('hex');

const calculateRiskLevel = (deadline) => {
  if (!deadline) return 'low';
  const hoursLeft = (new Date(deadline) - new Date()) / (1000 * 60 * 60);
  if (hoursLeft < 1) return 'critical';
  if (hoursLeft < 6) return 'high';
  if (hoursLeft < 24) return 'medium';
  if (hoursLeft < 72) return 'low';
  return 'low';
};

const calculateCompletionProbability = (deadline, progress) => {
  if (!deadline) return 100;
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const totalTime = deadlineDate - now;
  const timeLeft = deadlineDate - now;
  if (totalTime <= 0) return 0;
  const timeRatio = Math.max(0, Math.min(1, timeLeft / Math.max(totalTime, 1)));
  return Math.round(Math.max(0, Math.min(100, 100 - (1 - timeRatio) * 100)));
};

const getAlertLevel = (deadline) => {
  if (!deadline) return 'green';
  const hoursLeft = (new Date(deadline) - new Date()) / (1000 * 60 * 60);
  if (hoursLeft > 72) return 'green';
  if (hoursLeft > 24) return 'yellow';
  if (hoursLeft > 6) return 'orange';
  if (hoursLeft > 3) return 'red';
  return 'emergency';
};

const sanitizeUser = (user) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    goals: user.goals,
    dailyTarget: user.dailyTarget,
    role: user.role,
    workingHours: user.workingHours,
    preferredStudyTime: user.preferredStudyTime,
    createdAt: user.createdAt
  };
};

module.exports = { generateToken, calculateRiskLevel, calculateCompletionProbability, getAlertLevel, sanitizeUser };
