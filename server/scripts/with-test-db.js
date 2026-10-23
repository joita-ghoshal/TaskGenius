#!/usr/bin/env node
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const dotenv = require('dotenv');
const webpush = require('web-push');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function findPgBin() {
  if (process.env.PG_BIN && fs.existsSync(path.join(process.env.PG_BIN, 'initdb.exe'))) {
    return process.env.PG_BIN;
  }
  const roots = [
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'PostgreSQL'),
    'C:\\Program Files\\PostgreSQL'
  ].filter(Boolean);
  const candidates = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root)) {
      const bin = path.join(root, entry, 'bin');
      if (fs.existsSync(path.join(bin, 'initdb.exe'))) candidates.push(bin);
    }
  }
  if (candidates.length === 0) return null;
  return candidates.sort().pop();
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function run(bin, args, options = {}) {
  return execFileSync(bin, args, { stdio: 'pipe', encoding: 'utf8', ...options });
}

function stopCluster(pgCtl, dataDir) {
  try {
    run(pgCtl, ['-D', dataDir, '-m', 'fast', '-w', 'stop']);
  } catch {
    try {
      run(pgCtl, ['-D', dataDir, '-m', 'immediate', 'stop']);
    } catch {}
  }
}

async function main() {
  const pgBin = findPgBin();
  if (!pgBin) {
    console.error('PostgreSQL binaries were not found. Set PG_BIN to the folder containing initdb.exe and pg_ctl.exe.');
    process.exit(1);
  }

  const port = await freePort();
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskgenius-pg-'));
  const dataDir = path.join(baseDir, 'data');
  const logFile = path.join(baseDir, 'postgres.log');
  const initdb = path.join(pgBin, 'initdb.exe');
  const pgCtl = path.join(pgBin, 'pg_ctl.exe');
  let started = false;

  try {
    console.log(`Starting temporary PostgreSQL cluster on port ${port}...`);
    run(initdb, ['-D', dataDir, '-U', 'postgres', '--auth=trust', '--encoding=UTF8', '--no-locale']);
    const serverOptions = [
      `-p ${port}`,
      '-h 127.0.0.1',
      '-c shared_buffers=32MB',
      '-c max_connections=20',
      '-c fsync=off',
      '-c synchronous_commit=off',
      '-c full_page_writes=off'
    ].join(' ');
    execFileSync(pgCtl, ['-D', dataDir, '-l', logFile, '-o', serverOptions, '-w', 'start'], { stdio: 'ignore' });
    started = true;

    const databaseUrl = `postgresql://postgres@127.0.0.1:${port}/postgres?schema=public&connection_limit=5`;
    const vapidKeys = webpush.generateVAPIDKeys();
    const env = {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrl,
      JWT_SECRET: 'test-jwt-secret-for-taskgenius-tests',
      JWT_EXPIRE: '1h',
      CLIENT_URL: 'http://localhost:5173',
      CRON_SECRET: 'test-cron-secret',
      DISABLE_SCHEDULER: 'true',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'test-gemini-key-not-real-000000',
      VAPID_PUBLIC_KEY: vapidKeys.publicKey,
      VAPID_PRIVATE_KEY: vapidKeys.privateKey,
      VAPID_SUBJECT: 'mailto:tests@taskgenius.app',
      EMAIL_HOST: '',
      EMAIL_USER: '',
      EMAIL_PASS: '',
      EMAIL_FROM: ''
    };

    const prismaCli = require.resolve('prisma/build/index.js');
    console.log('Applying schema to the test database...');
    execFileSync(process.execPath, [prismaCli, 'db', 'push', '--skip-generate'], {
      cwd: path.join(__dirname, '..'),
      env,
      stdio: 'pipe',
      encoding: 'utf8'
    });

    const extraArgs = process.argv.slice(2);
    const vitestArgs = extraArgs.length > 0 ? extraArgs : ['run'];
    const vitestBin = path.join(path.dirname(require.resolve('vitest')), 'vitest.mjs');
    console.log('Running test suite...');
    const result = spawnSync(process.execPath, [vitestBin, ...vitestArgs], {
      cwd: path.join(__dirname, '..'),
      env,
      stdio: 'inherit'
    });
    process.exitCode = result.status == null ? 1 : result.status;
  } catch (error) {
    console.error(error?.stdout || error?.message || error);
    process.exitCode = 1;
  } finally {
    if (started) {
      console.log('Stopping temporary PostgreSQL cluster...');
      stopCluster(pgCtl, dataDir);
    }
    try {
      fs.rmSync(baseDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    } catch {}
  }
}

main();
