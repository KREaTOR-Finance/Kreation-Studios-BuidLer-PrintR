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
  direction: Direction;
  tier: RiskTier;
  wagerTokens: number;           // 1 for now
  createdAt: number;
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
 * - Derives a result from Math.random (placeholder)
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
    return {
      requestId: pending.requestId,
      fulfilledAt: Date.now(),
      randomness: String(Math.random())
    };
  },
  deriveResult({ setup }){
    // Placeholder: delegate to existing local resolver in machine.ts (kept for demo)
    // NOTE: we do not import resolveRound here to avoid circular deps.
    const tier = setup.tier;
    const pWin = tier === "SAFE" ? 0.58 : tier === "BOLD" ? 0.48 : 0.38;
    const win = Math.random() < pWin;
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
