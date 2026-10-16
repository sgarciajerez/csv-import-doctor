import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // The delivery can be repeated; deleting by shop remains idempotent.
  await db.session.deleteMany({ where: { shop } });

  return new Response();
};
