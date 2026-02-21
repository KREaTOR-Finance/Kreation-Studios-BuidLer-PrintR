import { randomUUID } from "node:crypto";
/**
 * In-memory store for MVP/dev. Replace with DB implementation.
 * NOTE: For production, implement this with Postgres/SQLite and proper transactions.
 */
export class InMemoryCreditsStore {
    balances = new Map();
    ledger = [];
    consumeIdem = new Set(); // playerRef|sessionId|idemKey
    webhookEvents = new Set(); // provider|eventId
    recordWebhookEvent(provider, eventId) {
        const k = `${provider}|${eventId}`;
        if (this.webhookEvents.has(k))
            return false;
        this.webhookEvents.add(k);
        return true;
    }
    async getBalance(playerRef) {
        return this.balances.get(playerRef) ?? 0;
    }
    async addLedger(entry) {
        const cur = await this.getBalance(entry.playerRef);
        const next = cur + entry.deltaSessions;
        if (next < 0)
            throw new Error("INSUFFICIENT_SESSIONS");
        const full = { ...entry, id: randomUUID(), createdAt: Date.now() };
        this.ledger.push(full);
        this.balances.set(entry.playerRef, next);
        return full;
    }
    async listLedger(playerRef, limit = 100) {
        return this.ledger.filter(x => x.playerRef === playerRef).slice(-limit).reverse();
    }
    async consumeOneSession(playerRef, sessionId, idempotencyKey = "") {
        const key = `${playerRef}|${sessionId}|${idempotencyKey}`;
        if (idempotencyKey && this.consumeIdem.has(key)) {
            return { ok: false, reason: "DUPLICATE" };
        }
        const bal = await this.getBalance(playerRef);
        if (bal < 1)
            return { ok: false, reason: "INSUFFICIENT" };
        if (idempotencyKey)
            this.consumeIdem.add(key);
        await this.addLedger({
            playerRef,
            deltaSessions: -1,
            reason: "consume",
            source: "system",
            externalRef: sessionId,
            idempotencyKey,
            meta: { idempotencyKey }
        });
        return { ok: true, balance: await this.getBalance(playerRef) };
    }
}
