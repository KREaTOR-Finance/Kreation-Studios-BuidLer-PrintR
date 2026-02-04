/**
 * PrintR — VRF Settlement Interface
 *
 * Goal:
 * - Keep UI and game state machine identical whether randomness is simulated or on-chain VRF.
 * - Support async resolution (request -> pending -> fulfill -> settle).
 *
 * On Solana, you can plug in a randomness provider (e.g., Switchboard / Orao / etc.).
 * This interface abstracts that away so the frontend doesn't care which provider you use.
 */

import type { Direction, RiskTier, RoundResult } from "./machine";

export type SettlementRequest = {
  roundId: string;               // client-generated UUID
  playerRef: string;             // Telegram ID or wallet pubkey (or both)
  sessionId?: string | null;     // backend session id
  direction: Direction;
  tier: RiskTier;
  wagerTokens: number;           // 1 for now
  createdAt: number;
  playToken?: string | null;     // issued by join endpoint
};

export type SettlementPending = {
  provider: "SIM" | "ONCHAIN";
  requestId: string;             // provider request id / tx signature
  submittedAt: number;
  etaMs?: number;                // optional
};

export type SettlementFulfilled = {
  requestId: string;
  fulfilledAt: number;
  randomness: string;            // hex/base58/whatever your provider returns
  round?: Record<string, any>;
  profile?: Record<string, any>;
};

export type SettlementOutcome = {
  roundId: string;
  pending: SettlementPending;
  fulfilled?: SettlementFulfilled;
  result: RoundResult;
};

// Adapter interface
export interface VrfAdapter {
  kind: "SIM" | "ONCHAIN";
  request(setup: SettlementRequest): Promise<SettlementPending>;
  awaitFulfill(pending: SettlementPending): Promise<SettlementFulfilled>;
  deriveResult(input: { setup: SettlementRequest; fulfilled: SettlementFulfilled }): RoundResult;
}

/**
 * Default SIM adapter:
 * - Requests immediately
 * - "Fulfills" after a delay
 * - Derives a result deterministically from seeded randomness
 */
export const SimVrfAdapter: VrfAdapter = {
  kind: "SIM",
  async request(setup){
    return {
      provider: "SIM",
      requestId: "sim_" + setup.roundId,
      submittedAt: Date.now(),
      etaMs: setup.tier === "SAFE" ? 900 : setup.tier === "BOLD" ? 1100 : 1300
    };
  },
  async awaitFulfill(pending){
    const eta = pending.etaMs ?? 1000;
    await new Promise(r => setTimeout(r, eta));
    const bytes = seededBytes(pending.requestId);
    const randomnessHex = bytesToHex(bytes);
    return {
      requestId: pending.requestId,
      fulfilledAt: Date.now(),
      randomness: `0x${randomnessHex}`
    };
  },
  deriveResult({ setup, fulfilled }){
    const tier = setup.tier;
    const pWin = tier === "SAFE" ? 0.58 : tier === "BOLD" ? 0.48 : 0.38;
    const u = randomnessToUnit(fulfilled.randomness);
    const win = u < pWin;
    const durationMs = tier === "SAFE" ? 5200 : tier === "BOLD" ? 6200 : 7200;
    const winPoints = tier === "SAFE" ? 250 : tier === "BOLD" ? 450 : 800;

    return {
      outcome: win ? "WIN" : "MISS",
      pointsDelta: win ? winPoints : 0,
      streakDelta: win ? 1 : -1,
      reason: win
        ? (tier === "SAFE" ? "SAFE cleared — steady read." : tier === "BOLD" ? "BOLD hit — tight timing." : "LEGEND nailed — elite precision.")
        : (tier === "SAFE" ? "SAFE needs a clean move. Try again." : tier === "BOLD" ? "BOLD is a tighter window. Consider SAFE for consistency." : "LEGEND missed — razor-thin window. Keep grinding."),
      tier: setup.tier,
      direction: setup.direction,
      durationMs
    };
  }
};

function seededBytes(seed: string, length = 32): Uint8Array {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    out[i] = h & 0xff;
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array | null {
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (cleaned.length === 0 || cleaned.length % 2 !== 0) return null;
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) return null;
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToUnit(bytes: Uint8Array): number {
  if (bytes.length < 8) return 0;
  let u64 = 0n;
  for (let i = 0; i < 8; i++) {
    u64 = (u64 << 8n) + BigInt(bytes[i]);
  }
  return Number(u64) / 18446744073709551616;
}

function randomnessToUnit(randomness: string): number {
  const bytes = hexToBytes(randomness) ?? seededBytes(randomness, 32);
  return bytesToUnit(bytes);
}
