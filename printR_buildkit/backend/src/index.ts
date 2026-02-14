import "dotenv/config";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { randomInt, randomUUID } from "node:crypto";

import { WsHub } from "./server/ws.js";
import { DevVrfProvider } from "./vrf/devProvider.js";
import { SwitchboardSrsProvider } from "./vrf/switchboardSrsProvider.js";
import { VrfQueue } from "./vrf/queue.js";
import { createSession, stepTick } from "./engine/sessionEngine.js";
import type { SessionRuntime } from "./engine/models.js";
import type { ClientEvent } from "./types/events.js";
import { CONST, realizedPoints, unrealizedPoints } from "./engine/mechanics.js";

import { createDeveloperLeadsStore, buildLeadFromRequest, validateLead } from "./developers/leadsStore.js";
import { requireAdminToken } from "./middleware/adminToken.js";
import { InMemoryCreditsStore } from "./credits/store.js";
import { SqliteCreditsStore } from "./credits/sqliteCreditsStore.js";
import { PostgresCreditsStore } from "./credits/postgresCreditsStore.js";
import { InMemoryRoundsStore } from "./rounds/store.js";
import { SqliteRoundsStore } from "./rounds/sqliteRoundsStore.js";
import { PostgresRoundsStore } from "./rounds/postgresRoundsStore.js";
import { InMemoryPrizesStore } from "./prizes/store.js";
import { SqlitePrizesStore } from "./prizes/sqlitePrizesStore.js";
import { PostgresPrizesStore } from "./prizes/postgresPrizesStore.js";
import { InMemoryReceiptsStore } from "./ledger/receiptsStore.js";
import { SqliteReceiptsStore } from "./ledger/sqliteReceiptsStore.js";
import { PostgresReceiptsStore } from "./ledger/postgresReceiptsStore.js";
import { InMemoryAnalyticsStore } from "./analytics/store.js";
import { SqliteAnalyticsStore } from "./analytics/sqliteAnalyticsStore.js";
import { PostgresAnalyticsStore } from "./analytics/postgresAnalyticsStore.js";
import { RateLimiter } from "./security/rateLimiter.js";
import { registerCreditsRoutes } from "./routes/credits.js";
import { registerPaymentsRoutes } from "./routes/payments.js";
import { registerWebhookRoutes } from "./routes/webhooks.js";
import { registerRoundsRoutes } from "./routes/rounds.js";
import { registerPrizesRoutes } from "./routes/prizes.js";
import { registerSessionRoutes } from "./routes/sessions.js";
import { InMemoryEntitlementsStore } from "./sessions/entitlementsStore.js";


const PORT = Number(process.env.PORT ?? 8080);
const ORIGIN = process.env.CORS_ORIGIN ?? "*";

const app = express();

// Credits store (authoritative).
// MVP default: SQLite when DATABASE_PATH is set, otherwise in-memory.
const databaseUrl = process.env.DATABASE_URL;
const dbPath = process.env.DATABASE_PATH;
const credits = databaseUrl
  ? new PostgresCreditsStore(databaseUrl)
  : (dbPath ? new SqliteCreditsStore(dbPath) : new InMemoryCreditsStore());
if (!databaseUrl && dbPath && (credits as any).migrate) (credits as any).migrate();

const rounds = databaseUrl
  ? new PostgresRoundsStore(databaseUrl)
  : (dbPath ? new SqliteRoundsStore(dbPath) : new InMemoryRoundsStore());
if (!databaseUrl && dbPath && (rounds as any).migrate) (rounds as any).migrate();

const prizes = databaseUrl
  ? new PostgresPrizesStore(databaseUrl)
  : (dbPath ? new SqlitePrizesStore(dbPath) : new InMemoryPrizesStore());
if (!databaseUrl && dbPath && (prizes as any).migrate) (prizes as any).migrate();

const receipts = databaseUrl
  ? new PostgresReceiptsStore(databaseUrl)
  : (dbPath ? new SqliteReceiptsStore(dbPath) : new InMemoryReceiptsStore());
if (!databaseUrl && dbPath && (receipts as any).migrate) (receipts as any).migrate();

const analytics = databaseUrl
  ? new PostgresAnalyticsStore(databaseUrl)
  : (dbPath ? new SqliteAnalyticsStore(dbPath) : new InMemoryAnalyticsStore());
if (!databaseUrl && dbPath && (analytics as any).migrate) (analytics as any).migrate();

const limiter = new RateLimiter();
const entitlements = new InMemoryEntitlementsStore();

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
registerWebhookRoutes(app, { credits, rounds, prizes, receipts, analytics });
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
      payerKeypairPath: process.env.SOLANA_PAYER_KEYPAIR_PATH,
      queuePubkey: process.env.SWITCHBOARD_QUEUE_PUBKEY,
      explorerCluster: process.env.SOLANA_EXPLORER_CLUSTER
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

function buildHud(session: SessionRuntime, playerId: string, ps: PlayerState) {
  const open = session.positions.find(p => p.isOpen && p.playerId === playerId) ?? null;
  const unreal = open ? unrealizedPoints(open, session.price) : 0;
  const scoreDisplay = ps.scoreRealized + unreal;
  return {
    type: "PLAYER_HUD",
    sessionId: session.id,
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
      closingPhase: session.phase === "CLOSING"
    }
  };
}

function sendHud(session: SessionRuntime, playerId: string) {
  const ps = getPlayerState(session.id, playerId);
  hub.sendToPlayer(playerId, buildHud(session, playerId, ps));
}

function broadcastHud(session: SessionRuntime) {
  for (const client of hub.getClients()) {
    if (!client.sessionSubs.has(session.id)) continue;
    const ps = getPlayerState(session.id, client.playerId);
    hub.sendToPlayer(client.playerId, buildHud(session, client.playerId, ps));
  }
}

function onClientEvent(playerId: string, ev: ClientEvent) {
  if (ev.type === "SESSION_SUBSCRIBE") {
    const s = sessions.get(ev.sessionId);
    if (!s) return;
    hub.subscribe(playerId, s.id);
    const now = Date.now();
    hub.sendToPlayer(playerId, {
      type: "SESSION_STATE",
      sessionId: s.id,
      phase: s.phase,
      tickIndex: s.tickIndex,
      price: s.price,
      timeRemainingMs: Math.max(0, s.endTimeMs - now),
      closingRemainingMs: Math.max(0, s.closingTimeMs - now),
      marketIndex: s.marketIndex,
      supply: s.supply,
      archetype: s.archetype,
      assetName: s.assetName,
      history: s.tickHistory
    });
    sendHud(s, playerId);
    return;
  }

  const s = sessions.get(ev.sessionId);
  if (!s) return;

  // Auto-subscribe on first intent
  hub.subscribe(playerId, s.id);

  const ps = getPlayerState(s.id, playerId);
  const closing = s.phase !== "LIVE";
  let didUpdate = false;

  if (ev.intent === "OPEN") {
    if (closing) return;
    // Require at least one marker remaining for the eventual close.
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
    didUpdate = true;
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
    didUpdate = true;
  }

  if (didUpdate) sendHud(s, playerId);
}

const hub = new WsHub(server, onClientEvent);

function resetSessions() {
  sessions.clear();
  playerState.clear();

  const archetypes = ["STANDARD", "THIN_FLOAT", "DEEP_POOL", "WHIPSAW"] as const;
  const supplies = [1_000_000, 10_000_000, 100_000_000, 1_000_000_000];
  for (let i = 0; i < 4; i++) {
    const s = createSession({
      assetName: `AutoAsset-${i + 1}`,
      supply: supplies[i],
      initialPrice: randomInt(1, 101),
      marketIndex: randomInt(1, 101),
      archetype: archetypes[i]
    });
    sessions.set(s.id, s);
  }
}
resetSessions();


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


registerCreditsRoutes(app, {
  credits,
  sessions,
  entitlements,
  receipts,
  analytics,
  limiter,
  playTokenTtlMs: Number(process.env.PLAY_TOKEN_TTL_MS ?? 60 * 60 * 1000)
});
registerPaymentsRoutes(app, analytics);
registerRoundsRoutes(app, { rounds, vrf: vrfProvider, limiter, analytics, receipts });
registerPrizesRoutes(app, { prizes, receipts, analytics, limiter });
registerSessionRoutes(app, { sessions, entitlements });

// Serve mobile web app static files (built by render-build.sh)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
app.use(express.static(publicDir));

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
    activePlayers: s.activePlayers,
    endTimeMs: s.endTimeMs,
    closingTimeMs: s.closingTimeMs
  })));
});

setInterval(async () => {
  for (const [id, s] of sessions.entries()) {
    const clients = Array.from(hub.getClients());
    s.activePlayers = clients.filter(c => c.sessionSubs.has(id)).length;

    const prev = s;
    let next = await stepTick(s, { vrfQueue, onBroadcast: (ev) => hub.broadcastToSession(id, ev) });

    const breakpoints = next.positions.filter(pos => {
      const prevPos = prev.positions.find(p => p.id === pos.id);
      return !!prevPos && prevPos.isOpen && !pos.isOpen && pos.wasBreakPoint;
    });
    for (const pos of breakpoints) {
      const ps = getPlayerState(next.id, pos.playerId);
      const delta = realizedPoints(pos, next.price);
      ps.scoreRealized += delta;
      ps.openPositionId = undefined;
      hub.sendToPlayer(pos.playerId, {
        type: "FX_EVENT",
        sessionId: next.id,
        playerId: pos.playerId,
        fx: "BREAK_POINT",
        atTickIndex: next.tickIndex,
        meta: { pointsDelta: delta }
      });
    }

    if (prev.phase !== "ENDED" && next.phase === "ENDED") {
      const forfeits = next.positions.filter(p => p.isOpen);
      if (forfeits.length) {
        next = {
          ...next,
          positions: next.positions.map(p => p.isOpen ? { ...p, isOpen: false } : p)
        };
        for (const pos of forfeits) {
          const ps = getPlayerState(next.id, pos.playerId);
          const rawDelta = realizedPoints(pos, next.price);
          const delta = rawDelta < 0 ? rawDelta : 0;
          if (delta !== 0) ps.scoreRealized += delta;
          ps.openPositionId = undefined;
          hub.sendToPlayer(pos.playerId, {
            type: "FX_EVENT",
            sessionId: next.id,
            playerId: pos.playerId,
            fx: "FORFEIT",
            atTickIndex: next.tickIndex,
            meta: { pointsDelta: delta }
          });
        }
      }
    }

    sessions.set(id, next);
    broadcastHud(next);
  }

  if (sessions.size === 0 || Array.from(sessions.values()).every(s => s.phase === "ENDED")) {
    resetSessions();
  }
}, 5_000);

// SPA catch-all: any non-API, non-static route serves the mobile web app
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

server.listen(PORT, () => console.log(`PrintR backend listening on :${PORT}`));
