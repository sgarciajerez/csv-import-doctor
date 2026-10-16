import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import db from '../db.server';
import { processComplianceWebhook } from '../privacy-compliance.mjs';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  return processComplianceWebhook({
    shop,
    topic,
    deleteShopSessions: async (shopDomain: string) => {
      await db.session.deleteMany({ where: { shop: shopDomain } });
    },
  });
};
