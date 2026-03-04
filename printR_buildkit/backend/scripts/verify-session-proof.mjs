import crypto from "node:crypto";

const sessionId = process.argv[2];
const proofUrl = process.argv[3];

if (!sessionId || !proofUrl) {
  console.error("Usage: node scripts/verify-session-proof.mjs <sessionId> <proofUrl>");
  process.exit(1);
}

const res = await fetch(proofUrl);
const j = await res.json();
if (!j.ok) throw new Error(JSON.stringify(j));

if (j.status !== "REVEALED") {
  console.error("Not revealed yet. status=", j.status);
  process.exit(2);
}

const commitment = j.commitment;
const serverSecretHex = j.reveal?.serverSecretHex;
const vrfOutputHex = j.vrf?.outputHex;

if (!commitment || !serverSecretHex || !vrfOutputHex) {
  throw new Error("Missing commitment/serverSecretHex/vrfOutputHex");
}

const serverSecret = Buffer.from(serverSecretHex.replace(/^0x/, ""), "hex");
const vrfOutput = Buffer.from(vrfOutputHex.replace(/^0x/, ""), "hex");

function sha256Hex(...parts) {
  const h = crypto.createHash("sha256");
  for (const p of parts) {
    h.update(String(p));
    h.update("|");
  }
  return h.digest("hex");
}

function sha256Bytes(...parts) {
  const h = crypto.createHash("sha256");
  for (const p of parts) {
    if (Buffer.isBuffer(p) || p instanceof Uint8Array) h.update(Buffer.from(p));
    else h.update(String(p));
    h.update("|");
  }
  return h.digest();
}

const recomputedCommit = sha256Hex("PRINTR_COMMIT_V1", sessionId, serverSecret.toString("hex"));
if (recomputedCommit !== commitment) {
  console.error("COMMITMENT MISMATCH");
  console.error(" expected:", commitment);
  console.error(" got     :", recomputedCommit);
  process.exit(3);
}

const seed = sha256Bytes("PRINTR_SEED_V1", sessionId, serverSecret, vrfOutput);

function tickZ(tickIndex) {
  const tickBytes = sha256Bytes("PRINTR_TICK_V1", sessionId, seed, String(tickIndex));
  // map first 8 bytes to u64 / 2^64, then to [-1,1]
  let u64 = 0n;
  for (let i = 0; i < 8; i++) u64 = (u64 << 8n) + BigInt(tickBytes[i]);
  const u = Number(u64) / 18446744073709551616;
  return u * 2 - 1;
}

console.log("OK commitment verified");
console.log("Example z values:");
for (const t of [0, 1, 2, 10, 42]) {
  console.log(" t", t, "z", tickZ(t));
}

console.log("Switchboard refs:");
console.log(" randomnessAccount:", j.vrf?.randomnessAccount);
console.log(" commitTxSig      :", j.vrf?.commitTxSig);
console.log(" revealTxSig      :", j.vrf?.revealTxSig);
console.log(" explorerTxUrl    :", j.vrf?.explorerTxUrl);
