import { randomUUID } from "node:crypto";
import type { Archetype } from "../types/events.js";
import type { VrfQueue } from "../vrf/queue.js";
import type { SessionRuntime } from "./models.js";
import { computeTickReturn, nextPrice, breakPointTriggered, CONST } from "./mechanics.js";

export type EngineDeps = {
  vrfQueue: VrfQueue;
  onBroadcast?: (event: any) => void;
};

export type CreateSessionArgs = {
  assetName: string;
  supply: number;
  initialPrice: number;
  marketIndex: number;
  archetype: Archetype;
  durationMs?: number;
  closingMs?: number;
};

export function createSession(args: CreateSessionArgs): SessionRuntime {
  const id = randomUUID();
  const now = Date.now();
  const duration = args.durationMs ?? 20 * 60_000;
  const closing = args.closingMs ?? 2 * 60_000;

  return {
    id,
    assetName: args.assetName,
    supply: args.supply,
    marketIndex: args.marketIndex,
    archetype: args.archetype,
    phase: "LIVE",
    startTimeMs: now,
    closingTimeMs: now + (duration - closing),
    endTimeMs: now + duration,
    tickIndex: 0,
    price: args.initialPrice,
    // Keep a small in-memory history for UI sparklines/debug; do not persist as a "tape".
    tickHistory: [{ tickIndex: 0, price: args.initialPrice }],
    activePlayers: 0,
    positions: []
  };
}

export async function stepTick(session: SessionRuntime, deps: EngineDeps): Promise<SessionRuntime> {
  const now = Date.now();
  const phase =
    now >= session.endTimeMs ? "ENDED" :
    now >= session.closingTimeMs ? "CLOSING" :
    "LIVE";

  await deps.vrfQueue.ensureBuffered(session.id, session.tickIndex, 3);
  const sample = deps.vrfQueue.consume(session.id);
  if (!sample || phase === "ENDED") return { ...session, phase };

  const demand = 0;

  const { r, rMax } = computeTickReturn({
    supply: session.supply,
    price: session.price,
    marketIndex: session.marketIndex,
    archetype: session.archetype,
    z: sample.z,
    demand
  });

  const price = nextPrice(session.price, r);
  const nextTickIndex = session.tickIndex + 1;

  const positions = session.positions.map(p => {
    if (!p.isOpen) return p;
    if ((nextTickIndex - p.entryTickIndex) < CONST.MIN_HOLD_TICKS) return p;
    if (breakPointTriggered(p, price)) return { ...p, isOpen: false, wasBreakPoint: true };
    return p;
  });

  const nextHistory = [...session.tickHistory, { tickIndex: nextTickIndex, price }];
  const MAX_HISTORY = 64;
  const tickHistory = nextHistory.length > MAX_HISTORY ? nextHistory.slice(-MAX_HISTORY) : nextHistory;

  const next: SessionRuntime = {
    ...session,
    phase,
    tickIndex: nextTickIndex,
    price,
    positions,
    tickHistory
  };

  deps.onBroadcast?.({
    type: "TICK",
    sessionId: next.id,
    tickIndex: next.tickIndex,
    price: next.price,
    r,
    rMax,
    demand,
    vrf: sample,
    phase: next.phase,
    timeRemainingMs: Math.max(0, next.endTimeMs - now),
    closingRemainingMs: Math.max(0, next.closingTimeMs - now)
  });

  return next;
}
