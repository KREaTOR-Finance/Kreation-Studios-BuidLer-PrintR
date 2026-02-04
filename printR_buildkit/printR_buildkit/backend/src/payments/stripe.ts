import Stripe from "stripe";
import type { Request } from "express";

export type StripeBundle = "BUNDLE_10" | "BUNDLE_100";

export const BundleToSessions: Record<StripeBundle, number> = {
  BUNDLE_10: 40,
  BUNDLE_100: 500
};

export const BundleToUsdCents: Record<StripeBundle, number> = {
  BUNDLE_10: 1000,
  BUNDLE_100: 10000
};

export function getStripeClient(){
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

export async function createCheckoutUrl(args: {
  playerRef: string;
  bundle: StripeBundle;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string }>{
  const stripe = getStripeClient();
  const amount = BundleToUsdCents[args.bundle];

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    client_reference_id: args.playerRef,
    metadata: {
      playerRef: args.playerRef,
      bundle: args.bundle
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: {
            name: args.bundle === "BUNDLE_10" ? "PrintR Sessions (40)" : "PrintR Sessions (500)",
            description: args.bundle === "BUNDLE_10"
              ? "40 session credits. Minimum buy."
              : "500 session credits. Bulk pack."
          }
        }
      }
    ],
    allow_promotion_codes: true
  });

  if (!session.url) throw new Error("Stripe session missing url");
  return { url: session.url, sessionId: session.id };
}

/** Stripe webhook verification requires raw body. */
export function getRawBody(req: Request): Buffer {
  return req.body as any as Buffer;
}

export function verifyStripeWebhook(req: Request): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") throw new Error("Missing stripe-signature header");

  const stripe = getStripeClient();
  const raw = getRawBody(req);
  return stripe.webhooks.constructEvent(raw, sig, secret);
}

export function extractCheckoutCompleted(event: Stripe.Event): { playerRef: string; bundle: StripeBundle; externalRef: string } | null {
  if (event.type !== "checkout.session.completed") return null;
  const session = event.data.object as Stripe.Checkout.Session;

  const playerRef = (session.metadata?.playerRef ?? session.client_reference_id ?? "").toString();
  const bundle = (session.metadata?.bundle ?? "").toString() as StripeBundle;

  if (!playerRef || (bundle !== "BUNDLE_10" && bundle !== "BUNDLE_100")) return null;

  return { playerRef, bundle, externalRef: session.id };
}
