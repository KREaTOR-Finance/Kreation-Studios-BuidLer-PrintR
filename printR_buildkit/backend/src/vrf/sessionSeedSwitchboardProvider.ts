import { randomBytes, createHash } from "node:crypto";

import type { VrfProvider, VrfSample, VrfProof } from "./provider.js";
import { bytesToHex, bytesToSignedUnit } from "./bytes.js";
import { SwitchboardSrsProvider } from "./switchboardSrsProvider.js";

export type SessionVrfPublic = {
  sessionId: string;
  commitment: string; // sha256(commit domain || sessionId || serverSecret)
  vrf: {
    randomnessAccount?: string;
    commitTxSig?: string;
    revealTxSig?: string;
    committedSlot?: number;
    revealedSlot?: number;
    explorerTxUrl?: string;
    outputHex?: string; // randomness output from switchboard (public on-chain)
  };
  createdAtMs: number;
  revealedAtMs?: number;
};

export type SessionVrfReveal = {
  serverSecretHex: string; // revealed after session end
};

/**
 * Switchboard VRF provider that requests on-chain randomness **once per session**.
 *
 * Security goals:
 * - Players cannot predict the session tape during play.
 * - After session end, anyone can verify the tape using {serverSecret, vrfOutput}.
 *
 * We achieve this by:
 * - Publishing a commitment to a secret before (or at) session start
 * - Requesting Switchboard randomness once per session
 * - Deriving per-tick z values via sha256(sessionSeed || tickIndex)
 * - Revealing the secret only after session end
 */
export class SessionSeedSwitchboardProvider implements VrfProvider {
  private sb: SwitchboardSrsProvider;

  // sessionId -> private secret + derived seed
  private privateState = new Map<string, { serverSecret: Uint8Array; sessionSeed: Uint8Array }>();

  // sessionId -> public proof bundle
  private publicState = new Map<string, SessionVrfPublic>();

  // one-time init promises to dedupe concurrent tick calls
  private initPromises = new Map<string, Promise<void>>();

  constructor(sb: SwitchboardSrsProvider) {
    this.sb = sb;
  }

  /** Ensure session is initialized with {commitment, vrf output, session seed}. */
  async ensureSession(sessionId: string): Promise<void> {
    if (this.privateState.has(sessionId)) return;
    const existing = this.initPromises.get(sessionId);
    if (existing) return await existing;

    const p = (async () => {
      const serverSecret = randomBytes(32);
      const commitment = sha256Hex("PRINTR_COMMIT_V1", sessionId, serverSecret);

      // Request one sample from Switchboard (tickIndex=0) to obtain output bytes + proofs
      const { requestId } = await this.sb.requestSample(sessionId, 0);
      const sample = await this.sb.waitForSample(requestId);

      const outputHex = sample.proof?.outputHex;
      if (!outputHex) throw new Error("Switchboard sample missing outputHex");

      const outputBytes = hexToBytes(outputHex);
      if (!outputBytes) throw new Error("Invalid outputHex from Switchboard");

      // IMPORTANT: sessionSeed must include serverSecret (hidden until reveal)
      // so that even if vrfOutput is publicly fetchable, players can't derive the seed.
      const sessionSeed = sha256Bytes(
        "PRINTR_SEED_V1",
        sessionId,
        serverSecret,
        outputBytes
      );

      this.privateState.set(sessionId, { serverSecret: new Uint8Array(serverSecret), sessionSeed });

      const proof: VrfProof | undefined = sample.proof;
      this.publicState.set(sessionId, {
        sessionId,
        commitment,
        vrf: {
          randomnessAccount: proof?.randomnessAccount,
          commitTxSig: proof?.commitTxSig,
          revealTxSig: proof?.revealTxSig,
          committedSlot: proof?.committedSlot,
          revealedSlot: proof?.revealedSlot,
          explorerTxUrl: sample.proofRef,
          outputHex
        },
        createdAtMs: Date.now()
      });
    })().finally(() => {
      this.initPromises.delete(sessionId);
    });

    this.initPromises.set(sessionId, p);
    return await p;
  }

  /** Reveal the session secret (call only once session is ENDED). */
  revealSession(sessionId: string): SessionVrfReveal {
    const priv = this.privateState.get(sessionId);
    if (!priv) throw new Error(`No VRF private state for session ${sessionId}`);
    const pub = this.publicState.get(sessionId);
    if (pub && !pub.revealedAtMs) pub.revealedAtMs = Date.now();
    return { serverSecretHex: bytesToHex(priv.serverSecret) };
  }

  getPublic(sessionId: string): SessionVrfPublic | null {
    return this.publicState.get(sessionId) ?? null;
  }

  /**
   * VrfProvider interface: provide a per-tick z sample derived from the per-session seed.
   * No additional on-chain VRF calls per tick.
   */
  async requestSample(sessionId: string, tickIndex: number): Promise<{ requestId: string }> {
    await this.ensureSession(sessionId);
    return { requestId: `${sessionId}:${tickIndex}` };
  }

  async waitForSample(requestId: string): Promise<VrfSample> {
    const [sessionId, tickStr] = requestId.split(":");
    const tickIndex = Number(tickStr);
    if (!sessionId || !Number.isFinite(tickIndex)) throw new Error(`Invalid requestId: ${requestId}`);

    await this.ensureSession(sessionId);
    const priv = this.privateState.get(sessionId);
    const pub = this.publicState.get(sessionId);
    if (!priv || !pub) throw new Error(`VRF not initialized for session: ${sessionId}`);

    // Derive per-tick bytes from the hidden session seed
    const tickBytes = sha256Bytes("PRINTR_TICK_V1", sessionId, priv.sessionSeed, String(tickIndex));
    const z = bytesToSignedUnit(tickBytes);

    return {
      requestId,
      proofRef: pub.vrf.explorerTxUrl,
      z,
      proof: {
        provider: "switchboard",
        randomnessAccount: pub.vrf.randomnessAccount,
        commitTxSig: pub.vrf.commitTxSig,
        revealTxSig: pub.vrf.revealTxSig,
        committedSlot: pub.vrf.committedSlot,
        revealedSlot: pub.vrf.revealedSlot,
        outputHex: pub.vrf.outputHex,
        fetchedAtMs: Date.now()
      }
    };
  }
}

function sha256Hex(domain: string, sessionId: string, serverSecret: Uint8Array): string {
  const h = createHash("sha256");
  h.update(domain);
  h.update("|");
  h.update(sessionId);
  h.update("|");
  h.update(Buffer.from(serverSecret));
  return h.digest("hex");
}

function sha256Bytes(domain: string, ...parts: Array<string | Uint8Array>): Uint8Array {
  const h = createHash("sha256");
  h.update(domain);
  for (const p of parts) {
    h.update("|");
    if (typeof p === "string") h.update(p);
    else h.update(Buffer.from(p));
  }
  return new Uint8Array(h.digest());
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
