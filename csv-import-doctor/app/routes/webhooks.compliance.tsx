import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import db from '../db.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  if (topic === 'SHOP_REDACT') {
    await db.session.deleteMany({ where: { shop } });
  }

  // The app stores no customer, order, product, or CSV data to disclose or redact.
  return new Response(null, { status: 200 });
};
