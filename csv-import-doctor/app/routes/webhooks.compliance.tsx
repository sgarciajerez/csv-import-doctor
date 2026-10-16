import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import db from '../db.server';
import { handleComplianceWebhook } from '../privacy-compliance.mjs';

export const action = async ({ request }: ActionFunctionArgs) => {
  return handleComplianceWebhook({
    request,
    authenticateWebhook: authenticate.webhook,
    deleteShopSessions: async (shopDomain: string) => {
      await db.session.deleteMany({ where: { shop: shopDomain } });
    },
  });
};
