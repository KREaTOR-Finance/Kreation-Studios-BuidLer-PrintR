/**
 * PrintR — Solana Program-Enforced Settlement Adapter (Switchboard SRS)
 *
 * request()      -> sends tx calling printr::request_round (returns tx sig)
 * awaitFulfill() -> polls Round PDA until status != Pending
 *
 * NOTE: This is scaffold-only (no @solana/web3.js dependency yet).
 * When you move from UI shell to implementation, you will replace the TODOs
 * with actual Connection + wallet adapter + Anchor client calls.
 */

import type { VrfAdapter, SettlementPending, SettlementRequest, SettlementFulfilled } from "./vrf";
import type { RoundResult } from "./machine";

export type SolanaCtx = {
  connection: any;   // Connection
  wallet: any;       // Wallet adapter
  programId: string; // PrintR program id
  anchorProgram?: any;
};

export function createSwitchboardSrsProgramEnforcedAdapter(ctx: SolanaCtx): VrfAdapter {
  return {
    kind: "ONCHAIN",

    async request(setup: SettlementRequest): Promise<SettlementPending> {
      // TODO:
      // - derive Round PDA
      // - call program.methods.requestRound(roundIdBytes, tier, direction, 32, priorityFee)
      // - return tx signature
      const txSig = await fakeSendTx(setup.roundId);
      return { provider: "ONCHAIN", requestId: txSig, submittedAt: Date.now(), etaMs: 3500 };
    },

    async awaitFulfill(pending: SettlementPending): Promise<SettlementFulfilled> {
      // TODO:
      // Poll Round PDA and return settled receipt:
      // - round.status
      // - round.randomness
      // - round.points_delta / streak_delta
      await new Promise(r => setTimeout(r, 2600));
      return { requestId: pending.requestId, fulfilledAt: Date.now(), randomness: "READ_FROM_ROUND_PDA" };
    },

    deriveResult(): RoundResult {
      // Program-enforced: result comes from chain. UI should ignore this and read Round PDA.
      return {
        outcome: "MISS",
        pointsDelta: 0,
        streakDelta: 0,
        reason: "Program-enforced settlement — read Round PDA.",
        tier: "SAFE",
        direction: "UP",
        durationMs: 5200
      };
    }
  };
}

async function fakeSendTx(roundId: string){
  await new Promise(r => setTimeout(r, 250));
  return `srs_tx_${roundId.slice(0,8)}_${Date.now().toString(36)}`;
}
