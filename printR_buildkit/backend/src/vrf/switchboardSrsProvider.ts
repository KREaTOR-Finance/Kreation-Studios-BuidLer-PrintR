import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Randomness, getDefaultQueueAddress, getProgramId, isMainnetConnection } from "@switchboard-xyz/on-demand";
import type { VrfProvider, VrfSample, VrfProof } from "./provider.js";
import { bytesToHex, bytesToSignedUnit, coerceBytes } from "./bytes.js";

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
  private payerReady: Promise<void>;
  private commitment: string;
  private queueOverride?: string;
  private explorerCluster?: string;
  private programPromise?: Promise<Program>;
  private queuePromise?: Promise<PublicKey>;
  private clusterPromise?: Promise<string>;

  // 1 randomness account per session is the simplest and maps cleanly to our SessionRuntime
  private randomnessAccounts = new Map<string, PublicKey>();

  // requestId -> promise that resolves once reveal has completed and randomness is readable
  private inflight = new Map<string, Promise<VrfSample>>();

  constructor(opts: {
    rpcUrl: string;
    commitment?: string;
    payerSecretKeyBase58?: string;
    payerKeypairPath?: string;
    queuePubkey?: string;
    explorerCluster?: string;
  }) {
    this.commitment = opts.commitment ?? "confirmed";
    this.connection = new Connection(opts.rpcUrl, this.commitment as any);
    // init payer asynchronously (ESM-safe)
    this.payer = Keypair.generate();
    this.payerReady = this.loadPayer(opts).then(kp => { this.payer = kp; }).then(() => void 0);

    this.queueOverride = opts.queuePubkey;
    this.explorerCluster = opts.explorerCluster;
  }

  private async loadPayer(opts: { payerSecretKeyBase58?: string; payerKeypairPath?: string }): Promise<Keypair> {
    if (opts.payerSecretKeyBase58 && opts.payerSecretKeyBase58.trim().length > 0) {
      const bytes = bs58.decode(opts.payerSecretKeyBase58.trim());
      return Keypair.fromSecretKey(bytes);
    }
    if (opts.payerKeypairPath && opts.payerKeypairPath.trim().length > 0) {
      // ESM-friendly file read
      const fs = await import("node:fs");
      const raw = JSON.parse(fs.readFileSync(opts.payerKeypairPath.trim(), "utf8"));
      return Keypair.fromSecretKey(Uint8Array.from(raw));
    }
    throw new Error("Missing payer config. Set SOLANA_PAYER_SECRETKEY_BASE58 or SOLANA_PAYER_KEYPAIR_PATH.");
  }

  /**
   * Ensure a Switchboard randomness account exists for this session.
   *
   * - create/init randomness account
   * - store pubkey in this.randomnessAccounts
   * - (optionally) persist in DB keyed by sessionId
   */
  private async ensureRandomnessAccount(sessionId: string): Promise<PublicKey> {
    await this.payerReady;
    const existing = this.randomnessAccounts.get(sessionId);
    if (existing) return existing;

    const program = await this.getProgram();
    const queue = await this.getQueue();
    const [randomness, accountKeypair, ixs] = await Randomness.createAndCommitIxs(
      program,
      queue,
      this.payer.publicKey
    );

    const tx = new Transaction().add(...ixs);
    await sendAndConfirmTransaction(this.connection, tx, [this.payer, accountKeypair]);

    this.randomnessAccounts.set(sessionId, randomness.pubkey);
    return randomness.pubkey;
  }

  /**
   * Request one VRF sample for a given tick.
   * Returns a requestId immediately.
   */
  async requestSample(sessionId: string, tickIndex: number): Promise<{ requestId: string }> {
    await this.payerReady;
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
    const program = await this.getProgram();
    const queue = await this.getQueue();
    const randomness = new Randomness(program, randomnessAccount);

    const commitIx = await randomness.commitIx(queue, this.payer.publicKey);
    const commitTx = new Transaction().add(commitIx);
    const commitTxSig = await sendAndConfirmTransaction(this.connection, commitTx, [this.payer]);
    const dataAfterCommit = await randomness.loadData();
    const committedSlot = asNumber((dataAfterCommit as any)?.seedSlot);

    let revealIx: any;
    let lastErr: unknown;
    for (let i = 0; i < 12; i++) {
      try {
        revealIx = await randomness.revealIx(this.payer.publicKey);
        break;
      } catch (err) {
        lastErr = err;
        await delay(1_000);
      }
    }
    if (!revealIx) {
      throw new Error(`Switchboard revealIx failed for ${requestId}: ${String(lastErr ?? "unknown")}`);
    }

    const revealTx = new Transaction().add(revealIx);
    const revealTxSig = await sendAndConfirmTransaction(this.connection, revealTx, [this.payer]);
    const dataAfterReveal = await randomness.loadData();

    const bytes = extractRandomnessBytes(dataAfterReveal);
    const outputHex = bytesToHex(bytes);
    const z = bytesToSignedUnit(bytes);
    const revealedSlot = asNumber((dataAfterReveal as any)?.revealSlot);

    const proof: VrfProof = {
      provider: "switchboard",
      randomnessAccount: randomnessAccount.toBase58(),
      commitTxSig: commitTxSig,
      revealTxSig: revealTxSig,
      committedSlot,
      revealedSlot,
      outputHex,
      fetchedAtMs: Date.now()
    };

    const proofRef = revealTxSig ? await this.buildExplorerTxUrl(revealTxSig) : undefined;

    void tickIndex;

    return {
      requestId,
      proofRef,
      z,
      proof
    };
  }

  private async getProgram(): Promise<Program> {
    if (!this.programPromise) {
      const wallet = {
        publicKey: this.payer.publicKey,
        signTransaction: async (tx: any) => {
          tx.partialSign(this.payer);
          return tx;
        },
        signAllTransactions: async (txs: any[]) => {
          txs.forEach((tx) => tx.partialSign(this.payer));
          return txs;
        }
      };
      const provider = new AnchorProvider(this.connection, wallet as any, {
        commitment: this.commitment as any
      });
      const programId = await getProgramId(this.connection);
      this.programPromise = Program.at(programId, provider);
    }
    return this.programPromise;
  }

  private async getQueue(): Promise<PublicKey> {
    if (!this.queuePromise) {
      this.queuePromise = (async () => {
        if (this.queueOverride) return new PublicKey(this.queueOverride);
        const isMainnet = await isMainnetConnection(this.connection);
        return getDefaultQueueAddress(isMainnet);
      })();
    }
    return this.queuePromise;
  }

  private async getExplorerCluster(): Promise<string> {
    if (this.explorerCluster) return this.explorerCluster;
    if (!this.clusterPromise) {
      this.clusterPromise = (async () => {
        const isMainnet = await isMainnetConnection(this.connection);
        return isMainnet ? "mainnet-beta" : "devnet";
      })();
    }
    return this.clusterPromise;
  }

  private async buildExplorerTxUrl(sig: string): Promise<string> {
    const cluster = await this.getExplorerCluster();
    const base = `https://explorer.solana.com/tx/${sig}`;
    return cluster === "mainnet-beta" ? base : `${base}?cluster=${cluster}`;
  }
}

function extractRandomnessBytes(data: any): Uint8Array {
  const candidates = [
    data?.result,
    data?.value,
    data?.randomness,
    data?.output,
    data?.randomnessValue,
    data?.result?.value,
    data?.value?.value
  ];
  for (const candidate of candidates) {
    const bytes = coerceBytes(candidate);
    if (bytes && bytes.length >= 8) return bytes;
  }
  throw new Error("Switchboard randomness bytes not found in account data");
}

function asNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  const maybe = value as any;
  if (typeof maybe.toNumber === "function") return maybe.toNumber();
  const parsed = Number(maybe);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
