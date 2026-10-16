import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { PrismaClient } from '@prisma/client';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverEntry = resolve(appRoot, 'build/server/index.js');
const serverCli = resolve(appRoot, 'node_modules/@react-router/serve/bin.js');
const apiKey = 'fixture-only-api-key';
const apiSecret = 'fixture-only-webhook-secret';
const fixtureShop = `webhook-http-${randomUUID()}.myshopify.com`;
const fixtureSessionId = `webhook-http-${randomUUID()}`;
const webhookId = randomUUID();
const prisma = new PrismaClient();
let server;
let serverOutput = '';

async function reservePort() {
  const listenerServer = createServer();
  await new Promise((resolveListen, reject) => {
    listenerServer.once('error', reject);
    listenerServer.listen(0, '127.0.0.1', resolveListen);
  });
  const port = listenerServer.address().port;
  await new Promise((resolveClose, reject) => listenerServer.close((error) => error ? reject(error) : resolveClose()));
  return port;
}

async function waitForServer(port) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`The local app server exited early. ${serverOutput}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      await response.body?.cancel();
      return;
    } catch {
      await delay(150);
    }
  }
  throw new Error(`The local app server did not become ready. ${serverOutput}`);
}

function signedRequest(port, body, signature = createHmac('sha256', apiSecret).update(body).digest('base64')) {
  return fetch(`http://127.0.0.1:${port}/webhooks/compliance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Hmac-Sha256': signature,
      'X-Shopify-Topic': 'shop/redact',
      'X-Shopify-Shop-Domain': fixtureShop,
      'X-Shopify-API-Version': '2026-10',
      'X-Shopify-Webhook-Id': webhookId,
    },
    body,
  });
}

try {
  await prisma.session.deleteMany({ where: { id: fixtureSessionId } });
  await prisma.session.create({
    data: {
      id: fixtureSessionId,
      shop: fixtureShop,
      state: 'fixture-only-state',
      accessToken: 'fixture-only-token',
    },
  });

  const port = await reservePort();
  server = spawn(process.execPath, [serverCli, serverEntry], {
    cwd: appRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      SHOPIFY_API_KEY: apiKey,
      SHOPIFY_API_SECRET: apiSecret,
      SHOPIFY_APP_URL: `http://127.0.0.1:${port}`,
      SCOPES: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => { serverOutput = `${serverOutput}${chunk}`.slice(-2_000); });
  server.stderr.on('data', (chunk) => { serverOutput = `${serverOutput}${chunk}`.slice(-2_000); });

  await waitForServer(port);
  const body = JSON.stringify({ shop_id: 0, shop_domain: fixtureShop });
  const validResponse = await signedRequest(port, body);
  assert.equal(validResponse.status, 200);
  assert.equal(await prisma.session.findUnique({ where: { id: fixtureSessionId } }), null);

  const invalidResponse = await signedRequest(port, body, Buffer.alloc(32).toString('base64'));
  assert.equal(invalidResponse.status, 401);
  console.log('HTTP integration passed: signed shop/redact removed only its fixture session; invalid HMAC was rejected.');
} finally {
  if (server && server.exitCode === null) {
    server.kill();
    const stopped = await Promise.race([
      once(server, 'exit').then(() => true),
      delay(5_000).then(() => false),
    ]);
    if (!stopped) server.kill('SIGKILL');
  }
  await prisma.session.deleteMany({ where: { id: fixtureSessionId } }).catch(() => {});
  await prisma.$disconnect();
}
