const crypto = require('crypto');
const request = require('supertest');
const { SMTPServer } = require('smtp-server');
const app = require('../server');
const prisma = require('../config/prisma');

function uniqueEmail(prefix = 'test') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}@taskgenius.test`;
}

async function registerUser(overrides = {}) {
  const email = overrides.email || uniqueEmail();
  const password = overrides.password || 'TestPass123!';
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: overrides.name || 'Test User', email, password });
  if (response.status !== 201) {
    throw new Error(`Registration failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return { email, password, token: response.body.token, user: response.body.user, response };
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function startSmtpServer() {
  const messages = [];
  const server = new SMTPServer({
    authOptional: true,
    hideSTARTTLS: true,
    disabledCommands: ['STARTTLS'],
    onAuth(auth, session, callback) {
      callback(null, { user: auth.username || 'test-user' });
    },
    onData(stream, session, callback) {
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        messages.push({
          to: session.envelope.rcptTo.map((entry) => entry.address),
          from: session.envelope.mailFrom?.address,
          raw: Buffer.concat(chunks).toString('utf8')
        });
        callback();
      });
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const port = server.server.address().port;
  return {
    port,
    messages,
    waitForMessage(predicate = () => true, timeoutMs = 8000) {
      return new Promise((resolve, reject) => {
        const started = Date.now();
        const timer = setInterval(() => {
          const found = messages.find(predicate);
          if (found) {
            clearInterval(timer);
            resolve(found);
          } else if (Date.now() - started > timeoutMs) {
            clearInterval(timer);
            reject(new Error('Timed out waiting for an email'));
          }
        }, 50);
      });
    },
    close() {
      return new Promise((resolve) => server.close(resolve));
    }
  };
}

async function cleanupTestUsers() {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@taskgenius.test' } } });
}

module.exports = {
  app,
  prisma,
  request,
  registerUser,
  auth,
  uniqueEmail,
  startSmtpServer,
  cleanupTestUsers
};
