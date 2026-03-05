import Stripe from "stripe";
import type { Request } from "express";

export type StripeBundle = "BUNDLE_1" | "BUNDLE_5" | "BUNDLE_15" | "BUNDLE_99" | "RESET_POINTS";

export const BundleToSessions: Record<StripeBundle, number> = {
  BUNDLE_1: 4,
  BUNDLE_5: 20,
  BUNDLE_15: 60,
  BUNDLE_99: 396,
  RESET_POINTS: 0
};

export const BundleToUsdCents: Record<StripeBundle, number> = {
  BUNDLE_1: 100,
  BUNDLE_5: 500,
  BUNDLE_15: 1500,
  BUNDLE_99: 9900,
  RESET_POINTS: 500
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
  discountPct?: number; // 0..100
  referralCodeUsed?: string | null;
}): Promise<{ url: string; sessionId: string }>{
  const stripe = getStripeClient();
  const baseAmount = BundleToUsdCents[args.bundle];
  const pct = Math.max(0, Math.min(100, Number(args.discountPct ?? 0)));
  const amount = pct > 0 ? Math.max(50, Math.round(baseAmount * (1 - pct / 100))) : baseAmount;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    client_reference_id: args.playerRef,
    metadata: {
      playerRef: args.playerRef,
      bundle: args.bundle,
      discountPct: String(pct),
      referralCodeUsed: args.referralCodeUsed ? String(args.referralCodeUsed) : ""
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: {
            name: args.bundle === "RESET_POINTS"
              ? "PrintR Points Reset"
              : (args.bundle === "BUNDLE_1"
                ? "PrintR Plays (4)"
                : (args.bundle === "BUNDLE_5"
                  ? "PrintR Plays (20)"
                  : (args.bundle === "BUNDLE_15"
                    ? "PrintR Plays (60)"
                    : "PrintR Plays (396)"))),
            description: args.bundle === "RESET_POINTS"
              ? "Reset your points back to zero. Streak is untouched."
              : (args.bundle === "BUNDLE_1"
                ? "4 plays. Starter."
                : (args.bundle === "BUNDLE_5"
                  ? "20 plays."
                  : (args.bundle === "BUNDLE_15"
                    ? "60 plays."
                    : "396 plays.")))
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

export function extractCheckoutCompleted(event: Stripe.Event): { playerRef: string; bundle: StripeBundle; externalRef: string; discountPct: number; referralCodeUsed?: string | null } | null {
  if (event.type !== "checkout.session.completed") return null;
  const session = event.data.object as Stripe.Checkout.Session;

  const playerRef = (session.metadata?.playerRef ?? session.client_reference_id ?? "").toString();
  const bundle = (session.metadata?.bundle ?? "").toString() as StripeBundle;

  if (!playerRef || (bundle !== "BUNDLE_1" && bundle !== "BUNDLE_5" && bundle !== "BUNDLE_15" && bundle !== "BUNDLE_99" && bundle !== "RESET_POINTS")) return null;

  const discountPct = Number(session.metadata?.discountPct ?? 0);
  const referralCodeUsed = (session.metadata?.referralCodeUsed ?? "").toString() || null;

  return { playerRef, bundle, externalRef: session.id, discountPct: Number.isFinite(discountPct) ? discountPct : 0, referralCodeUsed };
}
