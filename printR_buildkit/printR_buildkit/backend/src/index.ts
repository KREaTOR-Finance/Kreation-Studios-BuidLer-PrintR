import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";

import { WsHub } from "./server/ws.js";
import { DevVrfProvider } from "./vrf/devProvider.js";
import { SwitchboardSrsProvider } from "./vrf/switchboardSrsProvider.js";
import { VrfQueue } from "./vrf/queue.js";
import { createSession, stepTick } from "./engine/sessionEngine.js";
import type { SessionRuntime } from "./engine/models.js";
import type { ClientEvent } from "./types/events.js";
import { CONST, realizedPoints, unrealizedPoints } from "./engine/mechanics.js";

import { requirePlayerRef, getPlayerRef } from "./middleware/playerRef.js";
import { createDeveloperLeadsStore, buildLeadFromRequest, validateLead } from "./developers/leadsStore.js";
import { requireAdminToken } from "./middleware/adminToken.js";
import { InMemoryCreditsStore } from "./credits/store.js";
import { SqliteCreditsStore } from "./credits/sqliteCreditsStore.js";
import { BundleToSessions, createCheckoutUrl, extractCheckoutCompleted, verifyStripeWebhook, type StripeBundle } from "./payments/stripe.js";


const PORT = Number(process.env.PORT ?? 8080);
const ORIGIN = process.env.CORS_ORIGIN ?? "*";

const app = express();

// Credits store (authoritative).
// MVP default: SQLite when DATABASE_PATH is set, otherwise in-memory.
const dbPath = process.env.DATABASE_PATH;
const credits = dbPath ? new SqliteCreditsStore(dbPath) : new InMemoryCreditsStore();
if (dbPath && (credits as any).migrate) (credits as any).migrate();

// Developer leads store (website developer slot submissions).
const developerLeads = createDeveloperLeadsStore();
if ((developerLeads as any).migrate) (developerLeads as any).migrate();

app.use(cors({
  origin: ORIGIN === "*" ? true : ORIGIN,
  allowedHeaders: [
    "content-type",
    "x-printr-player",
    "x-printr-wallet",
    "idempotency-key"
  ]
}));
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const event = verifyStripeWebhook(req);
    const parsed = extractCheckoutCompleted(event);

    // Always ack quickly for non-target events.
    if (!parsed) return res.status(200).json({ ok: true });

    // Idempotency: record event id if store supports it (SQLite does).
    const recorded = credits.recordWebhookEvent ? credits.recordWebhookEvent("stripe", event.id) : true;
    if (!recorded) return res.status(200).json({ ok: true, duplicate: true });

    const sessions = BundleToSessions[parsed.bundle];
    await credits.addLedger({
      playerRef: parsed.playerRef,
      deltaSessions: sessions,
      reason: "purchase",
      source: "stripe",
      externalRef: parsed.externalRef,
      meta: { bundle: parsed.bundle }
    });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(400).json({ ok: false, error: e?.message ?? "webhook_error" });
  }
});
  } catch (e: any) {
    return res.status(400).json({ ok: false, error: e?.message ?? "WEBHOOK_ERROR" });
  }
});

app.use(express.json({ limit: "1mb" }));

const server = http.createServer(app);

// VRF (DEV provider for local run). Replace with Switchboard provider for production.
// VRF provider selection:
// - DevVrfProvider for local testing
// - SwitchboardSrsProvider for Trust-first MVP / production
const vrfProvider = process.env.USE_SWITCHBOARD_VRF === "true"
  ? new SwitchboardSrsProvider({
      rpcUrl: process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com",
      commitment: process.env.SOLANA_COMMITMENT ?? "confirmed",
      payerSecretKeyBase58: process.env.SOLANA_PAYER_SECRETKEY_BASE58,
      payerKeypairPath: process.env.SOLANA_PAYER_KEYPAIR_PATH
    })
  : new DevVrfProvider(1337);
const vrfQueue = new VrfQueue(vrfProvider);

// In-memory sessions + player state (MVP)
const sessions = new Map<string, SessionRuntime>();
type PlayerState = { markersRemaining: number; scoreRealized: number; openPositionId?: string };
const playerState = new Map<string, Map<string, PlayerState>>(); // sessionId -> playerId -> state

function getPlayerState(sessionId: string, playerId: string): PlayerState {
  const smap = playerState.get(sessionId) ?? new Map<string, PlayerState>();
  playerState.set(sessionId, smap);
  const ps = smap.get(playerId) ?? { markersRemaining: 10, scoreRealized: 1000 };
  smap.set(playerId, ps);
  return ps;
}

function onClientEvent(playerId: string, ev: ClientEvent) {
  const s = sessions.get(ev.sessionId);
  if (!s) return;

  // Auto-subscribe on first intent
  hub.subscribe(playerId, s.id);

  const ps = getPlayerState(s.id, playerId);
  const closing = s.phase !== "LIVE";

  if (ev.intent === "OPEN") {
    if (closing) return;
    if (ps.markersRemaining <= 1) return;
    // enforce max 1 open per player per session
    const alreadyOpen = s.positions.some(p => p.isOpen && p.playerId === playerId);
    if (alreadyOpen) return;

    const commit = Math.max(1, Math.min(1000, ev.payload.commitPoints ?? 250));
    const leverage = Math.max(1, Math.min(CONST.LEV_MAX, ev.payload.leverage ?? 1));
    const direction = ev.payload.direction ?? "LONG";

    const posId = randomUUID();
    s.positions.push({
      id: posId,
      playerId,
      sessionId: s.id,
      entryTickIndex: s.tickIndex,
      entryPrice: s.price,
      committedPoints: commit,
      leverage,
      direction,
      isOpen: true
    });
    ps.markersRemaining -= 1;
    ps.openPositionId = posId;

    hub.sendToPlayer(playerId, { type: "FX_EVENT", sessionId: s.id, playerId, fx: "COMMIT_SONAR", atTickIndex: s.tickIndex });
  }

  if (ev.intent === "CLOSE") {
    const pos = s.positions.find(p => p.isOpen && p.playerId === playerId);
    if (!pos) return;
    if ((s.tickIndex - pos.entryTickIndex) < CONST.MIN_HOLD_TICKS) return;
    const canSpendMarker = ps.markersRemaining > 0;

    pos.isOpen = false;
    const delta = realizedPoints(pos, s.price);
    ps.scoreRealized += delta;
    if (canSpendMarker) ps.markersRemaining -= 1;
    ps.openPositionId = undefined;

    hub.sendToPlayer(playerId, { type: "FX_EVENT", sessionId: s.id, playerId, fx: delta >= 0 ? "CLOSE_GAIN" : "CLOSE_LOSS", atTickIndex: s.tickIndex, meta: { pointsDelta: delta } });
  }

  // Send HUD
  const open = s.positions.find(p => p.isOpen && p.playerId === playerId) ?? null;
  const unreal = open ? unrealizedPoints(open, s.price) : 0;
  const scoreDisplay = ps.scoreRealized + unreal;

  hub.sendToPlayer(playerId, {
    type: "PLAYER_HUD",
    sessionId: s.id,
    playerId,
    scoreRealized: ps.scoreRealized,
    scoreDisplay,
    markersRemaining: ps.markersRemaining,
    hasOpen: !!open,
    openPosition: open ? {
      positionId: open.id,
      direction: open.direction,
      leverage: open.leverage,
      commitPoints: open.committedPoints,
      entryPrice: open.entryPrice,
      entryTickIndex: open.entryTickIndex,
      unrealized: unreal
    } : null,
    flags: {
      finalCloseRequired: !!open && ps.markersRemaining <= 1,
      closingPhase: s.phase === "CLOSING"
    }
  });
}

const hub = new WsHub(server, onClientEvent);

function seedFourSessions() {
  const archetypes = ["STANDARD", "THIN_FLOAT", "DEEP_POOL", "WHIPSAW"] as const;
  const supplies = [1_000_000, 10_000_000, 100_000_000, 1_000_000_000];
  for (let i = 0; i < 4; i++) {
    const s = createSession({
      assetName: `AutoAsset-${i + 1}`,
      supply: supplies[i],
      initialPrice: 1 + Math.floor(Math.random() * 100),
      marketIndex: 1 + Math.floor(Math.random() * 100),
      archetype: archetypes[i]
    });
    sessions.set(s.id, s);
  }
}
seedFourSessions();


app.get("/health", (_, res) => res.json({ ok: true }));

// ---- Developer Leads (Kreation Studios Games) ----
// Public endpoint (no auth required). Used by /developers submit form.
app.post("/api/developer-leads", async (req, res) => {
  try {
    // Optional playerRef if provided (Telegram/web identity) — not required.
    const playerRef = (req.header("X-Player-Ref") ?? "").toString() || undefined;

    const input = buildLeadFromRequest(req, req.body, playerRef);
    const err = validateLead(input);
    if (err) return res.status(400).json({ ok: false, error: err });

    // Honeypot field support (if frontend sends it); reject if filled.
    const honey = String((req.body as any).company ?? "").trim();
    if (honey) return res.status(400).json({ ok: false, error: "BOT_DETECTED" });

    const created = await developerLeads.createLead(input);
    return res.json({ ok: true, leadId: created.id });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message ?? "LEAD_CREATE_FAILED" });
  }
});

// Admin: list developer leads (for ops / review without logging into Supabase).
// Requires header: X-Admin-Token: <ADMIN_TOKEN>
app.get("/api/admin/developer-leads", requireAdminToken, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, Number(req.query.limit ?? 50)));
    const offset = Math.max(0, Number(req.query.offset ?? 0));
    const result = await developerLeads.listLeads({ limit, offset });
    return res.json({ ok: true, ...result, limit, offset });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message ?? "LIST_FAILED" });
  }
});


// ---- Credits / Profile ----
app.get("/api/credits/balance", requirePlayerRef, async (req, res) => {
  const playerRef = getPlayerRef(req);
  const sessionsBalance = await credits.getBalance(playerRef);
  return res.json({ playerRef, sessionsBalance });
});

// ---- Stripe Checkout (scaffold) ----
app.post("/api/payments/stripe/checkout", requirePlayerRef, async (req, res) => {
  try {
    const playerRef = getPlayerRef(req);
    const bundle = (req.body?.bundle ?? "BUNDLE_10") as StripeBundle;
    if (bundle !== "BUNDLE_10" && bundle !== "BUNDLE_100") {
      return res.status(400).json({ ok: false, error: "invalid_bundle" });
    }

    const successUrl = process.env.STRIPE_SUCCESS_URL ?? "https://example.com/success";
    const cancelUrl = process.env.STRIPE_CANCEL_URL ?? "https://example.com/cancel";

    const { url, sessionId } = await createCheckoutUrl({ playerRef, bundle, successUrl, cancelUrl });
    return res.json({ ok: true, url, sessionId, bundle, sessions: BundleToSessions[bundle] });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message ?? "stripe_checkout_error" });
  }
});
  const bundle = (req.body?.bundle ?? "") as StripeBundle;
  if (!(bundle in BundleToSessions)) return res.status(400).json({ error: "INVALID_BUNDLE" });
  const successUrl = process.env.STRIPE_SUCCESS_URL ?? "https://example.com/success";
  const cancelUrl = process.env.STRIPE_CANCEL_URL ?? "https://example.com/cancel";
  const checkoutUrl = await createCheckoutUrl({ playerRef, bundle, successUrl, cancelUrl });
  return res.json({ checkoutUrl });
});

// ---- Session Join (consumes 1 session credit if joinable) ----
app.post("/api/sessions/:sessionId/join", requirePlayerRef, async (req, res) => {
  const playerRef = getPlayerRef(req);
  const sessionId = req.params.sessionId;
  const s = sessions.get(sessionId);
  if (!s) return res.status(404).json({ error: "SESSION_NOT_FOUND" });
  const now = Date.now();
  const phase = now >= s.endTimeMs ? "ENDED" : (now >= s.closingTimeMs ? "CLOSING" : (now >= s.closingTimeMs - 30_000 ? "FINAL_COMMIT_WARNING" : "LIVE"));
  if (phase === "CLOSING") {
    const sessionsBalance = await credits.getBalance(playerRef);
    return res.json({ join: "spectate", sessionId, phase, sessionsBalance });
  }
  if (phase === "ENDED") return res.status(409).json({ error: "SESSION_ENDED" });
  const idem = req.header("Idempotency-Key") ?? "";
  const consume = await credits.consumeOneSession(playerRef, sessionId, idem);
  if (!consume.ok) return res.status(402).json({ error: consume.reason === "INSUFFICIENT" ? "INSUFFICIENT_SESSIONS" : "DUPLICATE_JOIN" });
  // TODO: issue join token / mark entitlement if needed
  return res.json({ join: "play", sessionId, sessionsBalance: consume.balance });
});

app.get("/sessions", (_, res) => {
  res.json(Array.from(sessions.values()).map(s => ({
    id: s.id,
    assetName: s.assetName,
    supply: s.supply,
    marketIndex: s.marketIndex,
    archetype: s.archetype,
    phase: s.phase,
    price: s.price,
    tickIndex: s.tickIndex,
    endTimeMs: s.endTimeMs,
    closingTimeMs: s.closingTimeMs
  })));
});

setInterval(async () => {
  for (const [id, s] of sessions.entries()) {
    s.activePlayers = Array.from(hub.getClients()).filter(c => c.sessionSubs.has(id)).length;
    const next = await stepTick(s, { vrfQueue, onBroadcast: (ev) => hub.broadcastToSession(id, ev) });
    sessions.set(id, next);
  }
}, 5_000);

server.listen(PORT, () => console.log(`PrintR backend listening on :${PORT}`));
