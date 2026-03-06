import type { Express } from "express";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { issueToken } from "../auth/tokens.js";

// Minimal in-memory nonce store (use Redis/DB in multi-instance prod)
const nonces = new Map<string, { nonce: string; expiresAt: number }>();

function randomNonce() {
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

function buildMessage(opts: { wallet: string; nonce: string; termsVersion: string }) {
  return [
    "PrintR Entry",
    `Wallet: ${opts.wallet}`,
    `Terms: ${opts.termsVersion}`,
    `Nonce: ${opts.nonce}`
  ].join("\n");
}

export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/nonce", (req, res) => {
    const wallet = String(req.query.wallet ?? "").trim();
    if (!wallet) return res.status(400).json({ ok: false, error: "WALLET_REQUIRED" });
    try { new PublicKey(wallet); } catch { return res.status(400).json({ ok: false, error: "BAD_WALLET" }); }

    const nonce = randomNonce();
    const ttlMs = 5 * 60_000;
    nonces.set(wallet, { nonce, expiresAt: Date.now() + ttlMs });

    const termsVersion = String(process.env.TERMS_VERSION ?? "v1");
    const msg = buildMessage({ wallet, nonce, termsVersion });

    return res.json({ ok: true, wallet, nonce, termsVersion, message: msg, expiresInMs: ttlMs });
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const wallet = String(req.body?.wallet ?? "").trim();
      const signature = String(req.body?.signature ?? "").trim(); // base58
      const nonce = String(req.body?.nonce ?? "").trim();
      const termsVersion = String(req.body?.termsVersion ?? process.env.TERMS_VERSION ?? "v1");

      if (!wallet || !signature || !nonce) return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });
      try { new PublicKey(wallet); } catch { return res.status(400).json({ ok: false, error: "BAD_WALLET" }); }

      const rec = nonces.get(wallet);
      if (!rec || rec.expiresAt < Date.now()) return res.status(400).json({ ok: false, error: "NONCE_EXPIRED" });
      if (rec.nonce !== nonce) return res.status(400).json({ ok: false, error: "NONCE_MISMATCH" });

      const msg = buildMessage({ wallet, nonce, termsVersion });
      const msgBytes = Buffer.from(msg, "utf8");
      const sigBytes = bs58.decode(signature);

      // @solana/web3.js uses tweetnacl internally; verify via ed25519 program?
      // We can verify using PublicKey.verify if available; otherwise use nacl via global.
      const pk = new PublicKey(wallet);
      const ok = (pk as any).verify
        ? (pk as any).verify(msgBytes, sigBytes)
        : (await import("tweetnacl")).default.sign.detached.verify(msgBytes, sigBytes, pk.toBytes());

      if (!ok) return res.status(401).json({ ok: false, error: "BAD_SIGNATURE" });

      // Consume nonce
      nonces.delete(wallet);

      const ttlMs = Number(process.env.AUTH_TTL_MS ?? 24 * 60 * 60_000);
      const issued = issueToken({ wallet, termsVersion }, ttlMs);
      return res.json({ ok: true, token: issued.token, wallet, termsVersion, expiresAt: issued.claims.exp });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message ?? "LOGIN_FAILED" });
    }
  });
}
