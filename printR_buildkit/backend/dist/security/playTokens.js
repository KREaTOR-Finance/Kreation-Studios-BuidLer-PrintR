import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
const tokens = new Map();
export function issuePlayToken(playerRef, sessionId, ttlMs = 60 * 60 * 1000) {
    const token = randomBytes(24).toString("hex");
    const expiresAt = Date.now() + ttlMs;
    tokens.set(token, { token, playerRef, sessionId: sessionId ?? null, expiresAt, nonces: new Set() });
    return { token, expiresAt };
}
export function verifyPlayToken(token, playerRef, sessionId) {
    const entry = tokens.get(token);
    if (!entry)
        return null;
    if (entry.playerRef !== playerRef)
        return null;
    if (sessionId && entry.sessionId && entry.sessionId !== sessionId)
        return null;
    if (Date.now() > entry.expiresAt) {
        tokens.delete(token);
        return null;
    }
    return entry;
}
export function markNonceUsed(entry, nonce) {
    if (entry.nonces.has(nonce))
        return false;
    entry.nonces.add(nonce);
    return true;
}
export function buildRoundSignaturePayload(args) {
    return `${args.playerRef}:${args.sessionId ?? ""}:${args.roundId}:${args.nonce}:${args.tier}:${args.direction}`;
}
export function verifyRoundSignature(token, payload, signature) {
    const expected = createHmac("sha256", token).update(payload).digest("hex");
    if (expected.length !== signature.length)
        return false;
    try {
        return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    }
    catch {
        return false;
    }
}
