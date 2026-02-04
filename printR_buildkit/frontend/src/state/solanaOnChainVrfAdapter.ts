/**
 * PrintR — Solana Program-Enforced Settlement Adapter (Switchboard SRS)
 *
 * This adapter calls the backend /api/rounds/request endpoint, which executes
 * Switchboard SRS on-chain and returns the settlement + proof. Replace the
 * fetch block with direct Anchor client calls when wiring wallet flows.
 */

import type { VrfAdapter, SettlementPending, SettlementRequest, SettlementFulfilled } from "./vrf";
import { buildResultFromServer, resolveRound, type RoundResult } from "./machine";
import { API_BASE } from "../network/httpClient";

export type SolanaCtx = {
  connection: any;   // Connection
  wallet: any;       // Wallet adapter
  programId: string; // PrintR program id
  anchorProgram?: any;
  apiBase?: string;
};

export function createSwitchboardSrsProgramEnforcedAdapter(ctx: SolanaCtx): VrfAdapter {
  const pendingSetups = new Map<string, SettlementRequest>();
  const apiBase = ctx.apiBase ?? API_BASE;

  return {
    kind: "ONCHAIN",

    async request(setup: SettlementRequest): Promise<SettlementPending> {
      pendingSetups.set(setup.roundId, setup);
      return { provider: "ONCHAIN", requestId: setup.roundId, submittedAt: Date.now(), etaMs: 3500 };
    },

    async awaitFulfill(pending: SettlementPending): Promise<SettlementFulfilled> {
      const setup = pendingSetups.get(pending.requestId);
      if (!setup) throw new Error("Missing settlement setup");
      pendingSetups.delete(pending.requestId);

      if (!setup.playToken) throw new Error("Missing play token");

      const nonce = createNonce();
      const payload = buildSignaturePayload({
        playerRef: setup.playerRef,
        sessionId: setup.sessionId ?? null,
        roundId: setup.roundId,
        nonce,
        tier: setup.tier,
        direction: setup.direction
      });
      const signature = await hmacSha256Hex(setup.playToken, payload);

      const res = await fetch(`${apiBase}/api/rounds/request`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-printr-player": setup.playerRef,
          "x-printr-play-token": setup.playToken
        },
        body: JSON.stringify({
          roundId: setup.roundId,
          sessionId: setup.sessionId ?? null,
          tier: setup.tier,
          direction: setup.direction,
          nonce,
          signature
        })
      });

      const data = await readJson(res);
      if (!res.ok) {
        const err = data?.error ?? `ROUND_REQUEST_FAILED_${res.status}`;
        throw new Error(err);
      }

      const round = data?.round ?? null;
      const profile = data?.profile ?? null;
      if (!round) {
        throw new Error("ROUND_RESPONSE_MISSING");
      }
      const randomness = round?.randomnessHex ?? "";

      return {
        requestId: round?.requestId ?? pending.requestId,
        fulfilledAt: Date.now(),
        randomness,
        round: round ?? undefined,
        profile: profile ?? undefined
      };
    },

    deriveResult({ setup, fulfilled }): RoundResult {
      const round = fulfilled.round as any;
      if (round?.tier && round?.direction && round?.status) {
        return buildResultFromServer(round);
      }
      return resolveRound(setup.direction, setup.tier, fulfilled.randomness);
    }
  };
}

function buildSignaturePayload(args: {
  playerRef: string;
  sessionId: string | null;
  roundId: string;
  nonce: string;
  tier: string;
  direction: string;
}) {
  return `${args.playerRef}:${args.sessionId ?? ""}:${args.roundId}:${args.nonce}:${args.tier}:${args.direction}`;
}

async function hmacSha256Hex(key: string, payload: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("WebCrypto unavailable");
  }
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(payload));
  return bytesToHex(new Uint8Array(sig));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function createNonce(): string {
  try {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
  } catch {
    fallbackNonceCounter = (fallbackNonceCounter + 1) % 1_000_000;
    return `${Date.now()}_${fallbackNonceCounter}`;
  }
}

let fallbackNonceCounter = 0;

async function readJson(res: Response): Promise<any | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
