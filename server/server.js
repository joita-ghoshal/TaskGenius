const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const prisma = require('./config/prisma');
const errorHandler = require('./middleware/errorHandler');
const { isEmailConfigured } = require('./utils/email');
const { isPushConfigured } = require('./utils/push');
const { isGeminiConfigured } = require('./utils/gemini');
const { startScheduler, runMaintenance } = require('./utils/scheduler');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const aiRoutes = require('./routes/ai');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.CLIENT_URL || 'http://localhost:5173')
      .split(',')
      .map((value) => value.trim().replace(/\/$/, ''))
      .filter(Boolean);
    if (!origin || allowed.includes(origin.replace(/\/$/, ''))) return callback(null, true);
    callback(null, allowed.length === 0);
  },
  credentials: true
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  skip: (req) => req.path === '/health' || req.path === '/internal/cron',
  message: { success: false, message: 'Too many requests, try again later' }
});
app.use('/api/', limiter);

app.get('/api/health', async (req, res) => {
  const timestamp = new Date().toISOString();
  const services = {
    ai: isGeminiConfigured(),
    email: isEmailConfigured(),
    push: isPushConfigured()
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: 'TaskGenius API is running', database: 'connected', services, timestamp });
  } catch {
    res.status(503).json({
      success: false,
      message: 'TaskGenius API is running but the database is unreachable',
      database: 'disconnected',
      services,
      timestamp
    });
  }
});

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

app.post('/api/internal/cron', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({ success: false, message: 'Cron is not configured' });
  }
  const provided = req.get('x-cron-secret') || req.query.secret;
  if (!provided || !timingSafeEqual(provided, secret)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const summary = await runMaintenance({ log: false });
  res.json({ success: true, summary, timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function connectDB() {
  const attempts = Number(process.env.DB_CONNECT_ATTEMPTS || 5);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await prisma.$connect();
      console.log('PostgreSQL connected');
      return true;
    } catch (error) {
      console.error(`Database connection attempt ${attempt}/${attempts} failed:`, error.message);
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  console.error('Could not establish a database connection at startup; API will return errors until it recovers.');
  return false;
}

async function start() {
  await connectDB();
  startScheduler();
  app.listen(PORT, () => {
    console.log(`TaskGenius server running on port ${PORT}`);
    console.log(`AI configured: ${isGeminiConfigured()} | Email configured: ${isEmailConfigured()} | Push configured: ${isPushConfigured()}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = app;
module.exports.start = start;
