/**
 * Stripe Webhook Handler
 *
 * POST /api/stripe/webhook
 *
 * Receives Stripe webhook events, verifies the signature,
 * and delegates to the StripeService for processing.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET
 */

import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { getConfig } from '@server/config';
import { components } from '@/common';
import { getLogger } from '@server/utils';

const logger = getLogger('StripeWebhook');

// Disable Next.js body parsing — we need the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serverConfig = getConfig();

  if (!serverConfig.stripeSecretKey || !serverConfig.stripeWebhookSecret) {
    logger.warn('Stripe webhook called but Stripe is not configured');
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  const stripe = new Stripe(serverConfig.stripeSecretKey);

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: any;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      serverConfig.stripeWebhookSecret!,
    );
  } catch (err: any) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    await components.stripeService.handleWebhookEvent(event);
    return res.status(200).json({ received: true });
  } catch (err: any) {
    logger.error(`Error processing webhook event: ${err.message}`);
    return res.status(500).json({ error: 'Internal error processing webhook' });
  }
}
