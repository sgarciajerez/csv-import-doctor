/**
 * @param {{topic: string, shop: string, deleteShopSessions: (shop: string) => Promise<unknown>}} request
 */
export async function processComplianceWebhook({ topic, shop, deleteShopSessions }) {
  switch (topic) {
    case 'SHOP_REDACT':
      await deleteShopSessions(shop);
      break;
    case 'CUSTOMERS_DATA_REQUEST':
    case 'CUSTOMERS_REDACT':
      break;
    default:
      return new Response(null, { status: 400 });
  }

  // Customer and order data are not stored by this app.
  return new Response(null, { status: 200 });
}
