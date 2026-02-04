import bs58 from "bs58";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import type { VrfProvider, VrfSample } from "./provider.js";

/**
 * Switchboard SRS-style (On-Demand) Randomness Provider (Solana)
 *
 * Trust-first MVP requirement:
 * - one VRF per tick per session
 * - program-enforced / verifiable
 *
 * This is a **wiring skeleton**. You will plug in the concrete instruction builders
 * from Switchboard's Solana/SVM randomness docs + their on-demand example repo.
 *
 * References:
 * - Switchboard Solana/SVM Randomness tutorial (JS client uses `@switchboard-xyz/on-demand`)
 * - Switchboard sb-on-demand-examples (Solana randomness examples)
 */
export class SwitchboardSrsProvider implements VrfProvider {
  private connection: Connection;
  private payer: Keypair;

  // 1 randomness account per session is the simplest and maps cleanly to our SessionRuntime
  private randomnessAccounts = new Map<string, PublicKey>();

  // requestId -> promise that resolves once reveal has completed and randomness is readable
  private inflight = new Map<string, Promise<VrfSample>>();

  constructor(opts: {
    rpcUrl: string;
    commitment?: string;
    payerSecretKeyBase58?: string;
    payerKeypairPath?: string;
  }) {
    this.connection = new Connection(opts.rpcUrl, (opts.commitment as any) ?? "confirmed");
    this.payer = this.loadPayer(opts);
  }

  private loadPayer(opts: { payerSecretKeyBase58?: string; payerKeypairPath?: string }): Keypair {
    if (opts.payerSecretKeyBase58 && opts.payerSecretKeyBase58.trim().length > 0) {
      const bytes = bs58.decode(opts.payerSecretKeyBase58.trim());
      return Keypair.fromSecretKey(bytes);
    }
    if (opts.payerKeypairPath && opts.payerKeypairPath.trim().length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require("node:fs");
      const raw = JSON.parse(fs.readFileSync(opts.payerKeypairPath.trim(), "utf8"));
      return Keypair.fromSecretKey(Uint8Array.from(raw));
    }
    throw new Error("Missing payer config. Set SOLANA_PAYER_SECRETKEY_BASE58 or SOLANA_PAYER_KEYPAIR_PATH.");
  }

  /**
   * Ensure a Switchboard randomness account exists for this session.
   *
   * TODO: Implement with @switchboard-xyz/on-demand:
   * - create/init randomness account
   * - store pubkey in this.randomnessAccounts
   * - (optionally) persist in DB keyed by sessionId
   */
  private async ensureRandomnessAccount(sessionId: string): Promise<PublicKey> {
    const existing = this.randomnessAccounts.get(sessionId);
    if (existing) return existing;

    // IMPORTANT: We fail loudly until implemented.
    throw new Error(`SwitchboardSrsProvider.ensureRandomnessAccount not implemented for session ${sessionId}`);
  }

  /**
   * Request one VRF sample for a given tick.
   * Returns a requestId immediately.
   */
  async requestSample(sessionId: string, tickIndex: number): Promise<{ requestId: string }> {
    const requestId = `${sessionId}:${tickIndex}`;
    const p = this.commitRevealRead(sessionId, tickIndex, requestId);
    this.inflight.set(requestId, p);
    return { requestId };
  }

  async waitForSample(requestId: string): Promise<VrfSample> {
    const p = this.inflight.get(requestId);
    if (!p) throw new Error(`Unknown VRF requestId: ${requestId}`);
    return await p;
  }

  /**
   * On-demand randomness (SRS-like) typical flow:
   * 1) Commit to a future slot (commit ix / tx)
   * 2) Reveal randomness for committed slot (reveal ix / tx)
   * 3) Read randomness bytes from account data
   * 4) Map bytes -> z in [-1, +1] deterministically
   *
   * TIP (recommended for 5s ticks + queue depth=3):
   * - Pre-commit several future slots (buffer)
   * - Reveal per tick
   */
  private async commitRevealRead(sessionId: string, tickIndex: number, requestId: string): Promise<VrfSample> {
    const randomnessAccount = await this.ensureRandomnessAccount(sessionId);

    // TODO: implement using Switchboard SDK instruction builders.
    // Pseudocode:
    //   const { commitIx } = await sb.randomness.commitIx({ randomnessAccount, ... })
    //   await sendAndConfirmTransaction(connection, new Transaction().add(commitIx), [payer])
    //   await waitUntilSlotEligible(...)
    //   const { revealIx } = await sb.randomness.revealIx({ randomnessAccount, ... })
    //   const sig = await sendAndConfirmTransaction(...)
    //   const bytes = await sb.randomness.readRandomness(connection, randomnessAccount)
    //   const z = bytesToSignedUnit(bytes)
    //
    // Return proofRef as:
    // - randomnessAccount + committed slot
    // - or the reveal tx signature

    void randomnessAccount;
    void tickIndex;

    throw new Error(`SwitchboardSrsProvider.commitRevealRead not implemented for ${requestId}`);
  }
}
