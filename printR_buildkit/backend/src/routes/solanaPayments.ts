import type { Express } from "express";
import { Keypair, PublicKey, Connection, clusterApiUrl } from "@solana/web3.js";
import { getPriceFeed } from "../payments/priceFeed.js";

import { requireAuth, getWallet } from "../middleware/auth.js";
import type { CreditsStore } from "../credits/store.js";
import { BundleToSessions, BundleToUsdCents, type StripeBundle } from "../payments/stripe.js";
import type { SolanaPayStore, SolanaCluster } from "../payments/solanaPayStore.js";

// Token mints
const MAINNET_SKR_MINT = process.env.SKR_MINT ?? "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
const DEVNET_SKR_MINT = process.env.SKR_MINT_DEVNET ?? MAINNET_SKR_MINT;

const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

function getCluster(): SolanaCluster {
  const c = String(process.env.SOLANA_CLUSTER ?? "devnet");
  return c === "mainnet-beta" ? "mainnet-beta" : "devnet";
}

function getRpc(cluster: SolanaCluster): string {
  const env = String(process.env.SOLANA_RPC_URL ?? "").trim();
  if (env) return env;
  return clusterApiUrl(cluster === "mainnet-beta" ? "mainnet-beta" : "devnet");
}

function getTreasury(): string {
  return String(process.env.SOLANA_TREASURY ?? "3RDG3GjGbECBLThKnE2NBJo9wJyZJB3Lgy8rC7QCMUkZ").trim();
}

function getSkrMint(cluster: SolanaCluster): string {
  return cluster === "mainnet-beta" ? MAINNET_SKR_MINT : DEVNET_SKR_MINT;
}

function getAssetFromReq(req: any): "SOL" | "SKR" {
  const a = String(req?.body?.asset ?? "SOL").toUpperCase();
  return a === "SKR" ? "SKR" : "SOL";
}

export function registerSolanaPaymentsRoutes(app: Express, args: { credits: CreditsStore; solanaPay: SolanaPayStore }){
  const { credits, solanaPay } = args;

  app.post("/api/payments/solana/intent", requireAuth, async (req, res) => {
    try {
      const playerRef = getWallet(req as any);
      const bundle = (req.body?.bundle ?? "BUNDLE_5") as StripeBundle;
      if (bundle !== "BUNDLE_1" && bundle !== "BUNDLE_5" && bundle !== "BUNDLE_15" && bundle !== "BUNDLE_99" && bundle !== "RESET_POINTS") {
        return res.status(400).json({ ok: false, error: "invalid_bundle" });
      }

      const asset = getAssetFromReq(req);
      const cluster = getCluster();
      const reference = Keypair.generate().publicKey.toBase58();
      const usdCents = BundleToUsdCents[bundle];
      const basePlays = BundleToSessions[bundle];
      const plays = asset === "SKR" ? Math.round(basePlays * 1.25) : basePlays;

      await solanaPay.createIntent({ reference, playerRef, bundle, usdCents, sessions: plays, cluster });

      const skrMint = getSkrMint(cluster);
      const feed = await getPriceFeed({ skrMint });
      const usd = usdCents / 100;

      if (asset === "SOL") {
        const sol = usd / feed.solUsd;
        const lamports = Math.ceil(sol * 1_000_000_000);
        return res.json({
          ok: true,
          asset,
          reference,
          recipient: getTreasury(),
          cluster,
          usdCents,
          plays,
          quote: { sol, lamports, solUsd: feed.solUsd, source: feed.source },
          label: "PrintR",
          message: bundle === "RESET_POINTS" ? "Points Reset" : "Play Credits"
        });
      }

      const skr = usd / feed.skrUsd;
      // assume 9 decimals unless you specify; can be made dynamic later
      const decimals = Number(process.env.SKR_DECIMALS ?? 9);
      const amountAtoms = BigInt(Math.ceil(skr * 10 ** decimals));

      return res.json({
        ok: true,
        asset,
        reference,
        recipient: getTreasury(),
        cluster,
        mint: skrMint,
        usdCents,
        plays,
        quote: { skr, amountAtoms: amountAtoms.toString(), skrUsd: feed.skrUsd, decimals, source: feed.source },
        label: "PrintR",
        message: bundle === "RESET_POINTS" ? "Points Reset" : "Play Credits"
      });
    
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message ?? "intent_failed" });
    }
  });

  app.post("/api/payments/solana/confirm", requireAuth, async (req, res) => {
    try {
      const playerRef = getWallet(req as any);
      const reference = String(req.body?.reference ?? "").trim();
      const signature = String(req.body?.signature ?? "").trim();
      if (!reference || !signature) return res.status(400).json({ ok: false, error: "missing_reference_or_signature" });

      const intent = await solanaPay.getIntent(reference);
      if (!intent) return res.status(404).json({ ok: false, error: "intent_not_found" });
      if (intent.playerRef !== playerRef) return res.status(403).json({ ok: false, error: "intent_player_mismatch" });

      // Idempotency by signature
      if (await solanaPay.isSignatureProcessed(signature)) {
        return res.json({ ok: true, duplicate: true });
      }

      const cluster = intent.cluster;
      const conn = new Connection(getRpc(cluster), "confirmed");

      const tx = await conn.getTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
      if (!tx) return res.status(400).json({ ok: false, error: "tx_not_found" });
      if (tx.meta?.err) return res.status(400).json({ ok: false, error: "tx_failed" });

      // Ensure reference pubkey is included (Solana Pay style)
      const refPk = new PublicKey(reference);
      const accountKeys = (tx.transaction.message.getAccountKeys ? tx.transaction.message.getAccountKeys().staticAccountKeys : (tx.transaction.message as any).accountKeys) as any;
      const keysArr: PublicKey[] = Array.isArray(accountKeys) ? accountKeys : [];
      const hasRef = keysArr.some((k) => k?.toBase58?.() === refPk.toBase58());
      if (!hasRef) return res.status(400).json({ ok: false, error: "missing_reference" });

      const treasury = getTreasury();

      // Verify payment amount based on reference'd transaction.
      // We support two payment styles:
      // - SOL transfer to treasury (lamports)
      // - SKR SPL token transfer to treasury (token amount)
      const isToken = (tx.meta?.postTokenBalances?.length ?? 0) > 0;

      if (!isToken) {
        // SOL: verify treasury lamport delta
        const keys = keysArr.map(k => k.toBase58());
        const idx = keys.indexOf(treasury);
        if (idx < 0) return res.status(400).json({ ok: false, error: "treasury_not_in_tx" });

        const preLamports = Number((tx.meta as any)?.preBalances?.[idx] ?? 0);
        const postLamports = Number((tx.meta as any)?.postBalances?.[idx] ?? 0);
        const deltaLamports = postLamports - preLamports;

        const skrMint = getSkrMint(cluster);
        const feed = await getPriceFeed({ skrMint });
        const usd = intent.usdCents / 100;
        const expectedLamports = Math.floor((usd / feed.solUsd) * 1_000_000_000);
        const minLamports = Math.floor(expectedLamports * 0.98); // 2% slippage tolerance

        if (deltaLamports < minLamports) {
          return res.status(400).json({ ok: false, error: "amount_mismatch", expectedLamports, minLamports, got: deltaLamports });
        }
      } else {
        // SKR: verify treasury token delta for SKR mint
        const mint = getSkrMint(cluster);
        const pre = tx.meta?.preTokenBalances ?? [];
        const post = tx.meta?.postTokenBalances ?? [];

        const preTreasury = pre.filter(b => b.mint === mint && (b.owner === treasury)).reduce((sum, b: any) => sum + Number(b.uiTokenAmount?.amount ?? 0), 0);
        const postTreasury = post.filter(b => b.mint === mint && (b.owner === treasury)).reduce((sum, b: any) => sum + Number(b.uiTokenAmount?.amount ?? 0), 0);
        const deltaAtoms = postTreasury - preTreasury;

        const feed = await getPriceFeed({ skrMint: mint });
        const usd = intent.usdCents / 100;
        const skr = usd / feed.skrUsd;
        const decimals = Number(process.env.SKR_DECIMALS ?? 9);
        const expectedAtoms = Math.floor(skr * 10 ** decimals);
        const minAtoms = Math.floor(expectedAtoms * 0.98);

        if (deltaAtoms < minAtoms) {
          return res.status(400).json({ ok: false, error: "amount_mismatch", expectedAtoms, minAtoms, got: deltaAtoms });
        }
      }

      // Mark signature processed and intent paid
      await solanaPay.markSignatureProcessed(signature, reference, Date.now());
      await solanaPay.markPaid(reference, signature, Date.now()).catch(() => {});

      // Credit sessions
      await credits.addLedger({
        playerRef,
        deltaSessions: intent.sessions,
        reason: intent.bundle === "RESET_POINTS" ? "adjustment" : "purchase",
        source: "usdc", 
        externalRef: signature,
        idempotencyKey: `solana:${reference}`,
        meta: { reference, signature, cluster, bundle: intent.bundle, usdCents: intent.usdCents, note: "paid via solana (SOL or SKR)" }
      });

      return res.json({ ok: true, credited: intent.sessions, signature });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message ?? "confirm_failed" });
    }
  });
}
