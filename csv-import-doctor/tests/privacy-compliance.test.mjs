import assert from 'node:assert/strict';
import test from 'node:test';
import { processComplianceWebhook } from '../app/privacy-compliance.mjs';

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
