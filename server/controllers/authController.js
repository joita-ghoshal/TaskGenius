const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  goals: user.goals,
  dailyTarget: user.dailyTarget,
  role: user.role,
  workingHourStart: user.workingHourStart,
  workingHourEnd: user.workingHourEnd,
  preferredStudyTime: user.preferredStudyTime,
  voiceMuted: user.voiceMuted,
  voiceLanguage: user.voiceLanguage,
  voiceVolume: user.voiceVolume,
  createdAt: user.createdAt
});

const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
  res.status(statusCode).json({ success: true, token, user: sanitizeUser(user) });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword }
    });
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, goals, dailyTarget, workingHourStart, workingHourEnd, preferredStudyTime, avatar } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (goals !== undefined) data.goals = goals;
    if (dailyTarget) data.dailyTarget = dailyTarget;
    if (workingHourStart) data.workingHourStart = workingHourStart;
    if (workingHourEnd) data.workingHourEnd = workingHourEnd;
    if (preferredStudyTime) data.preferredStudyTime = preferredStudyTime;
    if (avatar !== undefined) data.avatar = avatar;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data
    });
    res.json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateVoiceSettings = async (req, res, next) => {
  try {
    const { muted, language, volume } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        voiceMuted: muted !== undefined ? muted : undefined,
        voiceLanguage: language || undefined,
        voiceVolume: volume !== undefined ? volume : undefined
      }
    });
    res.json({
      success: true,
      voiceSettings: {
        muted: user.voiceMuted,
        language: user.voiceLanguage,
        volume: user.voiceVolume
      }
    });
  } catch (error) {
    next(error);
  }
};
