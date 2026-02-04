import { createHmac, randomBytes } from "node:crypto";

const args = process.argv.slice(2);

function argValue(flag, fallback) {
  const idx = args.indexOf(flag);
  if (idx === -1) return fallback;
  const next = args[idx + 1];
  return next && !next.startsWith("--") ? next : fallback;
}

const base = argValue("--base", process.env.API_BASE || "http://localhost:3001");
const playerRef = argValue("--player", process.env.PLAYER_REF || "tg:demo");
const tier = argValue("--tier", process.env.ROUND_TIER || "SAFE");
const direction = argValue("--direction", process.env.ROUND_DIRECTION || "UP");

async function main() {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available. Use Node 18+.");
  }

  console.log(`[smoke] base=${base} player=${playerRef}`);

  const sessions = await requestJson(`${base}/sessions`, {
    method: "GET"
  });

  if (!Array.isArray(sessions) || sessions.length === 0) {
    throw new Error("No sessions available from /sessions");
  }

  const session =
    sessions.find((s) => s.phase === "LIVE") ||
    sessions.find((s) => s.phase !== "ENDED") ||
    sessions[0];

  console.log(`[smoke] session=${session.id} phase=${session.phase}`);

  const joinRes = await requestJson(`${base}/api/sessions/${session.id}/join`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-printr-player": playerRef,
      "Idempotency-Key": randomBytes(12).toString("hex")
    },
    body: JSON.stringify({ mode: "play" })
  }, true);

  if (!joinRes.ok) {
    if (joinRes.status === 402) {
      console.error("[smoke] join failed: insufficient sessions. Seed credits or run Stripe test checkout.");
      process.exitCode = 1;
      return;
    }
    console.error(`[smoke] join failed: HTTP ${joinRes.status}`);
    process.exitCode = 1;
    return;
  }

  const joinJson = joinRes.data || {};
  if (joinJson.join !== "play" || !joinJson.playToken) {
    console.error("[smoke] join did not return play token. Try a LIVE session.");
    process.exitCode = 1;
    return;
  }

  const roundId = randomBytes(16).toString("hex");
  const nonce = randomBytes(10).toString("hex");
  const sessionId = String(joinJson.sessionId || session.id);
  const payload = buildPayload({ playerRef, sessionId, roundId, nonce, tier, direction });
  const signature = sign(payload, joinJson.playToken);

  const roundRes = await requestJson(`${base}/api/rounds/request`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-printr-player": playerRef,
      "x-printr-play-token": joinJson.playToken
    },
    body: JSON.stringify({
      roundId,
      sessionId,
      tier,
      direction,
      nonce,
      signature
    })
  }, true);

  if (!roundRes.ok) {
    console.error(`[smoke] round request failed: HTTP ${roundRes.status}`);
    console.error(roundRes.data);
    process.exitCode = 1;
    return;
  }

  console.log("[smoke] round ok", {
    roundId: roundRes.data?.round?.roundId,
    status: roundRes.data?.round?.status,
    pointsDelta: roundRes.data?.round?.pointsDelta
  });
}

function buildPayload({ playerRef, sessionId, roundId, nonce, tier, direction }) {
  return `${playerRef}:${sessionId ?? ""}:${roundId}:${nonce}:${tier}:${direction}`;
}

function sign(payload, token) {
  return createHmac("sha256", token).update(payload).digest("hex");
}

async function requestJson(url, options, includeStatus = false) {
  const res = await fetch(url, options);
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (includeStatus) return { ok: res.ok, status: res.status, data };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return data;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

main().catch((err) => {
  console.error(`[smoke] error: ${err.message}`);
  process.exitCode = 1;
});
