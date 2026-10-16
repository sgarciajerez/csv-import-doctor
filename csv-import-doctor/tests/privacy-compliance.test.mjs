import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { ApiVersion, AppDistribution, shopifyApp } from '@shopify/shopify-app-react-router/server';
import { handleComplianceWebhook, processComplianceWebhook } from '../app/privacy-compliance.mjs';
import { releaseFileAfterAnalysis } from '../app/file-reference.mjs';

const webhookTestSecret = 'fixture-only-webhook-secret';

test('keeps the file only while delimiter confirmation is pending', () => {
  const fileRef = { current: { name: 'ambiguous.csv' } };

  releaseFileAfterAnalysis(fileRef, true);
  assert.equal(fileRef.current.name, 'ambiguous.csv');

  releaseFileAfterAnalysis(fileRef, false);
  assert.equal(fileRef.current, null);
});

const webhookAuth = shopifyApp({
  apiKey: 'fixture-only-api-key',
  apiSecretKey: webhookTestSecret,
  apiVersion: ApiVersion.October26,
  appUrl: 'https://example.test',
  scopes: [],
  distribution: AppDistribution.AppStore,
  sessionStorage: { loadSession: async () => undefined },
}).authenticate.webhook;

test('a valid Shopify-signed SHOP_REDACT request authenticates and deletes only that store session set', async () => {
  const shop = 'fixture-signature.myshopify.com';
  const body = JSON.stringify({ shop_id: 123, shop_domain: shop });
  const signature = createHmac('sha256', webhookTestSecret).update(body, 'utf8').digest('base64');
  const request = new Request('https://example.test/webhooks/compliance', {
    method: 'POST',
    headers: {
      'X-Shopify-Hmac-Sha256': signature,
      'X-Shopify-Topic': 'shop/redact',
      'X-Shopify-Shop-Domain': shop,
      'X-Shopify-API-Version': '2026-10',
      'X-Shopify-Webhook-Id': 'fixture-webhook-1',
    },
    body,
  });

  const deletedShops = [];
  const response = await handleComplianceWebhook({
    request,
    authenticateWebhook: webhookAuth,
    deleteShopSessions: async (shopDomain) => { deletedShops.push(shopDomain); },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(deletedShops, [shop]);

  const tamperedRequest = new Request('https://example.test/webhooks/compliance', {
    method: 'POST',
    headers: {
      'X-Shopify-Hmac-Sha256': signature,
      'X-Shopify-Topic': 'shop/redact',
      'X-Shopify-Shop-Domain': shop,
      'X-Shopify-API-Version': '2026-10',
      'X-Shopify-Webhook-Id': 'fixture-webhook-2',
    },
    body: body.replace('123', '456'),
  });
  await assert.rejects(handleComplianceWebhook({
    request: tamperedRequest,
    authenticateWebhook: webhookAuth,
    deleteShopSessions: async (shopDomain) => { deletedShops.push(shopDomain); },
  }), (error) => error instanceof Response && error.status === 401);
  assert.deepEqual(deletedShops, [shop]);
});

test('SHOP_REDACT deletes the store session set and duplicate deliveries remain safe', async () => {
  const storedShops = new Set(['example.myshopify.com', 'other.myshopify.com']);
  const deleteShopSessions = async (shop) => storedShops.delete(shop);

  const firstResponse = await processComplianceWebhook({
    topic: 'SHOP_REDACT',
    shop: 'example.myshopify.com',
    deleteShopSessions,
  });
  const duplicateResponse = await processComplianceWebhook({
    topic: 'SHOP_REDACT',
    shop: 'example.myshopify.com',
    deleteShopSessions,
  });

  assert.equal(firstResponse.status, 200);
  assert.equal(duplicateResponse.status, 200);
  assert.equal(storedShops.has('example.myshopify.com'), false);
  assert.equal(storedShops.has('other.myshopify.com'), true);
});

test('customer data requests are acknowledged without reading or retaining their payload', async () => {
  let deletionCalled = false;
  const response = await processComplianceWebhook({
    topic: 'CUSTOMERS_DATA_REQUEST',
    shop: 'example.myshopify.com',
    deleteShopSessions: async () => { deletionCalled = true; },
  });

  assert.equal(response.status, 200);
  assert.equal(deletionCalled, false);
});

test('customer redaction is acknowledged without touching store sessions', async () => {
  let deletionCalled = false;
  const response = await processComplianceWebhook({
    topic: 'CUSTOMERS_REDACT',
    shop: 'example.myshopify.com',
    deleteShopSessions: async () => { deletionCalled = true; },
  });

  assert.equal(response.status, 200);
  assert.equal(deletionCalled, false);
});

test('an unexpected topic is rejected instead of being acknowledged as handled', async () => {
  const response = await processComplianceWebhook({
    topic: 'PRODUCTS_DELETE',
    shop: 'example.myshopify.com',
    deleteShopSessions: async () => {},
  });

  assert.equal(response.status, 400);
});
