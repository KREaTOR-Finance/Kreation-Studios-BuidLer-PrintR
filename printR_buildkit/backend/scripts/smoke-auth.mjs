import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";

const base = process.env.API_BASE || "http://localhost:3001";

async function main(){
  console.log("[smoke] base=", base);

  const sessions = await j(`${base}/sessions`);
  if (!Array.isArray(sessions) || sessions.length === 0) throw new Error("no sessions");
  const s = sessions.find(x=>x.phase === "LIVE") ?? sessions[0];
  console.log("[smoke] session", s.id, s.phase);

  // Use a deterministic dev keypair (from .secrets/devnet-keypair.json if present)
  const fs = await import("node:fs");
  let kp;
  try {
    const raw = fs.readFileSync(new URL("../.secrets/devnet-keypair.json", import.meta.url), "utf8");
    kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  } catch {
    kp = Keypair.generate();
  }
  const wallet = kp.publicKey.toBase58();

  const nonceRes = await j(`${base}/api/auth/nonce?wallet=${encodeURIComponent(wallet)}`);
  if (!nonceRes?.ok) throw new Error("nonce failed");

  const msg = String(nonceRes.message);
  const nonce = String(nonceRes.nonce);
  const termsVersion = String(nonceRes.termsVersion);

  // Sign message (ed25519)
  const msgBytes = Buffer.from(msg, "utf8");
  const sig = bs58.encode((await import("tweetnacl")).default.sign.detached(msgBytes, kp.secretKey));

  const loginRes = await j(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet, signature: sig, nonce, termsVersion })
  });
  if (!loginRes?.ok) throw new Error("login failed: " + (loginRes?.error ?? ""));

  const token = String(loginRes.token);
  console.log("[smoke] authed wallet", wallet);

  const bal = await j(`${base}/api/credits/balance`, { headers: { authorization: `Bearer ${token}` } });
  console.log("[smoke] balance", bal.sessionsBalance);

  const join = await j(`${base}/api/sessions/${s.id}/join`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      "Idempotency-Key": `smoke-${Date.now()}`
    },
    body: JSON.stringify({ playerId: "00000000-0000-0000-0000-000000000000" })
  });
  console.log("[smoke] join", join.join);

  const lb = await j(`${base}/api/leaderboard/all`, { headers: { authorization: `Bearer ${token}` } });
  console.log("[smoke] leaderboard ok", Array.isArray(lb.rows) ? lb.rows.length : 0);
}

async function j(url, opts){
  const res = await fetch(url, opts);
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}

function safeJson(t){
  try { return JSON.parse(t); } catch { return t; }
}

main().catch(e=>{ console.error("[smoke] FAIL", e.message); process.exitCode=1; });
